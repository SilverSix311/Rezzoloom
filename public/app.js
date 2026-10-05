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
  try { const session = await fetch('/api/session').then(r => { if (!r.ok) throw new Error('Cannot open local session.'); return r.json(); }); token = session.token; await refresh(); }
  catch (error) { notice.textContent = `${error.message} Reload to retry.`; }
}
boot();
