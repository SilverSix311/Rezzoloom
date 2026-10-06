import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openModels, MODEL_DEFAULTS, modelConfig, decisionQuestions, validateDecision, callDecision } from '../src/models.mjs';
import { openStudio } from '../src/studio.mjs';
const catalog = {compositionKey:'composition',compositionName:'Development',sources:[{id:'real-source',name:'Test source',description:'Lines'}],effects:[{id:'real-effect',name:'Test effect',description:'Softening'}],slots:[{id:1,label:'empty'}]};
const input = {prompt:'Soft purple lines',mode:'light'};
const instance = {id:'target',endpoint:'http://127.0.0.1:8080'};
const config = {...MODEL_DEFAULTS,provider:'laya'};
function result(questions) { return {model:'english',usage:{input_tokens:123,output_tokens:8},answers:Object.fromEntries(Object.entries(questions).map(([kind,q]) => [kind,{type:'choice',choice:`${kind}_0`,confidence:0.9,probabilities:Object.fromEntries(Object.keys(q.criteria).map(label=>[label,label===`${kind}_0` ? 0.95 : 0.05]))}]))}; }
async function fixture(t,options={}) { const dir = await mkdtemp(join(tmpdir(),'rezzo-model-')); t.after(()=>rm(dir,{recursive:true,force:true})); const calls=[]; const manager=await openModels(dir,{request:async request=>{calls.push(request);return result(request.body.questions);},...options}); return {dir,manager,calls}; }
test('model settings restrict destinations, require explicit cloud choice and never persist or expose keys',async t=>{
  assert.throws(()=>modelConfig({...config,layaEndpoint:'http://remote.example:8000'}),/HTTPS/);
  assert.throws(()=>modelConfig({...config,layaEndpoint:'https://user:password@example.com'}),/origin/);
  assert.throws(()=>modelConfig({...config,provider:'jev'}),/cloud/);
  const f=await fixture(t); await f.manager.configure({config,apiKey:'private-key'});
  assert.equal(f.manager.status().keyPresent,true); assert.doesNotMatch(JSON.stringify(f.manager.status()),/private-key/);
  assert.doesNotMatch(await readFile(join(f.dir,'models.json'),'utf8'),/private-key/);
  const reopened=await openModels(f.dir); assert.equal(reopened.status().keyPresent,false);
  await f.manager.configure({config:{...config,layaEndpoint:'https://another.example'}}); assert.equal(f.manager.status().keyPresent,false);
});
test('one bounded provider call maps only real catalog choices and persists decision provenance',async t=>{
  const f=await fixture(t); await f.manager.configure({config});
  const proposal=await f.manager.recommend(instance,catalog,input); assert.equal(f.calls.length,1);
  assert.equal(proposal.choices.source.selected.id,'real-source'); assert.equal(proposal.choices.effect.selected.id,'real-effect');
  assert.equal(f.calls[0].endpoint,'http://127.0.0.1:8000/v1/systemone'); assert.equal(f.calls[0].body.state,input.prompt);
  assert.doesNotMatch(JSON.stringify(f.calls[0].body),/127.0.0.1|compositionName|instanceId/);
  const manual={...input,sourceId:'real-source',effectIds:['real-effect'],clipId:1};
  const provenance=f.manager.provenance(proposal.id,instance,manual);
  const studio=await openStudio(f.dir,{discover:async()=>catalog});
  const recipe=await studio.plan(instance,manual,provenance); assert.equal(recipe.decision.decisionId,proposal.id); assert.equal(recipe.status,'planned');
  assert.throws(()=>f.manager.provenance(proposal.id,{...instance,id:'other'},manual),/differs/);
  assert.throws(()=>f.manager.provenance(proposal.id,instance,{...manual,prompt:'different'}),/differs/);
  catalog.sources[0].description='Changed'; await assert.rejects(studio.plan(instance,manual,provenance),/catalog changed/); catalog.sources[0].description='Lines';
  const archived=JSON.parse(await readFile(join(f.dir,'decisions',`${proposal.id}.json`),'utf8')); assert.equal(archived.status,'completed'); assert.equal(archived.questions.source.type,'choice');
});
test('unknown choices, inconsistent probabilities, truncation and low confidence never become usable selections',()=>{
  const {questions,mapping}=decisionQuestions(catalog);
  const valid=result(questions); const unknown=structuredClone(valid);unknown.answers.source.choice='fabricated';
  assert.throws(()=>validateDecision(unknown,questions,mapping,0.6),/invalid catalog choice/);
  const bad=structuredClone(valid);bad.answers.source.probabilities.none=0.9;
  assert.throws(()=>validateDecision(bad,questions,mapping,0.6),/inconsistent/);
  const cut=structuredClone(valid);cut.usage.options={source:{total:2,distinct:1}};
  assert.throws(()=>validateDecision(cut,questions,mapping,0.6),/collapsed/);
  valid.answers.source.confidence=0.2; const parsed=validateDecision(valid,questions,mapping,0.6); assert.equal(parsed.choices.source.selected,null);assert.equal(parsed.choices.source.reason,'low_confidence');
  valid.answers.effect.choice='none';valid.answers.effect.probabilities={none:0.95,effect_0:0.05};assert.equal(validateDecision(valid,questions,mapping,0.6).choices.effect.reason,'no_match');
});
test('budget reserves failures, survives restart, resets at UTC boundary and blocks concurrent work',async t=>{
  let now=Date.parse('2026-10-05T23:59:00Z'); let release;
  const f=await fixture(t,{now:()=>now,request:()=>new Promise(resolve=>{release=resolve;})});
  await f.manager.configure({config:{...config,dailyLimit:1}});
  const pending=f.manager.recommend(instance,catalog,input);
  await assert.rejects(f.manager.recommend(instance,catalog,input),/already running/);
  await assert.rejects(f.manager.configure({config}),/finish/);
  while(!release) await new Promise(resolve=>setImmediate(resolve));
  release({invalid:true});await assert.rejects(pending,/invalid decision/);
  const restarted=await openModels(f.dir,{now:()=>now,request:async({body})=>result(body.questions)});
  await assert.rejects(restarted.recommend(instance,catalog,input),/Daily model request limit/);
  now+=61000; assert.equal((await restarted.recommend(instance,catalog,input)).provider,'laya');
  const archived=await Promise.all((await readdir(join(f.dir,'decisions'))).map(async name=>JSON.parse(await readFile(join(f.dir,'decisions',name),'utf8'))));
  assert.equal(archived.filter(x=>x.status==='failed').length,1);
});
test('Jev requires a session key, has a pinned destination and suggestions expire',async t=>{
  let now=1000;const f=await fixture(t,{now:()=>now});
  const cloud={...config,provider:'jev',cloudEnabled:true};await f.manager.configure({config:cloud});
  await assert.rejects(f.manager.recommend(instance,catalog,input),/API key/);assert.equal(f.calls.length,0);
  await f.manager.configure({config:cloud,apiKey:'private-key'});const proposal=await f.manager.recommend(instance,catalog,input);
  assert.equal(f.calls[0].endpoint,'https://api.typesafe.ai/v1/systemone');assert.equal(f.calls[0].body.model,'jev-latest');assert.equal(f.calls[0].body.max_len,undefined);
  now+=600001;assert.throws(()=>f.manager.provenance(proposal.id,instance,{...input,sourceId:'real-source',effectIds:['real-effect']}),/expired/);
});
test('model HTTP adapter refuses redirects, masks upstream errors and bounds JSON',async()=>{
  const args={endpoint:'https://example.com/v1/systemone',key:'private-key',body:{state:'test'},timeoutSeconds:5};
  await assert.rejects(callDecision(args,async(url,options)=>{assert.equal(options.redirect,'error');return new Response('private-key leaked',{status:401});}),error=>!error.message.includes('private-key')&&error.status===502);
  await assert.rejects(callDecision(args,async()=>new Response('x'.repeat(262145))),/oversized/);
  await assert.rejects(callDecision(args,async()=>{throw new Error('private-key');}),/not automatically retried/);
});
