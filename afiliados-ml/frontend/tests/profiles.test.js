import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileSession, resolvePage } from '../src/profiles.js';

test('sessão começa sem perfil e valida escolhas sem acessar armazenamento', () => {
  const session = createProfileSession();
  assert.equal(session.current, null);
  assert.throws(() => session.enter('admin'));
  assert.throws(() => session.enter('__proto__'));
  assert.equal(session.current, null);
  session.enter('seller');
  assert.equal(session.current, 'seller');
});

test('entrada, troca e saída sempre limpam o estado da sessão anterior', () => {
  let resets = 0;
  const session = createProfileSession(() => { resets += 1; });
  session.enter('seller');
  session.enter('supplier');
  assert.equal(session.current, 'supplier');
  session.leave();
  assert.equal(session.current, null);
  assert.equal(resets, 3);
  assert.equal(createProfileSession().current, null);
});

test('hash não escolhe perfil nem habilita páginas fora da navegação escolhida', () => {
  assert.equal(resolvePage(null, '#/fornecedor/inventory'), null);
  assert.equal(resolvePage('seller', '#/fornecedor/inventory'), 'catalog');
  assert.equal(resolvePage('supplier', '#/vendedor/catalog'), 'overview');
  assert.equal(resolvePage('supplier', '#/fornecedor/inventory'), 'inventory');
  assert.equal(resolvePage('seller', '#/vendedor/overview'), 'overview');
  assert.equal(resolvePage('supplier', '#/fornecedor/admin'), 'overview');
  assert.equal(resolvePage('__proto__', '#/fornecedor/inventory'), null);
});
