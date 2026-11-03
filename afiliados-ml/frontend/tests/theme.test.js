import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, readPreference, savePreference } from '../src/theme.js';

test('preferência explícita prevalece e sistema acompanha a configuração do dispositivo', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('invalid', true), 'dark');
});

test('armazenamento bloqueado ou inválido não impede resolução do tema', () => {
  assert.equal(readPreference({ getItem() { throw Error('blocked'); } }), 'system');
  assert.equal(readPreference({ getItem() { return '<invalid>'; } }), 'system');
  assert.doesNotThrow(() => savePreference({ setItem() { throw Error('blocked'); } }, 'dark'));
});

test('persistência escreve somente a chave de aparência e valores conhecidos', () => {
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args), getItem: () => 'dark' };
  savePreference(storage, 'dark');
  savePreference(storage, 'unexpected');
  assert.deepEqual(writes, [['garimpo.theme', 'dark']]);
  assert.equal(readPreference(storage), 'dark');
});
