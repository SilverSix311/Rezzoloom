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
async function refresh() { instances = await api('/api/instances'); render(); }
function render() {
  cards.replaceChildren(); document.querySelector('#total').textContent = instances.length;
  document.querySelector('#online').textContent = instances.filter(x => x.status.state === 'connected').length;
  if (!instances.length) {
    const empty = el('div', undefined, 'empty'); empty.append(el('div', '◈', 'symbol'), el('h3', 'Your next stage starts here.'), el('p', 'Add an Arena connection to inspect its composition.\nYour visuals stay exactly as they are.'), action('＋ Add your first Arena', openDialog, 'primary')); cards.append(empty); return;
  }
  for (const item of instances) {
    const status = item.status; const card = el('article', undefined, 'card');
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
    actions.append(action('Remove', async () => { if (!confirm(`Remove the saved connection “${item.name}”? Arena itself is unchanged.`)) return; await api(`/api/instances/${item.id}`, 'DELETE'); await refresh(); }, 'quiet'));
    card.append(actions); cards.append(card);
  }
}
async function boot() {
  try { const session = await fetch('/api/session').then(r => { if (!r.ok) throw new Error('Cannot open local session.'); return r.json(); }); token = session.token; await refresh(); await refreshGallery(); }
  catch (error) { notice.textContent = `${error.message} Reload to retry.`; }
}
boot();

const studioPanel = document.querySelector('#studio');
const studioForm = document.querySelector('#studio-form');
let studioTarget = null;
let recipe = null;
let studioLoad = 0;
function option(value, text) { const node = el('option', text); node.value = value; return node; }
async function openStudio(item) {
  const load = ++studioLoad;
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
  studioPanel.hidden = false; studioPanel.scrollIntoView({ behavior: 'smooth' });
}
document.querySelector('#suggest').onclick = async () => {
  const button = document.querySelector('#suggest'); button.disabled = true;
  try {
    const result = await api(`/api/instances/${studioTarget.id}/suggest`, 'POST', { prompt: studioForm.elements.prompt.value });
    const holder = document.querySelector('#suggestions'); holder.replaceChildren(el('p', 'Catalog keyword matches — suggestions, not AI interpretation. Colors and motion are not configured by this matcher.'));
    for (const [key, label] of [['sources', 'Source'], ['effects', 'Effect']]) for (const item of result[key]) holder.append(action(`${label}: ${item.name}`, async () => {
      if (key === 'sources') document.querySelector('#source').value = item.id;
      else for (const opt of document.querySelector('#effects').options) if (opt.value === item.id) opt.selected = !opt.selected;
      invalidateRecipe();
    }, 'quiet'));
    if (!result.sources.length && !result.effects.length) holder.append(el('p', 'No keyword matches. Choose from the live catalog below.'));
  } catch (error) { notice.textContent = error.message; } finally { button.disabled = false; }
};
function invalidateRecipe() { recipe = null; document.querySelector('#review').replaceChildren(); }
studioForm.oninput = invalidateRecipe;
studioForm.onsubmit = async event => {
  event.preventDefault(); const button = studioForm.querySelector('[type=submit]'); button.disabled = true;
  try {
    recipe = await api(`/api/instances/${studioTarget.id}/plan`, 'POST', { prompt: studioForm.elements.prompt.value, mode: studioForm.elements.mode.value, sourceId: document.querySelector('#source').value, clipId: Number(document.querySelector('#slot').value), effectIds: [...document.querySelector('#effects').selectedOptions].map(x => x.value) });
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
async function refreshGallery() {
  const entries = await api('/api/gallery'); const list = document.querySelector('#gallery-items'); list.replaceChildren();
  const filter = document.querySelector('#gallery-filter').value.toLowerCase();
  const sorted = document.querySelector('#gallery-sort').value === 'oldest' ? entries.reverse() : entries;
  for (const entry of sorted.filter(x => `${x.prompt} ${x.source.name} ${x.effects.map(e => e.name).join(' ')} ${x.status}`.toLowerCase().includes(filter))) {
    const card = el('article', undefined, 'card'); card.append(el('span', entry.status.toUpperCase(), 'eyebrow'), el('h3', entry.source.name), el('p', entry.prompt), el('p', `${entry.instance.name} · ${new Date(entry.createdAt).toLocaleString()}`, 'meta'), el('p', entry.effects.map(x => x.name).join(' · ') || 'Source only', 'meta'));
    card.append(action('Use as a starting point', async () => {
      const target = instances.find(x => x.id === entry.instance.id);
      if (!target) throw new Error('The original Arena connection is no longer saved. Add it before reusing this recipe.');
      await openStudio(target);
      studioForm.elements.prompt.value = entry.prompt; studioForm.elements.mode.value = entry.mode;
      document.querySelector('#source').value = entry.source.id;
      for (const opt of document.querySelector('#effects').options) opt.selected = entry.effects.some(x => x.id === opt.value);
      notice.textContent = 'Recipe copied into the studio. Review the current catalog and choose an empty slot before building.';
    }));
    card.append(action('Download recipe & record', async () => {
      const value = await api(`/api/gallery/${entry.id}`); const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
      const link = el('a'); link.href = url; link.download = entry.filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    })); list.append(card);
  }
  if (!list.children.length) list.append(el('p', entries.length ? 'No matching recipes.' : 'Your reviewed recipes will be saved here, including unsuccessful attempts.', 'meta'));
}
document.querySelector('#gallery-filter').oninput = () => refreshGallery().catch(error => { notice.textContent = error.message; });
document.querySelector('#gallery-sort').onchange = () => refreshGallery().catch(error => { notice.textContent = error.message; });
