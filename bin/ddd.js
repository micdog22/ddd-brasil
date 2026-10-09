#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buscarDDD, buscarCidade, dddsPorUF, listarDDDs, siglaDaUF, validarTelefone } from '../src/index.js';

const HELP = `Uso: ddd [opções] [DDD ou cidade]

Consulta DDDs brasileiros e valida números de telefone.

Exemplos:
  ddd 19                              mostra a UF e as principais cidades do DDD 19
  ddd limeira                         procura a cidade e mostra o DDD
  ddd --uf SP                         lista os DDDs de uma UF
  ddd --telefone "(19) 99999-9999"    valida e formata um telefone
  ddd --todos                         lista os 67 DDDs

Opções:
  -u, --uf UF           DDDs de uma UF (sigla ou nome do estado)
  -t, --telefone NÚMERO valida um telefone
      --todos           lista todos os DDDs
      --json            saída em JSON
  -h, --help            mostra esta ajuda
  -v, --version         mostra a versão

Código de saída: 0 quando encontra (ou o telefone é válido), 1 quando não encontra
(ou o telefone é inválido) e 2 em erro de uso.`;

const KIND_NAMES = {
  celular: 'celular',
  fixo: 'fixo',
  'nao-geografico': 'número não geográfico',
  servico: 'serviço de utilidade pública',
};

function packageVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
}

function joinList(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items.join('');
}

function describeAreaCode(entry) {
  const lines = [`DDD ${entry.ddd} · ${entry.estado} (${entry.uf}) · ${entry.regiao}`, `Principais cidades: ${joinList(entry.cidades)}`];
  if (entry.observacao) lines.push(entry.observacao);
  return lines.join('\n');
}

function describePhone(r) {
  const lines = [`Telefone válido: ${KIND_NAMES[r.tipo]}`, `Formatado: ${r.formatado}`];
  if (r.servico) lines.push(`Serviço: ${r.servico}`);
  if (r.e164) lines.push(`E.164: ${r.e164}`);
  if (r.ddd) {
    const entry = buscarDDD(r.ddd);
    lines.push(`DDD ${entry.ddd}: ${entry.estado} (${entry.uf})`);
  }
  return lines.join('\n');
}

function main(argv) {
  let json = false;
  let action = null;
  let value = null;
  const setAction = (nextAction, nextValue) => {
    if (action) throw new Error('use só uma consulta por vez.');
    action = nextAction;
    value = nextValue;
  };

  try {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      const nextArg = () => {
        if (i + 1 >= argv.length) throw new Error(`a opção ${arg} precisa de um valor.`);
        return argv[++i];
      };
      if (arg === '--json') json = true;
      else if (arg === '-u' || arg === '--uf') setAction('uf', nextArg());
      else if (arg === '-t' || arg === '--telefone') setAction('phone', nextArg());
      else if (arg === '--todos') setAction('all', null);
      else if (arg === '-h' || arg === '--help') {
        console.log(HELP);
        return 0;
      } else if (arg === '-v' || arg === '--version') {
        console.log(packageVersion());
        return 0;
      } else if (arg.startsWith('-')) throw new Error(`opção desconhecida: ${arg}`);
      else setAction(/^\(?\d+\)?$/.test(arg.trim()) ? 'ddd' : 'city', arg);
    }
  } catch (error) {
    console.error(`ddd: ${error.message}\nUse "ddd --help" para ver as opções.`);
    return 2;
  }

  if (!action) {
    console.error(HELP);
    return 2;
  }

  const print = (data, text) => console.log(json ? JSON.stringify(data, null, 2) : text());

  if (action === 'phone') {
    const r = validarTelefone(value);
    if (json) print(r);
    else if (r.valido) print(r, () => describePhone(r));
    else console.error(`Telefone inválido: ${r.motivo}`);
    return r.valido ? 0 : 1;
  }

  if (action === 'ddd') {
    const entry = buscarDDD(value);
    if (!entry) {
      if (json) print(null);
      console.error(`ddd: o DDD ${value} não existe.`);
      return 1;
    }
    print(entry, () => describeAreaCode(entry));
    return 0;
  }

  if (action === 'uf') {
    const code = siglaDaUF(value);
    if (!code) {
      if (json) print([]);
      console.error(`ddd: UF não reconhecida: ${value}`);
      return 1;
    }
    const entries = dddsPorUF(code);
    print(entries, () =>
      [
        `${entries[0].estado} (${code}) · ${entries[0].regiao} · ${entries.length} DDD${entries.length > 1 ? 's' : ''}`,
        ...entries.map((entry) => `  ${entry.ddd}  ${entry.cidades.join(', ')}`),
      ].join('\n'),
    );
    return 0;
  }

  if (action === 'all') {
    const entries = listarDDDs();
    print(entries, () => entries.map((entry) => `${entry.ddd}  ${entry.uf}  ${entry.cidades.join(', ')}`).join('\n'));
    return 0;
  }

  let cities = buscarCidade(value);
  if (cities.length === 0) cities = buscarCidade(value, { parcial: true });
  if (cities.length === 0) {
    if (json) print([]);
    console.error(`ddd: nenhuma cidade encontrada para "${value}" entre as principais cidades de cada DDD.`);
    return 1;
  }
  print(cities, () => cities.map((c) => `${c.cidade} (${c.uf}): DDD ${c.ddd}`).join('\n'));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
