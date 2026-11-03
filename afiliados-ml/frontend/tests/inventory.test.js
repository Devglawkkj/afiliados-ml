import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryStore, inventoryExamples, parsePrice, validPhoto, INVENTORY_KEY } from '../src/inventory-store.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const example = () => ({ ...inventoryExamples[0], photos: [...inventoryExamples[0].photos] });

test('preço decimal é convertido em centavos exatos sem aceitar formatos ambíguos', () => {
  assert.equal(parsePrice('129,90'), 12990);
  assert.equal(parsePrice('0.29'), 29);
  assert.equal(parsePrice('25'), 2500);
  for (const value of ['0', '-1', '1.234,56', '1e3', '19,999', '']) assert.throws(() => parsePrice(value));
});

test('cadastro persiste após recriar adapter e edição mantém id e incrementa revisão', () => {
  const storage = memoryStorage();
  const store = createInventoryStore(storage);
  const saved = store.save(example());
  const reopened = createInventoryStore(storage);
  assert.equal(reopened.load()[0].quantity, 24);
  const edited = reopened.save({ ...saved, quantity: 0, status: 'paused' }, saved.id, saved.revision);
  assert.equal(edited.id, saved.id);
  assert.equal(edited.revision, 2);
  assert.equal(reopened.load()[0].quantity, 0);
  assert.equal(reopened.load()[0].status, 'paused');
});

test('duplicidade de código é rejeitada e edição obsoleta não sobrescreve dados', () => {
  const store = createInventoryStore(memoryStorage());
  const original = store.save(example());
  assert.throws(() => store.save({ ...example(), sku: 'demo-fone' }), /código/);
  store.save({ ...original, quantity: 3 }, original.id, original.revision);
  assert.throws(() => store.save({ ...original, quantity: 8 }, original.id, original.revision), /mudou/);
  assert.equal(store.load()[0].quantity, 3);
});

test('estoque negativo, fracionado, prazos inválidos e fotos executáveis são recusados', () => {
  const store = createInventoryStore(memoryStorage());
  for (const changes of [{ quantity: -1 }, { quantity: 1.5 }, { dispatch_days: 31 }, { price_cents: 0 },
    { photos: ['javascript:alert(1)'] }, { photos: ['data:image/svg+xml;base64,AAAA'] }, { status: 'unknown' }]) {
    assert.throws(() => store.save({ ...example(), ...changes }));
  }
  assert.equal(store.load().length, 0);
  assert.equal(validPhoto('/inventory-demo.svg'), true);
  assert.equal(validPhoto('https://untrusted.invalid/image.png'), false);
});

test('falha de armazenamento preserva versão anterior e sinaliza o erro', () => {
  const storage = memoryStorage();
  const store = createInventoryStore(storage);
  const saved = store.save(example());
  const broken = { getItem: storage.getItem, setItem() { throw Error('quota'); } };
  assert.throws(() => createInventoryStore(broken).save({ ...saved, quantity: 12 }, saved.id, saved.revision), /salvar/);
  assert.equal(store.load()[0].quantity, 24);
});

test('JSON corrompido não é substituído silenciosamente', () => {
  const storage = memoryStorage();
  storage.setItem(INVENTORY_KEY, '{invalid');
  const store = createInventoryStore(storage);
  assert.throws(() => store.load(), /preservados/);
  assert.throws(() => store.save(example()), /preservados/);
  assert.equal(storage.getItem(INVENTORY_KEY), '{invalid');
});

test('limite local é verificado sem sobrescrever produtos existentes', () => {
  const store = createInventoryStore(memoryStorage());
  for (let i = 0; i < 30; i++) store.save({ ...example(), sku: `ITEM-${i}` });
  assert.throws(() => store.save({ ...example(), sku: 'EXTRA' }), /30 produtos/);
  assert.equal(store.load().length, 30);
});
