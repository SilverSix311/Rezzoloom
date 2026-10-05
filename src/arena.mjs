export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function normalizeEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new AppError('Enter a complete http:// or https:// Arena address.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new AppError('Use an HTTP(S) origin only, without credentials, path, query, or fragment.');
  }
  return url.origin;
}
export async function readJson(url, { timeout = 5000, limit = 8 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) { controller.abort(); throw new Error('Response exceeds size limit'); }
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new AppError(`Arena read failed: ${error.name === 'AbortError' ? 'connection timed out' : error.message}. Check the address and Arena Webserver settings.`, 502);
  } finally { clearTimeout(timer); }
}
export async function inspectArena(endpoint, options) {
  const [product, composition] = await Promise.all([
    readJson(`${endpoint}/api/v1/product`, options),
    readJson(`${endpoint}/api/v1/composition`, options),
  ]);
  if (product?.name !== 'Arena' || !Array.isArray(composition?.layers) || typeof composition?.name?.value !== 'string') {
    throw new AppError('The endpoint did not return a supported Arena product and composition response.', 502);
  }
  return {
    product, composition,
    summary: {
      product: product.name, version: [product.major, product.minor, product.micro].join('.'),
      compositionName: composition.name.value,
      layers: composition.layers.map(layer => ({ id: layer.id, name: layer.name?.value ?? 'Unnamed layer', clips: Array.isArray(layer.clips) ? layer.clips.length : 0 })),
      columnCount: Array.isArray(composition.columns) ? composition.columns.length : 0,
      checkedAt: new Date().toISOString(),
      capabilities: ['product.read', 'composition.read'],
    },
  };
}
