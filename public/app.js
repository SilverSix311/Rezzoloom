let token = '';
let instances = [];
const cards = document.querySelector('#cards');
const notice = document.querySelector('#notice');
const dialog = document.querySelector('#add-dialog');
function el(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Request failed.'); return value;
}
function openDialog() { document.querySelector('#form-error').textContent = ''; dialog.showModal(); }
document.querySelector('#add-button').onclick = openDialog;
document.querySelector('#close-dialog').onclick = () => dialog.close();
document.querySelector('#add-form').onsubmit = async event => {
  event.preventDefault(); const button = event.target.querySelector('[type=submit]'); button.disabled = true;
  try { const fields = Object.fromEntries(new FormData(event.target)); await api('/api/instances', 'POST', fields); dialog.close(); event.target.reset(); notice.textContent = 'Connection saved. Check it when you’re ready.'; await refresh(); }
  catch (error) { document.querySelector('#form-error').textContent = error.message; }
  finally { button.disabled = false; }
};
function action(label, run, cls) { const button = el('button', label, cls); button.onclick = async () => { button.disabled = true; notice.textContent = ''; try { await run(); } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; } }; return button; }
async function refresh() { instances = await api('/api/instances'); render(); syncQueueTargets(); }
function render() {
  cards.replaceChildren(); document.querySelector('#total').textContent = instances.length;
  document.querySelector('#online').textContent = instances.filter(x => x.status.state === 'connected').length;
  const picker = document.querySelector('#target-picker'); const selected = picker.value;
  picker.replaceChildren(option('', 'Choose a connection'), ...instances.map(x => option(x.id, x.name)));
  picker.value = instances.some(x => x.id === selected) ? selected : instances.length === 1 ? instances[0].id : '';
  document.querySelector('#load-target').disabled = !instances.length;
  if (!instances.length) {
    const empty = el('div', undefined, 'empty'); empty.append(el('h3', 'Connect your first Arena.'), el('p', 'Save a connection to load its sources, effects and available clip slots.'), action('Add Arena', openDialog, 'primary')); cards.append(empty); return;
  }
  for (const item of instances) {
    const status = item.status; const card = el('article', undefined, 'connection-card');
    const top = el('div', undefined, 'card-top'); top.append(el('h3', item.name), el('span', { connected: 'Connected', offline: 'Unavailable', unchecked: 'Not checked' }[status.state], `state ${status.state}`));
    card.append(top, el('p', item.endpoint, 'endpoint'));
    const detail = el('div', undefined, 'composition'); detail.append(el('span', 'COMPOSITION', 'label'));
    if (status.state === 'connected') {
      detail.append(el('h4', status.compositionName), el('p', `Arena ${status.version} · ${status.layers.length} layers · ${status.columnCount} columns`, 'meta'));
      const layers = el('ul', undefined, 'layers'); for (const layer of status.layers) layers.append(el('li', `${layer.name} · ${layer.clips} clip slots`)); detail.append(layers);
    } else detail.append(el('p', status.message || 'Check this connection to read its current state.', status.message ? 'error' : 'meta'));
    if (status.checkedAt) detail.append(el('p', `Last checked ${new Date(status.checkedAt).toLocaleString()}`, 'time'));
    card.append(detail);
    const actions = el('div', undefined, 'actions');
    actions.append(action('Open prompt studio', () => openStudio(item), 'primary'));
    actions.append(action('Check connection', async () => { try { await api(`/api/instances/${item.id}/inspect`, 'POST'); notice.textContent = `${item.name} checked. No Arena settings changed.`; } finally { await refresh(); } }));
    actions.append(action('Export state JSON', async () => {
      const snapshot = await api(`/api/instances/${item.id}/snapshot`, 'POST');
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      const link = el('a'); link.href = url; link.download = `${item.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${item.id.slice(0,8)}.state.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice.textContent = 'State snapshot exported. This is diagnostic JSON, not a replayable Arena composition.'; await refresh();
    }));
    actions.append(action('Remove', async () => { if (!confirm(`Remove the saved connection “${item.name}”? Arena itself is unchanged.`)) return; await api(`/api/instances/${item.id}`, 'DELETE'); if (studioTarget?.id === item.id) { studioTarget = null; document.querySelector('#studio-workspace').hidden = true; document.querySelector('#studio-empty').hidden = false; } await refresh(); }, 'quiet'));
    card.append(actions); cards.append(card);
  }
}
async function boot() {
  try { const session = await fetch('/api/session').then(r => { if (!r.ok) throw new Error('Cannot open local session.'); return r.json(); }); token = session.token; await refresh(); await refreshGallery(); }
  catch (error) { notice.textContent = `${error.message} Reload to retry.`; }
}


const studioForm = document.querySelector('#studio-form');
let studioTarget = null;
let recipe = null;
let studioLoad = 0;
function option(value, text) { const node = el('option', text); node.value = value; return node; }
async function openStudio(item) {
  const load = ++studioLoad;
  invalidateRecipe();
  recipe = null; document.querySelector('#review').replaceChildren();
  const catalog = await api(`/api/instances/${item.id}/catalog`, 'POST');
  if (load !== studioLoad) return;
  studioTarget = item;
  document.querySelector('#studio-target').textContent = item.name;
  document.querySelector('#source').replaceChildren(option('', 'Choose a built-in source'), ...catalog.sources.map(x => option(x.id, x.name)));
  document.querySelector('#effects').replaceChildren(...catalog.effects.map(x => option(x.id, x.name)));
  document.querySelector('#slot').replaceChildren(...catalog.slots.map(x => option(x.id, x.label)));
  document.querySelector('#catalog-note').textContent = `${catalog.compositionName} · ${catalog.sources.length} sources · ${catalog.effects.length} effects · ${catalog.slots.length} empty slots`;
  document.querySelector('#suggestions').textContent = '';
  document.querySelector('#studio-workspace').hidden = false;
  document.querySelector('#studio-empty').hidden = true;
  document.querySelector('#target-picker').value = item.id;
  location.hash = 'studio'; showView(true);
}
document.querySelector('#suggest').onclick = async () => {
  const requestedTarget = studioTarget; const requestedLoad = studioLoad;
  const button = document.querySelector('#suggest'); button.disabled = true;
  try {
    const result = await api(`/api/instances/${studioTarget.id}/suggest`, 'POST', { prompt: studioForm.elements.prompt.value });
    if (requestedTarget !== studioTarget || requestedLoad !== studioLoad) return;
    const holder = document.querySelector('#suggestions'); holder.replaceChildren(el('p', 'Catalog keyword matches — suggestions, not AI interpretation. Colors and motion are not configured by this matcher.'));
    for (const [key, label] of [['sources', 'Source'], ['effects', 'Effect']]) for (const item of result[key]) holder.append(action(`${label}: ${item.name}`, async () => {
      if (key === 'sources') document.querySelector('#source').value = item.id;
      else for (const opt of document.querySelector('#effects').options) if (opt.value === item.id) opt.selected = !opt.selected;
      invalidateRecipe();
    }, 'quiet'));
    if (!result.sources.length && !result.effects.length) holder.append(el('p', 'No keyword matches. Choose from the live catalog below.'));
  } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; }
};
let formRevision = 0;
function invalidateRecipe() { formRevision++; recipe = null; document.querySelector('#review').replaceChildren(); }
studioForm.oninput = invalidateRecipe;
studioForm.onsubmit = async event => {
  event.preventDefault(); const button = studioForm.querySelector('[type=submit]'); button.disabled = true;
  const revision = formRevision; const target = studioTarget;
  try {
    recipe = await api(`/api/instances/${studioTarget.id}/plan`, 'POST', { prompt: studioForm.elements.prompt.value, mode: studioForm.elements.mode.value, sourceId: document.querySelector('#source').value, clipId: Number(document.querySelector('#slot').value), effectIds: [...document.querySelector('#effects').selectedOptions].map(x => x.value) });
    if (revision !== formRevision || target !== studioTarget) { await refreshGallery(); return; }
    const review = document.querySelector('#review'); review.replaceChildren(el('h3', 'Review your recipe'), el('p', recipe.prompt), el('p', `${recipe.mode} mode · operator-selected recipe`), el('p', `${recipe.instance.name} → ${recipe.compositionName} → ${recipe.slot.label}`), el('p', [recipe.source.name, ...recipe.effects.map(x => x.name)].join(' → ')), el('p', 'Loads into this empty slot using default parameters. Playback stays under your control in Arena. Review expires after 10 minutes.'));
    const approvedRecipe = recipe;
    review.append(action('Approve & build clip', async () => {
      const result = await api(`/api/instances/${approvedRecipe.instance.id}/execute`, 'POST', { planId: approvedRecipe.id, approved: true });
      review.replaceChildren(el('h3', result.status === 'applied' ? 'Clip built' : 'Inspect Arena before continuing'), el('p', result.error || 'The clip is ready in Arena. Trigger it there when you’re ready.'));
      recipe = null; await refreshGallery(); await refresh();
    }, 'primary'));
    await refreshGallery();
  } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; }
};
let galleryEntries = [];
let galleryStatus = 'all';
let galleryLoad = 0;
async function refreshGallery() {
  const load = ++galleryLoad;
  const entries = await api('/api/gallery');
  if (load !== galleryLoad) return;
  galleryEntries = entries; renderGallery();
}
function recipeIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('aria-hidden', 'true');
  for (const d of ['M5 29 20 5l15 24Z', 'M5 21 20 36l15-15', 'M5 29h30']) {
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path);
  }
  return svg;
}
function renderGallery() {
  const list = document.querySelector('#gallery-items'); list.replaceChildren();
  document.querySelector('#nav-gallery-count').textContent = galleryEntries.length;
  document.querySelector('#gallery-count').textContent = galleryEntries.length;
  const filter = document.querySelector('#gallery-filter').value.toLowerCase();
  const sorted = [...galleryEntries];
  if (document.querySelector('#gallery-sort').value === 'oldest') sorted.reverse();
  const visible = sorted.filter(x => (galleryStatus === 'all' || galleryStatus === x.status || galleryStatus === 'attention' && ['uncertain', 'interrupted'].includes(x.status)) && `${x.prompt} ${x.source.name} ${x.effects.map(e => e.name).join(' ')} ${x.status}`.toLowerCase().includes(filter));
  document.querySelector('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'recipe' : 'recipes'}`;
  for (const entry of visible) {
    const card = el('article', undefined, 'recipe-row');
    const stamp = el('div', undefined, 'recipe-stamp'); stamp.append(recipeIcon(), el('span', 'Preview not captured')); card.append(stamp);
    const content = el('div', undefined, 'recipe-content');
    content.append(el('span', { applied: 'Built', planned: 'Planned', uncertain: 'Needs attention', interrupted: 'Interrupted', executing: 'Building' }[entry.status] || entry.status, `state ${entry.status}`), el('h3', [entry.source.name, ...entry.effects.map(x => x.name)].join(' + ')), el('p', entry.prompt, 'recipe-prompt'));
    const meta = el('div', undefined, 'recipe-meta'); meta.append(el('span', entry.creator || 'Operator'), el('span', entry.instance.name), el('span', new Date(entry.createdAt).toLocaleString())); content.append(meta);
    if (entry.error) content.append(el('p', entry.error, 'error'));
    const actions = el('div', undefined, 'recipe-actions');
    actions.append(action('Use recipe', async () => {
      const target = instances.find(x => x.id === entry.instance.id);
      if (!target) throw new Error('The original Arena connection is no longer saved. Add it before reusing this recipe.');
      await openStudio(target);
      if (studioTarget?.id !== target.id) return;
      studioForm.elements.prompt.value = entry.prompt; studioForm.elements.mode.value = entry.mode;
      document.querySelector('#source').value = entry.source.id;
      for (const opt of document.querySelector('#effects').options) opt.selected = entry.effects.some(x => x.id === opt.value);
      notice.textContent = 'Recipe loaded. Review the current catalog and choose an empty slot before building.';
    }));
    actions.append(action('Download JSON', async () => {
      const value = await api(`/api/gallery/${entry.id}`); const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
      const link = el('a'); link.href = url; link.download = entry.filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'quiet'));
    card.append(content, actions); list.append(card);
  }
  if (!visible.length) {
    const empty = el('div', undefined, 'empty');
    empty.append(el('h2', galleryEntries.length ? 'No matching recipes.' : 'Your collection starts here.'), el('p', galleryEntries.length ? 'Try another search or switch to All recipes.' : 'Build a recipe in the studio. Its prompt and execution record will be kept here.'));
    empty.append(action(galleryEntries.length ? 'Clear filters' : 'Create a recipe', async () => {
      if (galleryEntries.length) { document.querySelector('#gallery-filter').value = ''; setGalleryStatus('all'); } else await newRecipe();
    })); list.append(empty);
  }
}
function setGalleryStatus(status) {
  galleryStatus = status;
  for (const button of document.querySelectorAll('[data-status]')) button.setAttribute('aria-pressed', String(button.dataset.status === status));
  renderGallery();
}
for (const button of document.querySelectorAll('[data-status]')) button.onclick = () => setGalleryStatus(button.dataset.status);
document.querySelector('#gallery-filter').oninput = renderGallery;
document.querySelector('#gallery-sort').onchange = renderGallery;
function showView(focus = false) {
  const view = ['gallery', 'studio', 'connections', 'queue', 'queue-config'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'gallery';
  for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== view;
  for (const link of document.querySelectorAll('[data-view]')) {
    const active = link.dataset.view === view; link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  const title = { gallery: 'Gallery', studio: 'Prompt studio', connections: 'Connections', queue: 'Queue', 'queue-config': 'Queue configuration' }[view];
  document.querySelector('#view-name').textContent = title; document.title = `Rezzo · ${title}`;
  if (focus) { const heading = document.querySelector(`#${view}-heading`); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
async function newRecipe() {
  if (!instances.length) { location.hash = 'connections'; notice.textContent = 'Add an Arena connection to start a recipe.'; return; }
  if (instances.length === 1) await openStudio(instances[0]); else { location.hash = 'studio'; showView(true); }
}
document.querySelector('#new-recipe').onclick = async () => {
  const button = document.querySelector('#new-recipe'); button.disabled = true;
  try { await newRecipe(); } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; }
};
document.querySelector('#load-target').onclick = async () => {
  const item = instances.find(x => x.id === document.querySelector('#target-picker').value);
  if (!item) { notice.textContent = 'Choose a saved Arena connection first.'; return; }
  const button = document.querySelector('#load-target'); button.disabled = true;
  try { await openStudio(item); } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; }
};
document.querySelector('#target-picker').onchange = () => {
  studioLoad++; studioTarget = null; invalidateRecipe();
  document.querySelector('#studio-workspace').hidden = true; document.querySelector('#studio-empty').hidden = false;
};
document.querySelector('.skip-link').onclick = event => { event.preventDefault(); document.querySelector('#main').focus(); };
window.addEventListener('hashchange', () => { showView(true); window.scrollTo(0, 0); });


let queueSnapshot = null;
let queueLoad = 0;
let settingsRevision = null;
const queueTarget = document.querySelector('#queue-target');
function syncQueueTargets() {
  const previous = queueTarget.value;
  queueTarget.replaceChildren(option('', 'Choose a connection'), ...instances.map(x => option(x.id, x.name)));
  queueTarget.value = instances.some(x => x.id === previous) ? previous : instances.length === 1 ? instances[0].id : '';
  loadQueue().catch(error => { notice.textContent = error.message; });
}
function renderQueue() {
  const items = document.querySelector('#queue-items');
  const restoreFocus = items.contains(document.activeElement); items.replaceChildren();
  if (restoreFocus) { const heading = document.querySelector('#queue-heading'); heading.tabIndex = -1; heading.focus({preventScroll:true}); }
  for (const form of document.querySelectorAll('#queue-add, #queue-adjust, #queue-settings')) for (const field of form.elements) field.disabled = field.id === 'queue-config-reload' ? !queueTarget.value : !queueSnapshot;
  renderPlayback();
  document.querySelector('#queue-events').replaceChildren();
  if (!queueSnapshot) { items.append(el('p', 'Choose a saved connection to manage its queue.', 'empty')); document.querySelector('#queue-summary').textContent = 'No target loaded'; return; }
  const pending = queueSnapshot.requests.filter(x => x.status === 'pending');
  const ranks = new Map(queueSnapshot.ranked.map((x,i) => [x.id, i + 1]));
  pending.sort((a,b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity) || a.sequence-b.sequence);
  document.querySelector('#queue-summary').textContent = `${pending.length} pending · ${queueSnapshot.ranked.length} approved · updated ${new Date(queueSnapshot.sampledAt).toLocaleTimeString()}`;
  if (!pending.length) items.append(el('div', 'No pending requests. Add a prompt for operator review.', 'empty'));
  for (const request of pending) {
    const row = el('article', undefined, 'queue-row');
    row.append(el('span', request.approved ? `#${ranks.get(request.id)} · Approved` : 'Awaiting review', 'meta'), el('h3', request.prompt), el('p', `Local operator · ${request.priority} · ${new Date(request.createdAt).toLocaleString()}`, 'meta'));
    const score = request.ranking; const c = score.components;
    row.append(el('strong', `${Number(score.score.toFixed(6))} points`, 'queue-score'), el('p', `Base ${c.base} + aging ${Number(c.aging.toFixed(6))} + adjustments ${c.adjustments} − bulk ${c.bulkPenalty}${request.admin ? ' · Admin fixed at 1000' : ''}`, 'meta'));
    const actions = el('div', undefined, 'actions');
    if (!request.approved && request.recipeId) actions.append(action('Approve request', () => queueRequestCommand({ operation: 'approve', requestId: request.id })));
    actions.append(action('Remove request', () => queueRequestCommand({ operation: 'remove', requestId: request.id })));
    const attachment = el('div', undefined, 'queue-attachment');
    const recipes = galleryEntries.filter(x => x.status === 'applied' && x.instance.id === queueTarget.value);
    const recipeLabel = el('label', 'Built recipe'); const picker = el('select'); picker.setAttribute('aria-label', `Built recipe for ${request.prompt}`);
    picker.append(option('', 'Choose a built recipe'), ...recipes.map(x => option(x.id, `${x.source.name} · ${x.id.slice(0,8)} · ${x.prompt}`))); picker.value = request.recipeId ?? ''; recipeLabel.append(picker);
    const durationLabel = el('label', 'Duration (seconds)'); const duration = el('input'); duration.type = 'number'; duration.min = '1'; duration.max = '3600'; duration.step = '0.001'; duration.value = (request.durationMs ?? 60000)/1000; duration.setAttribute('aria-label', `Duration for ${request.prompt}`); durationLabel.append(duration);
    const attach = action('Attach & review again', () => queueRequestCommand({operation:'attach',requestId:request.id,recipeId:picker.value,durationSeconds:Number(duration.value)}));
    attach.disabled = !recipes.length;
    attachment.append(recipeLabel,durationLabel,attach);
    row.append(el('p', request.recipeId ? `Attached ${request.recipeId.slice(0,8)} · ${request.durationMs/1000}s. Changing attachment clears approval.` : 'A built recipe and playback approval are required.', 'meta'), attachment);
    actions.append(action('Build in studio', async () => { const item = instances.find(x => x.id === queueTarget.value); await openStudio(item); studioForm.elements.prompt.value = request.prompt; invalidateRecipe(); }));
    row.append(actions); items.append(row);
  }
  const events = document.querySelector('#queue-events'); events.replaceChildren();
  for (const event of [...queueSnapshot.events].reverse()) events.append(el('li', `${new Date(event.at).toLocaleString()} · ${event.operation} · ${event.result.outcome}${event.result.requestId ? ` · ${event.result.requestId.slice(0,8)}` : ''}`));
}
function fillQueueSettings() {
  const form = document.querySelector('#queue-settings');
  document.querySelector('#queue-config-target').textContent = instances.find(x => x.id === queueTarget.value)?.name ?? 'Choose a target on the Queue page.';
  settingsRevision = queueSnapshot?.revision ?? null;
  if (!queueSnapshot) { form.reset(); return; }
  const c = queueSnapshot.config;
  for (const [name,value] of Object.entries({ bulkPenalty:c.bulkPenalty, agingPoints:c.agingPoints, agingSeconds:c.agingIntervalMs/1000, tier1:c.tierBases[0], tier2:c.tierBases[1], tier3:c.tierBases[2] })) form.elements.namedItem(name).value = value;
}
async function loadQueue(fillSettings = true, quiet = false) {
  const generation = ++queueLoad; const target = queueTarget.value;
  if (!quiet) { queueSnapshot = null; renderQueue(); }
  if (!target) { fillQueueSettings(); return; }
  const [snapshot, recipes] = await Promise.all([api(`/api/instances/${target}/queue`), api('/api/gallery')]);
  if (generation !== queueLoad || target !== queueTarget.value) return;
  galleryEntries = recipes; queueSnapshot = snapshot; renderQueue(); if (fillSettings) fillQueueSettings();
}
// A failed transport retry retains the same event ID and exact payload.
let retryCommand = null;
let queueBusy = false;
async function queueCommand(command) {
  if (queueBusy) throw new Error('Wait for the current queue change to finish.');
  const target = queueTarget.value; if (!target) throw new Error('Choose a target first.');
  const signature = JSON.stringify([target, command]);
  const payload = retryCommand?.signature === signature ? retryCommand.payload : { ...command, eventId: crypto.randomUUID() };
  retryCommand = { signature, payload };
  queueBusy = true; queueTarget.disabled = true;
  try {
  const result = await api(`/api/instances/${target}/queue`, 'POST', payload);
  retryCommand = null;
  if (target === queueTarget.value) await loadQueue(command.operation === 'configure');
  notice.textContent = `Queue: ${result.outcome.replaceAll('_', ' ')}.${queueSnapshot?.playback.paused ? ' Scheduler is paused.' : ' Scheduler is enabled.'}`;
  } finally { queueBusy = false; queueTarget.disabled = false; }
}
async function queueRequestCommand(command) {
  await queueCommand(command);
  if (!document.querySelector('#queue').hidden) { const heading = document.querySelector('#queue-heading'); heading.tabIndex = -1; heading.focus({preventScroll:true}); }
}
function queueSubmit(id, command) {
  document.querySelector(id).onsubmit = async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await queueCommand(command(new FormData(form))); if (id === '#queue-add') form.reset(); }
    catch (error) { notice.textContent = error.message; }
    finally { button.disabled = !queueSnapshot; if (!form.closest('.view').hidden && !button.disabled) button.focus(); }
  };
}
queueSubmit('#queue-add', fields => ({ operation:'enqueue', prompt:fields.get('prompt'), priority:fields.get('priority') }));
queueSubmit('#queue-adjust', fields => ({ operation:'adjustNext', delta:Number(fields.get('delta')) }));
queueSubmit('#queue-settings', fields => ({ operation:'configure', revision:settingsRevision, config:{ bulkPenalty:Number(fields.get('bulkPenalty')), agingPoints:Number(fields.get('agingPoints')), agingIntervalMs:Math.round(Number(fields.get('agingSeconds'))*1000), tierBases:[1,2,3].map(x => Number(fields.get(`tier${x}`))) } }));
queueTarget.onchange = () => loadQueue().catch(error => { notice.textContent = error.message; });
for (const id of ['#queue-refresh', '#queue-config-reload']) document.querySelector(id).onclick = () => loadQueue().catch(error => { notice.textContent = error.message; });
function renderPlayback() {
  const state = queueSnapshot?.playback; const active = state?.active;
  const owned = queueSnapshot?.requests.find(x => x.id === active?.requestId);
  document.querySelector('#playback-status').textContent = !state ? 'Choose a target or refresh its queue.' : `${state.paused ? 'Scheduler paused' : 'Scheduler enabled'}${active ? ` · ${active.phase}: ${owned?.prompt ?? active.requestId}${active.endsAt ? ` · due ${new Date(active.endsAt).toLocaleTimeString()}` : ''}` : ' · No owned clip'}${state.message ? ` · ${state.message.replaceAll('_', ' ')}` : ''}`;
  for (const op of ['resume','pause','stop','reconcile']) document.querySelector(`#playback-${op}`).disabled = !state || (['stop','reconcile'].includes(op) && !active);
}
for (const operation of ['resume','pause','stop','reconcile']) document.querySelector(`#playback-${operation}`).onclick = async () => {
  if (queueBusy || !queueTarget.value) return;
  queueBusy = true; queueTarget.disabled = true;
  for (const button of document.querySelectorAll('.playback-panel button')) button.disabled = true;
  const target = queueTarget.value;
  try { await api(`/api/instances/${target}/playback`, 'POST', {operation, ...(operation === 'resume' ? {confirmed:true} : {})}); notice.textContent = `Playback: ${operation}.`; }
  catch (error) { notice.textContent = error.message; }
  finally { queueBusy = false; queueTarget.disabled = false; await loadQueue(false).catch(error => { notice.textContent = error.message; }); }
};
setInterval(() => {
  if (document.hidden || document.querySelector('#queue').hidden || queueBusy || !queueSnapshot || (queueSnapshot.playback.paused && !queueSnapshot.playback.active) || document.activeElement.closest('form, #queue-items, select')) return;
  loadQueue(false, true).catch(error => { notice.textContent = error.message; });
}, 2000);
showView(); boot();
