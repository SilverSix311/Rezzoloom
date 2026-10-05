import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openQueue, LOCAL_OPERATOR } from '../src/queue-store.mjs';
import { openPlayback } from '../src/playback.mjs';
import { compositionKey } from '../src/studio.mjs';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'rezzo-playback-')); t.after(() => rm(dir,{recursive:true,force:true}));
  let time = 1000; let sequence = 0; const writes = []; const busy = new Set();
  const clip = {id:3, connected:{value:'Disconnected'},video:{description:'Lines',effects:[{id:4,name:'Blur'}]},target:{value:'Own Layer'},triggerstyle:{value:'Normal'},beatsnap:{value:'None'},transition:{layer_determined:{value:true}},faderstart:{value:'Layer Determined'}};
  const c = {name:{id:1,value:'Test'},layers:[{id:2,clips:[clip,{id:5,connected:{value:'Disconnected'}}],transition:{duration:{value:0}},faderstart:{value:false},autopilot:{target:{value:'Off'}}}]};
  const instance = {id:'A',endpoint:'http://localhost:8080'};
  const recipe = {id:'recipe',status:'applied',instance,slot:{id:3,layerId:2},compositionKey:compositionKey(c),after:structuredClone(c)};
  const queue = await openQueue(dir,{now:()=>time,resolveRecipe:()=>recipe});
  const command = input => queue.command('A',{eventId:`event${++sequence}`,...input},LOCAL_OPERATOR);
  async function enqueue(priority='standard') { const {requestId} = await command({operation:'enqueue',prompt:'Test',priority}); await command({operation:'attach',requestId,recipeId:recipe.id,durationSeconds:2}); await command({operation:'approve',requestId}); return requestId; }
  let fail = false;
  const options = {queue,store:{get:()=>instance},studio:{get:()=>recipe},busy,now:()=>time,automatic:false,inspect:async()=>({composition:structuredClone(c)}),write:async(endpoint,path)=>{ writes.push(path); clip.connected.value = path.endsWith('/connect')?'Connected':'Disconnected'; if(fail) throw new Error('Simulated lost acknowledgement'); }};
  const controller = await openPlayback(options); t.after(()=>controller.close());
  return {dir,queue,command,enqueue,controller,options,clip,c,writes,busy,recipe,advance:ms=>{time+=ms;},fail:value=>{fail=value;}};
}
test('playback reserves one request, never interrupts, honors duration and scheduler pause', async t => {
  const f = await fixture(t); const first = await f.enqueue();
  await f.controller.command('A','resume'); assert.equal(f.clip.connected.value,'Connected');
  const admin = await f.enqueue('admin'); await f.controller.tick(); assert.equal(f.writes.length,1);
  assert.equal(f.queue.snapshot('A').playback.active.requestId,first);
  await f.controller.command('A','pause'); f.advance(2000); await f.controller.tick();
  assert.equal(f.clip.connected.value,'Disconnected'); assert.equal(f.queue.snapshot('A').playback.active,null);
  assert.equal(f.queue.snapshot('A').requests.find(x=>x.id===admin).status,'pending');
  await f.controller.command('A','resume'); assert.equal(f.queue.snapshot('A').playback.active.requestId,admin);
  await f.controller.command('A','stop'); assert.equal(f.queue.snapshot('A').playback.paused,true);
  assert.deepEqual(f.writes,['/composition/clips/by-id/3/connect','/composition/layers/by-id/2/clear','/composition/clips/by-id/3/connect','/composition/layers/by-id/2/clear']);
});
test('duration expiry advances to next approved request when scheduler remains enabled', async t => {
  const f=await fixture(t); await f.enqueue(); const second=await f.enqueue();
  await f.controller.command('A','resume'); f.advance(2000); await f.controller.tick();
  assert.equal(f.queue.snapshot('A').playback.active.requestId,second); assert.equal(f.writes.length,3);
});
test('restart disarms scheduler and requires read-only reconciliation or owned stop', async t => {
  const f=await fixture(t); await f.enqueue(); await f.controller.command('A','resume'); f.controller.close();
  const queue=await openQueue(f.dir,{resolveRecipe:()=>f.recipe});
  const restarted=await openPlayback({...f.options,queue}); t.after(()=>restarted.close());
  assert.equal(queue.snapshot('A').playback.active.phase,'uncertain'); assert.equal(queue.snapshot('A').playback.paused,true);
  f.advance(10000); await restarted.tick(); assert.equal(f.writes.length,1);
  await assert.rejects(restarted.command('A','resume'),/Reconcile/);
  await restarted.command('A','reconcile'); assert.equal(f.writes.length,1);
  await restarted.command('A','stop'); assert.equal(f.writes.length,2); assert.equal(queue.snapshot('A').playback.active,null);
});
test('lost write acknowledgement never retries activation and stop recovery is explicit', async t => {
  const f=await fixture(t); await f.enqueue(); f.fail(true);
  await assert.rejects(f.controller.command('A','resume'),/lost acknowledgement/);
  assert.equal(f.queue.snapshot('A').playback.active.phase,'uncertain');
  await f.controller.tick(); assert.equal(f.writes.length,1); f.fail(false);
  await f.controller.command('A','stop'); assert.equal(f.writes.length,2);
});
test('manual layer takeover is preserved and halts advancement', async t => {
  const f=await fixture(t); await f.enqueue(); await f.enqueue(); await f.controller.command('A','resume');
  f.clip.connected.value='Disconnected'; f.c.layers[0].clips[1].connected.value='Connected'; f.advance(2000);
  await f.controller.tick(); assert.equal(f.writes.length,1); assert.equal(f.c.layers[0].clips[1].connected.value,'Connected');
  assert.equal(f.queue.snapshot('A').playback.paused,true); assert.equal(f.queue.snapshot('A').playback.active,null);
});
test('occupied layers, unsupported routing and shared target lock prevent writes', async t => {
  const f=await fixture(t); await f.enqueue(); f.c.layers[0].clips[1].connected.value='Connected';
  await assert.rejects(f.controller.command('A','resume'),/occupied/); assert.equal(f.writes.length,0);
  f.c.layers[0].clips[1].connected.value='Disconnected'; f.clip.target.value='Active Layer';
  await assert.rejects(f.controller.command('A','resume'),/Own Layer/); assert.equal(f.writes.length,0);
  f.clip.target.value='Own Layer'; f.busy.add('A'); await assert.rejects(f.controller.command('A','resume'),/busy/);
});
test('attachment invalidates approval and rejects target/status/duration mismatches', async t => {
  const f=await fixture(t); const id=await f.enqueue();
  await f.command({operation:'attach',requestId:id,recipeId:'recipe',durationSeconds:60});
  assert.equal(f.queue.snapshot('A').requests[0].approved,false);
  await assert.rejects(f.command({operation:'attach',requestId:id,recipeId:'recipe',durationSeconds:0}),/Duration/);
  f.recipe.status='uncertain'; await assert.rejects(f.command({operation:'attach',requestId:id,recipeId:'recipe'}),/successfully built/);
});
test('activation waits for delayed state readback without repeating the write', async t => {
  const f=await fixture(t); f.controller.close(); let reads=0; let writeSent=false;
  const controller=await openPlayback({...f.options, inspect:async()=>{ const c=structuredClone(f.c); if(writeSent && ++reads<3)c.layers[0].clips[0].connected.value='Disconnected'; return {composition:c}; }, write:async(...args)=>{await f.options.write(...args);writeSent=true;} }); t.after(()=>controller.close());
  await f.enqueue(); await controller.command('A','resume'); assert.equal(f.writes.length,1); assert.equal(f.queue.snapshot('A').playback.active.phase,'playing'); assert.equal(reads,3);
});

test('approval cannot bypass attachment and millisecond decimal durations are preserved', async t => {
  const f=await fixture(t); const {requestId}=await f.command({operation:'enqueue',prompt:'Decimal'});
  await assert.rejects(f.command({operation:'approve',requestId}),/Attach/);
  await f.command({operation:'attach',requestId,recipeId:'recipe',durationSeconds:1.001});
  assert.equal(f.queue.snapshot('A').requests[0].durationMs,1001);
  await assert.rejects(f.command({operation:'attach',requestId,recipeId:'recipe',durationSeconds:1.00001}),/Duration/);
});
test('offline inspection pauses before writes and reconnect requires an explicit resume', async t => {
  const f=await fixture(t); f.controller.close(); let offline=true;
  const controller=await openPlayback({...f.options,inspect:async()=>{if(offline)throw new Error('offline');return f.options.inspect();}});t.after(()=>controller.close());
  await f.enqueue();await assert.rejects(controller.command('A','resume'),/offline/);assert.equal(f.writes.length,0);
  offline=false;await controller.tick();assert.equal(f.writes.length,0);
  await controller.command('A','resume');assert.equal(f.writes.length,1);
});
