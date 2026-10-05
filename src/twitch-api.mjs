import { AppError } from './arena.mjs';
export const CHAT_SCOPE = 'user:read:chat';
export function createTwitchApi(fetcher = fetch) {
  async function request(url, options = {}) {
    let response;
    try { response = await fetcher(url, { ...options, redirect:'error', signal:AbortSignal.timeout(8000) }); }
    catch { throw new AppError('Twitch connection failed. Check connectivity and retry.', 502); }
    let data;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; if (size > 262144) throw Error(); chunks.push(chunk); }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw new AppError('Twitch returned an invalid response.', 502); }
    if (!response.ok) {
      const known = ['authorization_pending','slow_down','access_denied','expired_token','invalid device code'];
      const code = known.includes(data.message) ? data.message : known.includes(data.error) ? data.error : null;
      throw Object.assign(new AppError(code ?? `Twitch request failed (HTTP ${response.status}).`, response.status === 401 ? 401 : 502), { providerCode:code, providerStatus:response.status });
    }
    return data;
  }
  const form = (path, data) => request(`https://id.twitch.tv/oauth2/${path}`, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)});
  const headers = (clientId, accessToken) => ({'Client-Id':clientId,Authorization:`Bearer ${accessToken}`});
  return {
    device: clientId => form('device',{client_id:clientId,scopes:CHAT_SCOPE}),
    exchange: (clientId, deviceCode) => form('token',{client_id:clientId,device_code:deviceCode,scopes:CHAT_SCOPE,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}),
    validate: accessToken => request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${accessToken}`}}),
    user: (clientId, accessToken, login) => request(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,{headers:headers(clientId,accessToken)}),
    subscribe: (clientId, accessToken, condition, sessionId) => request('https://api.twitch.tv/helix/eventsub/subscriptions',{method:'POST',headers:{...headers(clientId,accessToken),'Content-Type':'application/json'},body:JSON.stringify({type:'channel.chat.message',version:'1',condition,transport:{method:'websocket',session_id:sessionId}})}),
  };
}
