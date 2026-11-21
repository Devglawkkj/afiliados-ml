import './style.css';
import './theme.css';
import './profiles.css';
import './inventory.css';
import { mountInventory } from './inventory-ui.js';
import { profiles, resolvePage, createProfileSession } from './profiles.js';
import { initializeTheme } from './theme.js';
import { createApi, imageUrl } from './api.js';
import { money, escapeHtml as e, categoryName, categoryNames, sourceName, dateLabel } from './format.js';

const $ = selector => document.querySelector(selector);
initializeTheme();
const connectionDialog = $('#connect-dialog');
const detailDialog = $('#product-dialog');
const grid = $('#product-grid');
const statePanel = $('#catalog-state');
const state = { api: null, page: 1, pageSize: 6, q: '', category: '', total: 0, controller: null, detailController: null, detailPage: 1, detailId: null };
let connectionController = null;
let inventoryCleanup = null;
Object.entries(categoryNames).forEach(([value, name]) => $('#category').add(new Option(name, value)));

function wireImages(parent) {
  parent.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    img.hidden = true;
    img.parentElement.classList.add('missing-image');
    img.parentElement.setAttribute('aria-label', 'Imagem indisponível');
  }, { once: true }));
}

function productImage(product, className = '') {
  const url = imageUrl(product.image_url, state.api.baseUrl);
  return `<div class="product-image ${className} ${url ? '' : 'missing-image'}">${url ? `<img src="${e(url)}" alt="${e(product.title)}" loading="lazy" referrerpolicy="no-referrer" />` : '<span>Imagem indisponível</span>'}</div>`;
}

function updateConnection(connected) {
  $('#connection-label').textContent = connected ? 'API conectada' : 'Conectar API';
  $('#connection-button').classList.toggle('connected', connected);
  ['#search', '#category', '#search-button', '#refresh-button'].forEach(selector => { $(selector).disabled = !connected; });
  $('#disconnect-button').hidden = !connected;
}

function showState(title, description, action, label) {
  grid.innerHTML = '';
  statePanel.hidden = false;
  statePanel.innerHTML = `<span class="state-symbol" aria-hidden="true">${action === 'retry' ? '↻' : '↗'}</span><h3>${e(title)}</h3><p>${e(description)}</p><button class="button primary" data-action="${action}">${e(label)} →</button>`;
  statePanel.querySelector('button').addEventListener('click', action === 'connect' ? openConnection : action === 'clear' ? clearFilters : loadProducts);
}

function openConnection() {
  if (profileSession.current !== 'seller') return;
  $('#connect-error').textContent = '';
  if (state.api) $('#api-url').value = state.api.baseUrl;
  connectionDialog.showModal();
}

function disconnect() {
  state.controller?.abort();
  state.detailController?.abort();
  state.api = null;
  state.page = 1;
  state.q = '';
  state.category = '';
  $('#search').value = '';
  $('#category').value = '';
  $('#clear-filters').hidden = true;
  $('#api-token').value = '';
  $('#pagination').hidden = true;
  $('#total-badge').textContent = '—';
  $('#results-label').textContent = 'Conecte sua API para explorar o catálogo';
  updateConnection(false);
  showState('Seu catálogo começa aqui.', 'Conecte a API local para visualizar os produtos de demonstração e seus históricos.', 'connect', 'Conectar minha API');
  if (detailDialog.open) detailDialog.close();
}

function renderCards(products) {
  grid.innerHTML = products.map((product, index) => `<article class="product-card" style="--card-index:${index}">
    <div class="card-media">${productImage(product)}<span class="source-tag">${e(sourceName(product.source))}</span></div>
    <div class="card-body"><div class="card-category">${e(categoryName(product.category_id))}<span aria-hidden="true">↗</span></div>
    <h3>${e(product.title)}</h3><p class="item-id">${e(product.item_id)}${product.variation_id ? ` · ${e(product.variation_id)}` : ''}</p>
    <div class="price-row"><div><small>Último preço observado</small><strong>${e(money(product.latest_price?.price_cents, product.currency))}</strong></div><span class="price-indicator" title="Histórico disponível" aria-hidden="true">▥</span></div>
    <button class="detail-button" data-product="${Number(product.id)}" aria-label="Ver detalhes de ${e(product.title)}">Explorar produto <span aria-hidden="true">→</span></button></div></article>`).join('');
  grid.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => openProduct(Number(button.dataset.product))));
  wireImages(grid);
}

async function loadProducts() {
  if (profileSession.current !== 'seller') return;
  if (!state.api) return openConnection();
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  const api = state.api;
  statePanel.hidden = true;
  $('#pagination').hidden = true;
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-card" aria-hidden="true"><div></div><span></span><span></span></div>').join('');
  $('#results-label').textContent = 'Buscando seus achados...';
  $('#clear-filters').hidden = !state.q && !state.category;
  try {
    const body = await api.products({ page: state.page, page_size: state.pageSize, q: state.q, category_id: state.category }, controller.signal);
    if (controller.signal.aborted || api !== state.api) return;
    state.total = body.meta.total;
    const start = (state.page - 1) * state.pageSize + 1;
    $('#total-badge').textContent = body.meta.total;
    $('#results-label').textContent = body.meta.total ? `Mostrando ${start}–${start + body.data.length - 1} de ${body.meta.total} produtos` : 'Nenhum produto encontrado';
    // Preserva categorias futuras que apareçam nos cadastros, sem acoplar à fonte externa.
    body.data.forEach(product => {
      if (product.category_id && ![...$('#category').options].some(option => option.value === product.category_id)) $('#category').add(new Option(categoryName(product.category_id), product.category_id));
    });
    if (!body.data.length) {
      showState(state.q || state.category ? 'Ainda não encontramos esse achado.' : 'Seu catálogo está vazio.', state.q || state.category ? 'Experimente outro nome ou remova os filtros da busca.' : 'Cadastre os exemplos com o comando de demonstração e atualize o catálogo.', state.q || state.category ? 'clear' : 'retry', state.q || state.category ? 'Limpar filtros' : 'Atualizar catálogo');
    } else renderCards(body.data);
    const pages = Math.max(1, Math.ceil(body.meta.total / state.pageSize));
    $('#pagination').hidden = pages <= 1;
    $('#page-label').textContent = `Página ${state.page} de ${pages}`;
    $('#previous-page').disabled = state.page <= 1;
    $('#next-page').disabled = state.page >= pages;
  } catch (error) {
    if (controller.signal.aborted || api !== state.api) return;
    $('#results-label').textContent = 'Não foi possível carregar o catálogo';
    if (error.status === 401) { disconnect(); openConnection(); $('#connect-error').textContent = error.message; }
    else showState('Vamos tentar de novo?', error.message, 'retry', 'Tentar novamente');
  } finally { if (state.controller === controller) grid.removeAttribute('aria-busy'); }
}

function clearFilters() {
  state.page = 1; state.q = ''; state.category = '';
  $('#search').value = ''; $('#category').value = '';
  loadProducts();
}

function historyChart(prices, currency) {
  if (!prices.length) return '<p class="history-empty">Nenhuma observação de preço disponível.</p>';
  const sorted = [...prices].reverse();
  const values = sorted.map(price => Number(price.price_cents));
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const points = values.map((value, i) => `${30 + i * 540 / Math.max(1, values.length - 1)},${140 - (value - min) / span * 100}`);
  return `<div class="chart-meta"><span>${e(money(max, currency))}</span><span>${e(money(min, currency))}</span></div><svg class="price-chart" viewBox="0 0 600 180" role="img" aria-label="Evolução dos preços da página atual; valores completos na tabela abaixo"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e96b3c" stop-opacity=".2"/><stop offset="100%" stop-color="#e96b3c" stop-opacity="0"/></linearGradient></defs><path d="M30 40H570 M30 90H570 M30 140H570" stroke="#e9e8e2" fill="none"/><polygon points="30,165 ${points.join(' ')} 570,165" fill="url(#chart-fill)"/><polyline points="${points.join(' ')}" fill="none" stroke="#df6133" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map(point => { const [cx, cy] = point.split(','); return `<circle cx="${cx}" cy="${cy}" r="4" fill="#df6133" stroke="white" stroke-width="2"/>`; }).join('')}</svg>`;
}

async function openProduct(id, historyPage = 1) {
  if (profileSession.current !== 'seller') return;
  if (!state.api) return;
  state.detailController?.abort();
  const controller = new AbortController();
  state.detailController = controller;
  state.detailId = id;
  state.detailPage = historyPage;
  const api = state.api;
  $('#product-detail').innerHTML = '<h2 id="detail-title">Explorando seu achado...</h2><p class="dialog-description" role="status">Carregando produto e histórico.</p>';
  if (!detailDialog.open) detailDialog.showModal();
  try {
    const [product, history] = await Promise.all([api.product(id, controller.signal), api.prices(id, { page: historyPage, page_size: 20 }, controller.signal)]);
    if (controller.signal.aborted || api !== state.api || !detailDialog.open) return;
    const pages = Math.max(1, Math.ceil(history.meta.total / 20));
    $('#product-detail').innerHTML = `<div class="detail-summary">${productImage(product, 'detail-image')}<div><span class="small-tag">${e(sourceName(product.source))}</span><p class="card-category">${e(categoryName(product.category_id))}</p><h2 id="detail-title">${e(product.title)}</h2><p class="item-id">${e(product.item_id)}${product.variation_id ? ` · ${e(product.variation_id)}` : ''}</p><strong class="detail-price">${e(money(product.latest_price?.price_cents, product.currency))}</strong><p class="detail-caption">Último preço observado</p></div></div>
      ${product.source === 'demo' ? '<p class="detail-notice">Produto fictício. Os valores servem apenas à demonstração, sem opção de compra.</p>' : '<p class="detail-notice">Consulta de cadastro. Compra e publicação ainda não fazem parte deste MVP.</p>'}
      <div class="history-heading"><h3>Um olhar sobre os preços</h3><span>${history.meta.total} observações</span></div>
      ${historyChart(history.data, product.currency)}
      ${history.data.length ? `<table class="history-table"><caption class="sr-only">Observações de preços em ordem da mais recente para a mais antiga</caption><thead><tr><th scope="col">Data da observação (UTC)</th><th scope="col">Preço</th></tr></thead><tbody>${history.data.map(price => `<tr><td>${e(dateLabel(price.observed_at))}<small>${e(new Date(price.observed_at).getUTCFullYear())}</small></td><td>${e(money(price.price_cents, product.currency))}</td></tr>`).join('')}</tbody></table>` : ''}
      ${pages > 1 ? `<div class="history-pagination"><button id="history-prev" class="button secondary" ${historyPage <= 1 ? 'disabled' : ''}>← Anterior</button><span>Página ${historyPage} de ${pages}</span><button id="history-next" class="button secondary" ${historyPage >= pages ? 'disabled' : ''}>Próxima →</button></div><p class="detail-caption">O gráfico mostra as observações da página atual.</p>` : ''}`;
    wireImages($('#product-detail'));
    $('#history-prev')?.addEventListener('click', () => openProduct(id, historyPage - 1));
    $('#history-next')?.addEventListener('click', () => openProduct(id, historyPage + 1));
  } catch (error) {
    if (controller.signal.aborted || api !== state.api) return;
    if (error.status === 401) { detailDialog.close(); disconnect(); openConnection(); $('#connect-error').textContent = error.message; return; }
    $('#product-detail').innerHTML = `<h2 id="detail-title">Não foi possível abrir o produto.</h2><p class="dialog-description" role="alert">${e(error.message)}</p><button class="button primary" id="retry-detail">Tentar novamente</button>`;
    $('#retry-detail').addEventListener('click', () => openProduct(id, historyPage));
  }
}

$('#connect-form').addEventListener('submit', async event => {
  event.preventDefault();
  connectionController?.abort();
  const controller = new AbortController();
  connectionController = controller;
  const button = $('#connect-submit');
  button.disabled = true; button.textContent = 'Conectando...';
  $('#connect-error').textContent = '';
  try {
    const candidate = createApi($('#api-url').value.trim(), $('#api-token').value.trim());
    await candidate.health(controller.signal);
    if (controller.signal.aborted || !connectionDialog.open) return;
    state.controller?.abort(); state.detailController?.abort();
    state.api = candidate; state.page = 1;
    $('#api-token').value = '';
    updateConnection(true);
    connectionDialog.close();
    loadProducts();
  } catch (error) { if (!controller.signal.aborted && connectionDialog.open) $('#connect-error').textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Conectar e explorar →'; }
});
$('#connection-button').addEventListener('click', openConnection);
$('#empty-connect').addEventListener('click', openConnection);
$('#disconnect-button').addEventListener('click', () => { disconnect(); connectionDialog.close(); });
$('#refresh-button').addEventListener('click', loadProducts);
$('#filters').addEventListener('submit', event => { event.preventDefault(); state.page = 1; state.q = $('#search').value.trim(); state.category = $('#category').value; loadProducts(); });
$('#category').addEventListener('change', () => $('#filters').requestSubmit());
$('#clear-filters').addEventListener('click', clearFilters);
$('#previous-page').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadProducts(); } });
$('#next-page').addEventListener('click', () => { if (state.page * state.pageSize < state.total) { state.page += 1; loadProducts(); } });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
connectionDialog.addEventListener('close', () => { connectionController?.abort(); $('#api-token').value = ''; });
detailDialog.addEventListener('close', () => { state.detailController?.abort(); });

// Perfis de protótipo não alteram o Bearer token nem permissões do backend.
const profileSession = createProfileSession(() => {
  connectionController?.abort();
  if (connectionDialog.open) connectionDialog.close();
  disconnect();
});

function navigateProfile(page) {
  const role = profileSession.current;
  if (!role) return;
  const profile = profiles[role];
  const resolved = resolvePage(role, `#/${profile.path}/${page}`);
  history.replaceState(null, '', `#/${profile.path}/${resolved}`);
  renderProfile();
}

function overviewMarkup(role) {
  const seller = role === 'seller';
  return `<div class="profile-page-heading"><p class="eyebrow">PERFIL DE DEMONSTRAÇÃO · ${seller ? 'VENDEDOR' : 'FORNECEDOR'}</p><h1 id="profile-area-title" tabindex="-1">${seller ? 'Seu espaço para vender' : 'Seu estoque. Novas conexões'}<span>.</span></h1><p class="subtitle">${seller ? 'Conheça o caminho entre encontrar um produto e preparar seu anúncio.' : 'Você cuida dos produtos e do envio. O vendedor cuida do anúncio e do cliente.'}</p></div>
    <div class="role-notice"><span aria-hidden="true">✧</span><div><strong>Estamos construindo esse espaço, uma parte por vez.</strong><p>Os acessos são simulados. O fornecedor já pode experimentar o estoque local; anúncios e pedidos reais virão depois.</p></div></div>
    <div class="workflow-grid">${(seller ? [
      ['01', 'Encontre um produto', 'Explore os exemplos de produtos, os preços e o histórico.', true],
      ['02', 'Prepare seu anúncio', 'Você poderá personalizar título, descrição, fotos e preço de venda.', false],
      ['03', 'Cuide do relacionamento', 'Chat e pós-venda ficarão com você; o fornecedor executará o envio.', false],
    ] : [
      ['01', 'Organize seu estoque', 'Cadastre produtos fictícios, fotos, descrições, preço e quantidade neste navegador.', true],
      ['02', 'Conecte-se a vendedores', 'Os produtos cadastrados poderão aparecer no catálogo do vendedor.', false],
      ['03', 'Prepare e envie', 'Separação, embalagem e envio ficarão com você quando houver pedidos.', false],
    ]).map(([number, title, description, ready]) => `<article class="workflow-card"><span class="step-number">${number}</span><span class="small-tag">${ready ? 'Disponível no protótipo' : 'Próxima etapa'}</span><h2>${title}</h2><p>${description}</p></article>`).join('')}</div>
    <div class="role-next-step"><div><h2>${seller ? 'Explore os primeiros produtos' : 'Seu primeiro cadastro começa aqui'}</h2><p>${seller ? 'O catálogo atual contém apenas exemplos fictícios.' : 'Experimente o cadastro fictício com fotos, quantidade e prazo de envio.'}</p></div><button id="profile-primary-action" class="button primary">${seller ? 'Explorar catálogo' : 'Ver área de estoque'} →</button></div>`;
}

function renderProfile() {
  inventoryCleanup?.();
  inventoryCleanup = null;
  const role = profileSession.current;
  const selected = role ? profiles[role] : null;
  const page = resolvePage(role, location.hash);
  document.body.dataset.profile = role || 'none';
  $('#profile-sidebar').hidden = !selected;
  $('#profile-entry').hidden = Boolean(selected);
  $('#catalogo').hidden = page !== 'catalog';
  $('#profile-area').hidden = !selected || page === 'catalog';
  $('#connection-button').hidden = role !== 'seller';
  $('#workspace-name').textContent = selected ? selected.name : 'Garimpo';
  $('#breadcrumb-current').textContent = selected ? selected.pages.find(item => item.id === page).label : 'Boas-vindas';
  document.title = selected ? `Garimpo — ${selected.name} · ${selected.pages.find(item => item.id === page).label}` : 'Garimpo — Escolha seu perfil';
  if (!selected) {
    $('#profile-navigation').innerHTML = '';
    $('#profile-area').innerHTML = '';
    $('#entry-title').focus({ preventScroll: true });
    return;
  }
  $('#profile-initial').textContent = selected.initial;
  $('#profile-name').textContent = selected.name;
  $('#profile-note-title').textContent = role === 'supplier' ? 'Produtos que conectam.' : 'Um bom começo.';
  $('#profile-note-description').textContent = role === 'supplier' ? 'Conheça seu espaço de estoque e as responsabilidades de envio.' : 'Explore os exemplos e acompanhe a evolução dos preços.';
  $('#profile-navigation').innerHTML = selected.pages.map(item => `<a class="nav-link ${item.id === page ? 'active' : ''}" href="#/${selected.path}/${item.id}" ${item.id === page ? 'aria-current="page"' : ''}><span aria-hidden="true">${item.icon}</span>${item.label}</a>`).join('');
  if (page !== 'catalog') {
    if (page === 'inventory') inventoryCleanup = mountInventory($('#profile-area'));
    else $('#profile-area').innerHTML = overviewMarkup(role);
    $('#profile-primary-action')?.addEventListener('click', () => navigateProfile(role === 'seller' ? 'catalog' : 'inventory'));
    $('#profile-area-title').focus({ preventScroll: true });
  }
}

document.querySelectorAll('[data-enter-profile]').forEach(button => button.addEventListener('click', () => {
  const profile = profileSession.enter(button.dataset.enterProfile);
  history.replaceState(null, '', `#/${profile.path}/${profile.home}`);
  renderProfile();
  if (profile.home === 'catalog') $('#catalog-title').focus({ preventScroll: true });
}));
$('#catalog-title').setAttribute('tabindex', '-1');
$('#change-profile').addEventListener('click', () => {
  profileSession.leave();
  history.replaceState(null, '', location.pathname + location.search);
  renderProfile();
});
window.addEventListener('hashchange', () => {
  if (!profileSession.current) return;
  const selected = profiles[profileSession.current];
  const page = resolvePage(profileSession.current, location.hash);
  history.replaceState(null, '', `#/${selected.path}/${page}`);
  if (detailDialog.open) detailDialog.close();
  renderProfile();
});
renderProfile();
