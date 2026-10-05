import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openTwitch } from '../src/twitch.mjs';
import { openQueue, LOCAL_OPERATOR } from '../src/queue-store.mjs';
import { createTwitchApi } from '../src/twitch-api.mjs';
const target = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const config = {clientId:'publicclient123',channel:'artist',instanceId:target};
class Socket extends EventTarget {
  closed = false;
  sendPacket(packet) { this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(packet)})); }
  close() { this.closed = true; this.dispatchEvent(new Event('close')); }
}
const flush = () => new Promise(resolve => setTimeout(resolve,15));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(),'rezzo-twitch-')); t.after(() => rm(dir,{recursive:true,force:true}));
  let time = 1800000000000; const sockets = []; let subscriptions = 0;
  const api = {
    device:async () => ({device_code:'private-device',user_code:'PUBLIC',verification_uri:'https://www.twitch.tv/activate',expires_in:1800,interval:5}),
    exchange:async () => ({access_token:'private-access',refresh_token:'private-refresh'}),
    validate:async () => ({client_id:config.clientId,user_id:'123',login:'operator',scopes:['user:read:chat'],expires_in:14400}),
    user:async () => ({data:[{id:'456',login:'artist'}]}),
    subscribe:async () => { subscriptions++; return {data:[{id:'sub',status:'enabled'}]}; },
  };
  const queue = await openQueue(dir,{now:() => time});
  const twitch = await openTwitch(dir,{queue,store:{get:id => assert.equal(id,target)},api,now:() => time,socket:url => { const ws = new Socket(); ws.url = url; sockets.push(ws); return ws; }});
  t.after(() => twitch.close());
  const welcome = ws => ws.sendPacket({metadata:{message_type:'session_welcome'},payload:{session:{id:'session',keepalive_timeout_seconds:10}}});
  const event = (id = 'chat-1', overrides = {}) => ({metadata:{message_type:'notification',subscription_type:'channel.chat.message',subscription_version:'1',message_timestamp:new Date(time).toISOString()},payload:{subscription:{id:'sub',type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:'456',user_id:'123'}},event:{broadcaster_user_id:'456',chatter_user_id:'789',chatter_user_login:'viewer',message_id:id,message:{text:'!rezz "Purple lines"'},...overrides}}});
  async function authorize() { await twitch.command('configure',config); await twitch.command('authorize'); time += 5000; await twitch.command('poll'); }
  async function start() { await authorize(); await twitch.command('start'); welcome(sockets[0]); await flush(); }
  return {dir,api,queue,twitch,sockets,welcome,event,authorize,start,advance:ms => {time+=ms;},subscriptions:() => subscriptions};
}
test('Twitch device authorization persists only public config, honors polling and fails closed on wrong scope',async t => {
  const f = await fixture(t); await f.twitch.command('configure',config); await f.twitch.command('authorize');
  let calls = 0; f.api.exchange = async () => { calls++; throw Object.assign(Error(),{providerCode:'authorization_pending'}); };
  await f.twitch.command('poll'); assert.equal(calls,0);
  f.advance(5000); await f.twitch.command('poll'); assert.equal(f.twitch.status().state,'authorizing');
  f.api.exchange = async () => ({access_token:'private-access'});
  f.api.validate = async () => ({client_id:config.clientId,user_id:'123',scopes:[],expires_in:100});
  f.advance(5000); await assert.rejects(f.twitch.command('poll'),/authorization failed/);
  assert.equal(f.twitch.status().identity,null);
  assert.doesNotMatch(JSON.stringify(f.twitch.status()),/private-/);
  assert.deepEqual(JSON.parse(await readFile(join(f.dir,'twitch.json'),'utf8')),config);
});
test('verified chat enters held queue, excludes shared chat and wrong subscriptions, deduplicates on restart',async t => {
  const f = await fixture(t); await f.start(); assert.equal(f.twitch.status().state,'listening');
  const ws = f.sockets[0]; ws.sendPacket(f.event()); ws.sendPacket(f.event());
  ws.sendPacket(f.event('shared',{source_broadcaster_user_id:'999'}));
  const bad = f.event('wrong'); bad.payload.subscription.id='other'; ws.sendPacket(bad);
  await flush(); const requests = f.queue.snapshot(target).requests; assert.equal(requests.length,1);
  assert.equal(requests[0].userId,'twitch:789'); assert.equal(requests[0].approved,false); assert.equal(requests[0].baseScore,0);
  assert.equal(f.queue.snapshot(target).ranked.length,0);
  const reopened = await openQueue(f.dir);
  const result = await reopened.ingestTwitch('other-target',{channelId:'456',userId:'789',login:'viewer',messageId:'chat-1',text:'!rezz "Purple lines"'});
  assert.equal(result.requestId,requests[0].id); assert.equal(reopened.snapshot('other-target').requests.length,0);
  await f.twitch.command('disconnect'); ws.sendPacket(f.event('after-stop')); await flush(); assert.equal(f.queue.snapshot(target).requests.length,1);
});
test('Twitch handoff transfers subscriptions; sudden loss stops intake; hostile reconnect URL rejected',async t => {
  const f = await fixture(t); await f.start(); const first = f.sockets[0];
  first.sendPacket({metadata:{message_type:'session_reconnect'},payload:{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=test'}}});
  await flush(); assert.equal(first.closed,false); f.welcome(f.sockets[1]); await flush();
  assert.equal(first.closed,true); assert.equal(f.subscriptions(),1); assert.equal(f.twitch.status().state,'listening');
  f.sockets[1].close(); assert.equal(f.twitch.status().state,'authorized');
  await f.twitch.command('start'); f.welcome(f.sockets[2]); await flush(); assert.equal(f.subscriptions(),2);
  f.sockets[2].sendPacket({metadata:{message_type:'session_reconnect'},payload:{session:{reconnect_url:'wss://attacker.example/ws'}}});
  await flush(); assert.equal(f.sockets.length,3); assert.equal(f.twitch.status().state,'authorized');
});
test('revocation forgets authorization and pending device grant expires',async t => {
  const f = await fixture(t); await f.start();
  f.sockets[0].sendPacket({metadata:{message_type:'revocation'},payload:{subscription:{id:'sub'}}}); await flush();
  assert.equal(f.twitch.status().identity,null); await assert.rejects(f.twitch.command('start'),/Authorize Twitch first/);
  await f.twitch.command('authorize'); f.advance(1800001); await f.twitch.command('poll'); assert.equal(f.twitch.status().authorization,null);
});
test('external intake limits, operator boundary and privileges cannot be supplied through chat',async t => {
  const f = await fixture(t);
  const event = n => ({channelId:'456',userId:'789',login:'viewer',messageId:`chat-${n}`,text:'!rezz admin=true approved=true'});
  assert.equal((await f.queue.ingestTwitch(target,event(0))).outcome,'queued');
  assert.equal((await f.queue.ingestTwitch(target,event(1))).outcome,'cooldown');
  for (let n=2;n<6;n++) { f.advance(10000); assert.equal((await f.queue.ingestTwitch(target,event(n))).outcome,'queued'); }
  f.advance(10000); assert.equal((await f.queue.ingestTwitch(target,event(6))).outcome,'user_queue_limit');
  assert.throws(() => f.queue.command(target,{operation:'enqueue',eventId:'forge',prompt:'fake',priority:'admin'},{id:'twitch:789',role:'viewer'}),/operator/);
  assert.throws(() => f.queue.ingestTwitch(target,{...event(7),approved:true}),/Unexpected/);
  const request = f.queue.snapshot(target).requests[0]; assert.equal(request.admin,false); assert.equal(request.protected,false);
  await f.queue.command(target,{operation:'remove',eventId:'remove',requestId:request.id},LOCAL_OPERATOR);
  assert.equal((await f.queue.ingestTwitch(target,event(8))).outcome,'queued');
});
test('Twitch HTTP adapter bounds responses, decodes split Unicode and hides provider secrets',async () => {
  const encoded = Buffer.from(JSON.stringify({login:'café'})); const at = encoded.indexOf(0xc3)+1;
  const api = createTwitchApi(async (url,options) => { assert.equal(options.redirect,'error'); return new Response(new ReadableStream({start(c){c.enqueue(encoded.subarray(0,at));c.enqueue(encoded.subarray(at));c.close();}})); });
  assert.equal((await api.validate('secret')).login,'café');
  await assert.rejects(createTwitchApi(async () => new Response(JSON.stringify({message:'secret-token'}),{status:401})).validate('secret'),error => !error.message.includes('secret'));
  await assert.rejects(createTwitchApi(async () => new Response('a'.repeat(262145))).validate('secret'),/invalid response/);
});
