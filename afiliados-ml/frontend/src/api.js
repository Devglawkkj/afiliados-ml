/** Cliente somente de leitura; nunca persiste ou registra tokens. */
export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

/** Aceita apenas uma origem HTTP(S), sem credenciais, caminho ou query. */
export function normalizeBaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new ApiError('Informe um endereço válido para a API.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ApiError('Use apenas a origem da API, como http://127.0.0.1:8000.');
  }
  return url.origin;
}

/** Resolve imagens da API; rejeita URLs executáveis e dados embutidos. */
export function imageUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Cria cliente com token em closure; redirecionamentos não recebem credenciais. */
export function createApi(baseUrl, token, fetcher = fetch) {
  const base = normalizeBaseUrl(baseUrl);
  async function get(path, params = {}, signal) {
    const url = new URL(`/api/v1/${path}`, base);
    Object.entries(params).forEach(([key, value]) => { if (value !== '' && value != null) url.searchParams.set(key, value); });
    let response;
    try {
      response = await fetcher(url, {
        headers: { Authorization: `Bearer ${token}` }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
        redirect: 'error', credentials: 'omit', cache: 'no-store',
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('Não foi possível alcançar a API. Confira o servidor, o endereço e as origens permitidas (CORS).');
    }
    let body;
    try { body = await response.json(); } catch { throw new ApiError('A API retornou uma resposta inválida.', response.status); }
    if (!response.ok) {
      if (response.status === 401) throw new ApiError('Token inválido ou expirado. Conecte novamente.', 401);
      throw new ApiError(body?.error?.message || 'Não foi possível carregar os dados.', response.status);
    }
    return body;
  }
  return {
    baseUrl: base,
    health: signal => get('health', {}, signal),
    products: (params, signal) => get('products', params, signal),
    product: (id, signal) => get(`products/${encodeURIComponent(id)}`, {}, signal),
    prices: (id, params, signal) => get(`products/${encodeURIComponent(id)}/prices`, params, signal),
  };
}
