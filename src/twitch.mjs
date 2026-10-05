import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from './arena.mjs';
import { CHAT_SCOPE, createTwitchApi } from './twitch-api.mjs';

const socketUrl = 'wss://eventsub.wss.twitch.tv/ws';
const numeric = value => typeof value === 'string' && /^[0-9]{1,30}$/.test(value);
function checkConfig(value) {
  if (!value || Object.keys(value).some(k => !['clientId','channel','instanceId'].includes(k)) ||
      typeof value.clientId !== 'string' || !/^[a-zA-Z0-9]{10,100}$/.test(value.clientId) ||
      typeof value.channel !== 'string' || !/^[a-z0-9_]{1,25}$/.test(value.channel) ||
      typeof value.instanceId !== 'string' || !/^[a-f0-9-]{36}$/.test(value.instanceId)) throw new AppError('Enter a public Twitch Client ID, channel login and saved Arena target.');
  return { ...value };
}
export async function openTwitch(directory, { queue, store, api = createTwitchApi(), socket = url => new WebSocket(url), now = Date.now } = {}) {
  await mkdir(directory, { recursive:true, mode:0o700 });
  const file = join(directory, 'twitch.json');
  let config = null;
  try { config = checkConfig(JSON.parse(await readFile(file, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot read Twitch configuration; preserve and repair twitch.json.', {cause:error}); }
  let auth = null, device = null, generation = 0, state = 'disconnected', message = 'Configure Twitch to receive chat prompts.';
  const cleanup = new Map();
  let sockets = new Set(), timers = new Set(), subscription = null, channelId = null, backlog = 0;
  let commands = Promise.resolve(), incoming = Promise.resolve();
  const counts = { queued:0, rejected:0 };
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); id.unref?.(); timers.add(id); return id; }
  function halt(reason, forget = false) {
    generation++; for (const timer of timers) clearTimeout(timer); timers.clear();
    for (const ws of sockets) { try { ws.close(); } catch {} } sockets.clear(); cleanup.clear();
    subscription = null; channelId = null; device = null;
    if (forget) auth = null;
    state = auth ? 'authorized' : 'disconnected'; message = reason;
  }
  function status() { return { config, state, message, identity:auth ? {id:auth.userId,login:auth.login} : null,
    authorization:device ? {userCode:device.userCode,verificationUrl:device.url,expiresAt:device.expiresAt} : null, counts:{...counts} }; }
  async function validate(accessToken, expectedUser) {
    const value = await api.validate(accessToken);
    if (value.client_id !== config.clientId || !numeric(value.user_id) || (expectedUser && value.user_id !== expectedUser) || (!Array.isArray(value.scopes) || !value.scopes.includes(CHAT_SCOPE)) || !(value.expires_in > 0)) throw new AppError('Twitch authorization does not match this application or required chat access.', 401);
    return { accessToken, userId:value.user_id, login:value.login, expiresAt:now() + value.expires_in * 1000 };
  }
  function checkToken(gen) {
    later(async () => {
      try { const next = await validate(auth.accessToken, auth.userId); if (gen !== generation) return; auth = next; checkToken(gen); }
      catch { if (gen === generation) halt('Twitch authorization expired or could not be validated. Authorize again.', true); }
    }, Math.max(1000, Math.min(3600000, auth.expiresAt - now())));
  }
  function connect(url, gen, handoff = false) {
    const ws = socket(url); sockets.add(ws);
    let welcomed = false, watchdog;
    function heartbeat(seconds = 10) {
      clearTimeout(watchdog); timers.delete(watchdog);
      watchdog = later(() => { if (gen === generation) halt('Twitch connection timed out. Start listening to reconnect.'); }, (seconds + 2) * 1000);
    }
    heartbeat();
    cleanup.set(ws, () => { clearTimeout(watchdog); timers.delete(watchdog); });
    ws.addEventListener('close', () => { if (gen === generation && sockets.has(ws)) halt('Twitch connection closed. Start listening to reconnect.'); });
    ws.addEventListener('error', () => { if (gen === generation && sockets.has(ws)) halt('Twitch connection failed. Start listening to reconnect.'); });
    let keepalive = 10;
    ws.addEventListener('message', event => {
      if (gen !== generation || !sockets.has(ws)) return;
      if (typeof event.data !== 'string' || Buffer.byteLength(event.data) > 262144 || backlog >= 100) { halt('Twitch input limit reached. Start listening to reconnect.'); return; }
      backlog++;
      incoming = incoming.then(async () => {
        if (gen !== generation || !sockets.has(ws)) return;
        const packet = JSON.parse(event.data), { metadata:m, payload:p } = packet;
        if (!m || !p) throw Error();
        if (m.message_type === 'session_welcome') {
          if (welcomed || !p.session?.id) throw Error();
          welcomed = true; keepalive = p.session.keepalive_timeout_seconds ?? 10;
          if (!Number.isFinite(keepalive) || keepalive < 10 || keepalive > 600) throw Error();
          heartbeat(keepalive);
          if (handoff) {
            for (const old of sockets) if (old !== ws) { sockets.delete(old); cleanup.get(old)?.(); cleanup.delete(old); old.close(); }
          } else {
            const response = await api.subscribe(config.clientId, auth.accessToken, { broadcaster_user_id:channelId, user_id:auth.userId }, p.session.id);
            if (gen !== generation) return;
            const sub = response.data?.[0];
            if (!sub?.id || sub.status !== 'enabled') throw Error();
            subscription = sub.id;
          }
          state = 'listening'; message = `Listening to ${config.channel}. New prompts require review.`; return;
        }
        if (!welcomed) throw Error();
        if (m.message_type === 'session_keepalive') { heartbeat(keepalive); return; }
        if (m.message_type === 'session_reconnect') {
          const next = new URL(p.session?.reconnect_url);
          if (next.protocol !== 'wss:' || next.hostname !== 'eventsub.wss.twitch.tv' || next.port || next.username || next.password || sockets.size !== 1) throw Error();
          // The old connection stays live until the new welcome. Subscriptions transfer.
          clearTimeout(watchdog); timers.delete(watchdog);
          connect(next.href, gen, true); return;
        }
        if (m.message_type === 'revocation') { halt('Twitch revoked the subscription. Authorize again.', true); return; }
        if (m.message_type !== 'notification') return;
        heartbeat(keepalive);
        const sub = p.subscription, e = p.event;
        if (sub?.id !== subscription || sub.type !== 'channel.chat.message' || sub.version !== '1' || sub.condition?.broadcaster_user_id !== channelId || sub.condition?.user_id !== auth.userId || m.subscription_type !== sub.type || m.subscription_version !== '1') return;
        const timestamp = Date.parse(m.message_timestamp);
        if (!Number.isFinite(timestamp) || Math.abs(now() - timestamp) > 600000 || e?.broadcaster_user_id !== channelId || !numeric(e.chatter_user_id) || typeof e.chatter_user_login !== 'string' || typeof e.message?.text !== 'string' || (e.source_broadcaster_user_id && e.source_broadcaster_user_id !== channelId)) return;
        store.get(config.instanceId);
        const result = await queue.ingestTwitch(config.instanceId, { channelId, messageId:e.message_id, userId:e.chatter_user_id, login:e.chatter_user_login, text:e.message.text });
        if (result.outcome === 'queued') counts.queued++; else if (result.outcome !== 'ignored') counts.rejected++;
      }).catch(() => { if (gen === generation) halt('Twitch intake failed. Check configuration and start listening again.'); }).finally(() => { backlog--; });
    });
  }
  async function run(operation, input) {
    if (operation === 'configure') {
      const next = checkConfig(input); store.get(next.instanceId);
      halt('Configuration saved. Authorize Twitch to continue.', true);
      await writeFile(`${file}.tmp`, `${JSON.stringify(next, null, 2)}\n`, {mode:0o600}); await rename(`${file}.tmp`, file); config = next;
    } else if (operation === 'disconnect') halt('Disconnected. Tokens forgotten on this device.', true);
    else if (operation === 'stop') halt('Listening stopped. Queued requests remain available.');
    else {
      if (!config) throw new AppError('Save Twitch configuration first.');
      if (operation === 'authorize') {
        halt('Waiting for Twitch authorization.', true);
        const d = await api.device(config.clientId);
        const url = new URL(d.verification_uri);
        if (url.origin !== 'https://www.twitch.tv' || url.pathname !== '/activate' || !d.device_code || !d.user_code || !(d.expires_in > 0) || !(d.interval > 0)) throw new AppError('Twitch returned invalid authorization instructions.',502);
        device = { code:d.device_code,userCode:d.user_code,url:url.href,expiresAt:now()+d.expires_in*1000,interval:Math.max(5000,d.interval*1000),nextPoll:now()+Math.max(5000,d.interval*1000) }; state = 'authorizing';
      } else if (operation === 'poll') {
        if (!device) return status();
        if (now() >= device.expiresAt) { halt('Authorization expired. Start authorization again.', true); return status(); }
        if (now() < device.nextPoll) return status();
        device.nextPoll = now() + device.interval;
        try { const result = await api.exchange(config.clientId,device.code); auth = await validate(result.access_token); device = null; state = 'authorized'; message = 'Twitch authorized. Start listening when ready.'; }
        catch (error) { if (error.providerCode === 'slow_down') { device.interval += 5000; device.nextPoll = now() + device.interval; }
          else if (error.providerCode !== 'authorization_pending') { halt('Twitch authorization failed. Authorize again.', true); throw new AppError('Twitch authorization failed. Authorize again.',401); } }
      } else if (operation === 'start') {
        if (!auth) throw new AppError('Authorize Twitch first.');
        halt('Connecting to Twitch…'); store.get(config.instanceId);
        try {
          auth = await validate(auth.accessToken, auth.userId);
          const found = (await api.user(config.clientId,auth.accessToken,config.channel)).data?.[0];
          if (!numeric(found?.id) || found.login !== config.channel) throw new AppError('Twitch channel not found.');
          channelId = found.id; state = 'connecting'; checkToken(generation); connect(socketUrl,generation);
        } catch (error) { halt('Unable to start Twitch. Check settings and authorize again.', true); throw error; }
      } else throw new AppError('Unknown Twitch operation.');
    }
    return status();
  }
  return { status, close:() => halt('Service stopped.',true), usesTarget:id => config?.instanceId === id && ['connecting','listening'].includes(state),
    command(operation,input) { const job = commands.then(() => run(operation,input)); commands = job.catch(() => {}); return job; } };
}
