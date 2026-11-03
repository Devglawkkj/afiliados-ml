import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, normalizeBaseUrl, imageUrl } from '../src/api.js';
import { escapeHtml, money } from '../src/format.js';

test('origem rejeita credenciais, protocolos e caminhos que poderiam receber token', () => {
  assert.equal(normalizeBaseUrl('http://127.0.0.1:8000/'), 'http://127.0.0.1:8000');
  for (const url of ['javascript:alert(1)', 'https://user:password@example.com', 'https://example.com/another', 'https://example.com?token=secret']) {
    assert.throws(() => normalizeBaseUrl(url));
  }
});

test('cliente envia filtros codificados e token no header, sem redirecionar', async () => {
  const api = createApi('http://localhost:8000', 'test-token', async (url, options) => {
    assert.equal(url.searchParams.get('q'), 'café & áudio');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.has('category_id'), false);
    assert.equal(url.searchParams.has('token'), false);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    return new Response(JSON.stringify({ data: [], meta: { total: 0 } }));
  });
  assert.deepEqual(await api.products({ q: 'café & áudio', page: 2, category_id: '' }), { data: [], meta: { total: 0 } });
});

test('cliente reconhece token recusado e resposta inválida', async () => {
  const denied = createApi('http://localhost:8000', 'test', async () => new Response('{}', { status: 401 }));
  await assert.rejects(denied.health(), error => error.status === 401);
  const invalid = createApi('http://localhost:8000', 'test', async () => new Response('not-json'));
  await assert.rejects(invalid.health(), /resposta inválida/);
});

test('cliente trata falhas de rede sem expor token e preserva cancelamentos', async () => {
  const offline = createApi('http://localhost:8000', 'private-test', async () => { throw Error('private-test'); });
  await assert.rejects(offline.health(), error => !error.message.includes('private-test') && error.status === 0);
  const controller = new AbortController(); controller.abort();
  const cancelled = createApi('http://localhost:8000', 'test', async () => { throw new DOMException('cancelled', 'AbortError'); });
  await assert.rejects(cancelled.products({}, controller.signal), error => error.name === 'AbortError');
});

test('imagens relativas usam origem da API e rejeitam conteúdo executável', () => {
  assert.equal(imageUrl('/demo-images/audio.svg', 'http://localhost:8000'), 'http://localhost:8000/demo-images/audio.svg');
  assert.equal(imageUrl('javascript:alert(1)', 'http://localhost:8000'), null);
  assert.equal(imageUrl(null, 'http://localhost:8000'), null);
});

test('conteúdo externo é escapado e preço nulo é explícito', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.match(money(15990), /159,90/);
  assert.equal(money(null), 'Sem preço');
});
