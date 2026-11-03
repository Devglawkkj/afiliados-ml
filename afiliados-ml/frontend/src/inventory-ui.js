import { createInventoryStore, inventoryExamples, parsePrice } from './inventory-store.js';
import { preparePhoto } from './inventory-photos.js';
import { escapeHtml as e, money, categoryName, categoryNames } from './format.js';

/** Monta estoque fictício independente da API e devolve limpeza para a navegação. */
export function mountInventory(root) {
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const store = createInventoryStore(storage);
  let query = '', availability = '', message = '', editing = null, photos = [], busy = false, generation = 0, alive = true;
  const dialog = document.createElement('dialog');
  dialog.className = 'inventory-dialog';
  dialog.setAttribute('aria-labelledby', 'inventory-editor-title');
  document.body.append(dialog);

  function render() {
    if (!alive) return;
    let products;
    try { products = store.load(); } catch (error) {
      root.innerHTML = `<div class="profile-page-heading"><h1 id="profile-area-title" tabindex="-1">Meu estoque<span>.</span></h1></div><div class="role-notice" role="alert"><div><strong>Não foi possível abrir o estoque local.</strong><p>${e(error.message)}</p></div></div>`;
      return;
    }
    const filtered = products.filter(product => {
      const text = `${product.title} ${product.sku}`.toLocaleLowerCase('pt-BR');
      const status = product.status === 'paused' ? 'paused' : product.quantity === 0 ? 'empty' : 'available';
      return text.includes(query.toLocaleLowerCase('pt-BR')) && (!availability || availability === status);
    });
    root.innerHTML = `<div class="stock-heading"><div class="profile-page-heading"><p class="eyebrow">FORNECEDOR · ESTOQUE DE DEMONSTRAÇÃO</p><h1 id="profile-area-title" tabindex="-1">Seus produtos. Seu ritmo<span>.</span></h1><p class="subtitle">Organize os itens que você vai disponibilizar para os vendedores.</p></div><button class="button primary" id="add-stock">+ Cadastrar produto</button></div>
      <div class="stock-notice"><span aria-hidden="true">◌</span><p>Dados fictícios salvos apenas neste navegador. Nenhum produto é enviado ao Mercado Livre ou ao catálogo do vendedor nesta etapa.</p></div>
      <div class="stock-metrics"><div><span>Produtos cadastrados</span><strong>${products.length}</strong></div><div><span>Unidades em estoque</span><strong>${products.reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div><span>Produtos disponíveis</span><strong>${products.filter(item => item.status === 'active' && item.quantity > 0).length}</strong></div></div>
      <div class="stock-toolbar"><form id="stock-filters" class="filters"><label class="search-box"><span aria-hidden="true">⌕</span><input type="search" id="stock-query" aria-label="Buscar no meu estoque" placeholder="Buscar produto ou código..." maxlength="120" value="${e(query)}" /></label><label class="category-label"><span class="sr-only">Disponibilidade</span><select id="stock-availability"><option value="">Todas as situações</option><option value="available" ${availability === 'available' ? 'selected' : ''}>Disponível</option><option value="empty" ${availability === 'empty' ? 'selected' : ''}>Sem estoque</option><option value="paused" ${availability === 'paused' ? 'selected' : ''}>Pausado</option></select></label><button class="button dark">Buscar →</button></form><button class="button secondary" id="seed-stock">Adicionar exemplos</button></div>
      <p id="stock-message" class="stock-message" role="status">${e(message || `${filtered.length} produto(s) nesta visualização`)}</p>
      ${filtered.length ? `<div class="stock-grid">${filtered.map(product => `<article class="stock-card"><div class="stock-photo">${product.photos[0] ? `<img src="${e(product.photos[0])}" alt="${e(product.title)}" loading="lazy"/>` : '<span>Sem foto</span>'}<span class="stock-status ${product.status === 'paused' ? 'paused' : product.quantity === 0 ? 'empty' : ''}">${product.status === 'paused' ? 'Pausado' : product.quantity === 0 ? 'Sem estoque' : 'Disponível'}</span></div><div class="stock-card-body"><p class="card-category">${e(categoryName(product.category))}</p><h2>${e(product.title)}</h2><p class="item-id">${e(product.sku)} · Demonstração</p><p class="stock-description">${e(product.description)}</p><div class="stock-price"><span>Preço de fornecimento</span><strong>${e(money(product.price_cents))}</strong></div><div class="stock-facts"><span><strong>${product.quantity}</strong> unidades</span><span>Envio em <strong>${product.dispatch_days}</strong> dia(s) úteis</span></div><button class="detail-button" data-edit-stock="${e(product.id)}">Editar produto <span aria-hidden="true">↗</span></button></div></article>`).join('')}</div>` : `<div class="inventory-preview"><div class="inventory-empty"><span class="role-symbol" aria-hidden="true">▤</span><h2>${products.length ? 'Nenhum item para este filtro.' : 'Seu primeiro produto começa aqui.'}</h2><p>${products.length ? 'Busque por outro nome ou selecione todas as situações.' : 'Cadastre um produto fictício ou adicione os exemplos para conhecer o fluxo de estoque.'}</p>${products.length ? '<button class="button secondary" id="clear-stock-filters">Limpar filtros</button>' : '<button class="button primary" id="first-stock">Cadastrar primeiro produto →</button>'}</div></div>`}
      <p class="profile-footnote">Um único estoque de demonstração neste navegador. Não há contas isoladas, reserva de quantidade ou sincronização com vendedores ainda.</p>`;
    root.querySelector('#add-stock').addEventListener('click', () => openEditor());
    root.querySelector('#first-stock')?.addEventListener('click', () => openEditor());
    root.querySelector('#clear-stock-filters')?.addEventListener('click', () => { query = ''; availability = ''; message = ''; render(); });
    root.querySelector('#stock-filters').addEventListener('submit', event => {
      event.preventDefault(); query = root.querySelector('#stock-query').value.trim(); availability = root.querySelector('#stock-availability').value; message = ''; render();
    });
    root.querySelector('#stock-availability').addEventListener('change', () => root.querySelector('#stock-filters').requestSubmit());
    root.querySelectorAll('[data-edit-stock]').forEach(button => button.addEventListener('click', () => {
      try { const product = store.load().find(item => item.id === button.dataset.editStock); if (product) openEditor(product); }
      catch (error) { message = error.message; render(); }
    }));
    root.querySelector('#seed-stock').addEventListener('click', () => {
      let count = 0;
      try {
        const existing = new Set(store.load().map(item => item.sku));
        for (const item of inventoryExamples) if (!existing.has(item.sku)) { store.save(item); count += 1; }
        message = count ? `${count} exemplo(s) adicionado(s).` : 'Os exemplos já estão no seu estoque; nenhuma alteração foi feita.';
      } catch (error) { message = error.message; }
      render();
    });
  }

  function renderPhotos() {
    dialog.querySelector('#stock-photos-preview').innerHTML = photos.map((photo, index) => `<div class="photo-thumbnail"><img src="${e(photo)}" alt="Foto ${index + 1} do produto"/><button type="button" data-remove-photo="${index}" aria-label="Remover foto ${index + 1}">×</button>${index === 0 ? '<span>Capa</span>' : ''}</div>`).join('');
    dialog.querySelectorAll('[data-remove-photo]').forEach(button => button.addEventListener('click', () => {
      if (!busy) { photos.splice(Number(button.dataset.removePhoto), 1); renderPhotos(); }
    }));
  }

  function openEditor(product = null) {
    editing = product;
    photos = [...(product?.photos || [])];
    busy = false;
    generation += 1;
    dialog.innerHTML = `<form id="stock-form" class="dialog-content"><div class="dialog-heading"><span class="eyebrow">FORNECEDOR · PRODUTO FICTÍCIO</span><button class="icon-button" id="close-stock-editor" type="button" aria-label="Fechar cadastro">×</button></div><h2 id="inventory-editor-title">${product ? 'Ajuste seu produto' : 'Um novo produto começa aqui'}<span>.</span></h2><p class="dialog-description">Preencha os dados de demonstração. Você poderá editar o cadastro depois.</p>
      <div class="stock-form-grid"><div class="stock-field full"><label class="field-label" for="stock-title">Título do produto *</label><input class="field" id="stock-title" name="title" required minlength="3" maxlength="120" value="${e(product?.title)}" placeholder="Ex.: Fone sem fio Aurora" /></div><div class="stock-field"><label class="field-label" for="stock-sku">Código do produto *</label><input class="field" id="stock-sku" name="sku" required minlength="2" maxlength="40" pattern="[A-Za-z0-9_-]{2,40}" value="${e(product?.sku)}" placeholder="Ex.: FONE-001" /></div><div class="stock-field"><label class="field-label" for="stock-category">Categoria *</label><input class="field" id="stock-category" name="category" required maxlength="64" list="stock-categories" value="${e(product?.category)}" placeholder="Ex.: audio"/><datalist id="stock-categories">${Object.entries(categoryNames).map(([code, name]) => `<option value="${e(code)}">${e(name)}</option>`).join('')}</datalist></div><div class="stock-field full"><label class="field-label" for="stock-description">Descrição *</label><textarea class="field" id="stock-description" name="description" rows="4" required minlength="10" maxlength="3000" placeholder="Descreva características, materiais e o que acompanha o produto.">${e(product?.description)}</textarea></div><div class="stock-field"><label class="field-label" for="stock-price">Preço de fornecimento (R$) *</label><input class="field" id="stock-price" name="price" inputmode="decimal" required maxlength="10" value="${product ? (product.price_cents / 100).toFixed(2).replace('.', ',') : ''}" placeholder="129,90"/><small>Seu valor de fornecimento, sem separador de milhar.</small></div><div class="stock-field"><label class="field-label" for="stock-quantity">Quantidade em estoque *</label><input class="field" id="stock-quantity" name="quantity" type="number" required min="0" max="999999" step="1" value="${product?.quantity ?? 0}"/></div><div class="stock-field"><label class="field-label" for="stock-days">Prazo para envio (dias úteis) *</label><input class="field" id="stock-days" name="dispatch_days" type="number" required min="0" max="30" step="1" value="${product?.dispatch_days ?? 2}"/><small>Tempo para despachar, não prazo de entrega.</small></div><div class="stock-field"><label class="field-label" for="stock-status">Disponibilidade *</label><select class="field" id="stock-status" name="status"><option value="active">Ativo</option><option value="paused" ${product?.status === 'paused' ? 'selected' : ''}>Pausado</option></select><small>Quantidade zero aparece como sem estoque.</small></div></div>
      <label class="field-label" for="stock-photo-files">Fotos do produto</label><p class="photo-help">Até três fotos JPG, PNG ou WebP, com até 5 MB cada. A primeira é a capa. Opcional nesta demonstração.</p><input class="field" id="stock-photo-files" type="file" accept="image/jpeg,image/png,image/webp" multiple/><div id="stock-photos-preview" class="photo-previews"></div><p id="stock-editor-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button secondary" id="cancel-stock-editor" type="button">Cancelar</button><button class="button primary" id="save-stock">${product ? 'Salvar alterações' : 'Cadastrar produto'} →</button></div></form>`;
    dialog.querySelector('#close-stock-editor').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancel-stock-editor').addEventListener('click', () => dialog.close());
    dialog.querySelector('#stock-status').value = product?.status || 'active';
    dialog.querySelector('#stock-photo-files').addEventListener('change', async event => {
      const files = [...event.target.files];
      const version = generation;
      const errorBox = dialog.querySelector('#stock-editor-error');
      errorBox.textContent = '';
      if (photos.length + files.length > 3) { errorBox.textContent = 'Use no máximo três fotos. Remova uma foto antes de adicionar outra.'; event.target.value = ''; return; }
      busy = true;
      const save = dialog.querySelector('#save-stock');
      save.disabled = true;
      event.target.disabled = true;
      errorBox.textContent = 'Preparando fotos locais...';
      try {
        const prepared = await Promise.all(files.map(preparePhoto));
        if (alive && version === generation && dialog.open) { photos.push(...prepared); renderPhotos(); errorBox.textContent = ''; }
      } catch (error) { if (alive && version === generation) errorBox.textContent = error.message; }
      finally {
        if (alive && version === generation) { busy = false; save.disabled = false; event.target.disabled = false; event.target.value = ''; }
      }
    });
    dialog.querySelector('#stock-form').addEventListener('submit', event => {
      event.preventDefault();
      if (busy) return;
      const form = new FormData(event.target);
      try {
        store.save({
          title: form.get('title'), sku: form.get('sku'), category: form.get('category'), description: form.get('description'),
          price_cents: parsePrice(form.get('price')), quantity: form.get('quantity'), dispatch_days: form.get('dispatch_days'), status: form.get('status'), photos,
        }, editing?.id, editing?.revision);
        message = editing ? 'Produto atualizado neste navegador.' : 'Produto fictício cadastrado neste navegador.';
        dialog.close();
        render();
      } catch (error) { dialog.querySelector('#stock-editor-error').textContent = error.message; }
    });
    renderPhotos();
    dialog.showModal();
  }
  dialog.addEventListener('close', () => { generation += 1; busy = false; photos = []; editing = null; });
  render();
  return () => { alive = false; generation += 1; dialog.remove(); };
}
