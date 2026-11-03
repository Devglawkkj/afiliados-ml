/** Repositório local de exemplos. A futura API substituirá este adapter. */
export const INVENTORY_KEY = 'garimpo.demo-inventory.v1';
const MAX_PRODUCTS = 30;

export class InventoryError extends Error {}

/** Converte texto decimal em centavos sem multiplicar valores float. */
export function parsePrice(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}([,.]\d{1,2})?$/.test(text)) throw new InventoryError('Informe um preço como 129,90, sem separador de milhar.');
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0) throw new InventoryError('O preço deve ser maior que zero.');
  return cents;
}

function integer(value, min, max, label) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new InventoryError(`${label} deve ser inteiro entre ${min} e ${max}.`);
  }
  return Number(value);
}

/** Aceita apenas fotos raster locais ou o asset fixo dos exemplos. */
export function validPhoto(value) {
  return typeof value === 'string' && (value === '/inventory-demo.svg' ||
    (value.length <= 360000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)));
}

/** Normaliza todos os campos antes de salvar ou ler o armazenamento. */
export function validateProduct(input) {
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  const sku = String(input.sku ?? '').trim().toUpperCase();
  const category = String(input.category ?? '').trim();
  if (title.length < 3 || title.length > 120) throw new InventoryError('O título deve ter entre 3 e 120 caracteres.');
  if (description.length < 10 || description.length > 3000) throw new InventoryError('A descrição deve ter entre 10 e 3.000 caracteres.');
  if (!/^[A-Z0-9_-]{2,40}$/.test(sku)) throw new InventoryError('Use um código de 2 a 40 letras, números, hífen ou sublinhado.');
  if (!category || category.length > 64) throw new InventoryError('Informe uma categoria com até 64 caracteres.');
  if (!Array.isArray(input.photos) || input.photos.length > 3 || !input.photos.every(validPhoto)) throw new InventoryError('Use até três fotos JPG, PNG ou WebP válidas.');
  if (!['active', 'paused'].includes(input.status)) throw new InventoryError('Selecione uma disponibilidade válida.');
  return {
    title, description, sku, category,
    price_cents: integer(input.price_cents, 1, 999999999, 'Preço em centavos'),
    quantity: integer(input.quantity, 0, 999999, 'Quantidade'),
    dispatch_days: integer(input.dispatch_days, 0, 30, 'Prazo de envio'),
    photos: [...input.photos], status: input.status,
  };
}

/** Adapter local com validação, unicidade de SKU e revisão para edição obsoleta. */
export function createInventoryStore(storage) {
  function load() {
    let raw;
    try { raw = storage.getItem(INVENTORY_KEY); } catch { throw new InventoryError('O navegador bloqueou o estoque local. Habilite o armazenamento para usar este protótipo.'); }
    if (!raw) return [];
    try {
      const doc = JSON.parse(raw);
      if (doc.version !== 1 || !Array.isArray(doc.products) || doc.products.length > MAX_PRODUCTS) throw Error();
      const products = doc.products.map(item => {
        if (typeof item.id !== 'string' || !item.id || !Number.isInteger(item.revision) || item.revision < 1) throw Error();
        return { ...validateProduct(item), id: item.id, revision: item.revision };
      });
      if (new Set(products.map(item => item.id)).size !== products.length || new Set(products.map(item => item.sku)).size !== products.length) throw Error();
      return products;
    } catch { throw new InventoryError('O estoque local está inválido. Os dados foram preservados; nenhum cadastro será sobrescrito automaticamente.'); }
  }
  function write(products) {
    try { storage.setItem(INVENTORY_KEY, JSON.stringify({ version: 1, products })); }
    catch { throw new InventoryError('Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Reduza as fotos e tente novamente.'); }
  }
  function save(input, id = null, expectedRevision = null) {
    const value = validateProduct(input);
    const products = load();
    const index = products.findIndex(item => item.id === id);
    if (id && index < 0) throw new InventoryError('Este produto não existe mais. Reabra a lista antes de editar.');
    if (index >= 0 && products[index].revision !== expectedRevision) throw new InventoryError('Este produto mudou em outra edição. Reabra o cadastro para carregar a versão atual.');
    if (products.some(item => item.sku === value.sku && item.id !== id)) throw new InventoryError('Já existe um produto com este código.');
    if (index < 0 && products.length >= MAX_PRODUCTS) throw new InventoryError('O protótipo local aceita até 30 produtos.');
    const product = { ...value, id: id || crypto.randomUUID(), revision: index < 0 ? 1 : products[index].revision + 1 };
    if (index < 0) products.unshift(product); else products[index] = product;
    write(products);
    return product;
  }
  return { load, save };
}

/** Dois registros inventados, inseridos somente por ação explícita do usuário. */
export const inventoryExamples = [
  { sku: 'DEMO-FONE', title: 'Fone sem fio Aurora', category: 'audio', description: 'Produto fictício para experimentar o cadastro. Fone sem fio, acabamento leve e estojo de transporte.', price_cents: 12990, quantity: 24, dispatch_days: 2, status: 'active', photos: ['/inventory-demo.svg'] },
  { sku: 'DEMO-LUZ', title: 'Luminária de mesa Sol', category: 'casa', description: 'Produto fictício para experimentar o estoque. Luminária de mesa com base compacta para escritório.', price_cents: 4990, quantity: 0, dispatch_days: 3, status: 'active', photos: ['/inventory-demo.svg'] },
];
