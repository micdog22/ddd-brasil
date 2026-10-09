import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/ddd.js', import.meta.url));

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('ddd 19', () => {
  const r = run(['19']);
  assert.equal(r.code, 0);
  assert.equal(
    r.stdout,
    'DDD 19 · São Paulo (SP) · Sudeste\nPrincipais cidades: Campinas, Piracicaba, Limeira, Americana, Rio Claro e Sumaré\n',
  );
});

test('ddd 19 --json', () => {
  const r = run(['19', '--json']);
  assert.equal(r.code, 0);
  assert.equal(JSON.parse(r.stdout).uf, 'SP');
});

test('DDD inexistente', () => {
  const r = run(['23']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /o DDD 23 não existe/);
});

test('--uf SP', () => {
  const r = run(['--uf', 'SP']);
  assert.equal(r.code, 0);
  const lines = r.stdout.trim().split('\n');
  assert.equal(lines[0], 'São Paulo (SP) · Sudeste · 9 DDDs');
  assert.equal(lines.length, 10);
  assert.match(lines[9], /^ {2}19 {2}Campinas/);
});

test('--uf com nome do estado e --json', () => {
  const r = run(['--uf', 'minas gerais', '--json']);
  assert.deepEqual(
    JSON.parse(r.stdout).map((e) => e.ddd),
    [31, 32, 33, 34, 35, 37, 38],
  );
  assert.equal(run(['--uf', 'XX']).code, 1);
});

test('--telefone válido', () => {
  const r = run(['--telefone', '(19) 99999-9999']);
  assert.equal(r.code, 0);
  assert.equal(
    r.stdout,
    'Telefone válido: celular\nFormatado: (19) 99999-9999\nE.164: +5519999999999\nDDD 19: São Paulo (SP)\n',
  );
});

test('--telefone de serviço e inválido', () => {
  assert.match(run(['-t', '193']).stdout, /Serviço: Corpo de Bombeiros/);
  const r = run(['-t', '(19) 9999-9999']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /^Telefone inválido: /);
});

test('--telefone --json', () => {
  const r = run(['--json', '--telefone', '0800 123 4567']);
  assert.equal(r.code, 0);
  assert.equal(JSON.parse(r.stdout).tipo, 'nao-geografico');
});

test('busca por cidade', () => {
  assert.equal(run(['limeira']).stdout, 'Limeira (SP): DDD 19\n');
  assert.equal(run(['Luziânia']).stdout, 'Luziânia (GO): DDD 61\n');
  const partial = run(['caxias do']);
  assert.equal(partial.stdout, 'Caxias do Sul (RS): DDD 54\n');
  assert.equal(run(['Cidade Exemplo']).code, 1);
});

test('--todos lista os 67 DDDs', () => {
  const r = run(['--todos']);
  assert.equal(r.code, 0);
  assert.equal(r.stdout.trim().split('\n').length, 67);
});

test('erros de uso', () => {
  assert.equal(run([]).code, 2);
  assert.equal(run(['--uf']).code, 2);
  assert.equal(run(['--xml']).code, 2);
  assert.equal(run(['19', '--uf', 'SP']).code, 2);
});

test('--help e --version', () => {
  assert.match(run(['--help']).stdout, /^Uso: ddd/);
  assert.match(run(['--version']).stdout, /^\d+\.\d+\.\d+\n$/);
});
