/**
 * DDD Brasil: consulta de DDDs e validação de telefones brasileiros.
 */
import { STATES, REGIOES, AREA_CODES, DF_SURROUNDINGS, NOTE_61, SERVICOS, PREFIXOS_NAO_GEOGRAFICOS } from './data.js';

export { REGIOES, SERVICOS, PREFIXOS_NAO_GEOGRAFICOS };

function deepFreeze(object) {
  for (const value of Object.values(object)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(object);
}

const ENTRIES = AREA_CODES.map(([ddd, uf, cities]) =>
  deepFreeze({
    ddd,
    uf,
    estado: STATES[uf].name,
    regiao: STATES[uf].region,
    cidades: [...cities],
    observacao: ddd === DF_SURROUNDINGS.areaCode ? NOTE_61 : null,
  }),
);
const BY_AREA_CODE = new Map(ENTRIES.map((entry) => [entry.ddd, entry]));

/** Remove acentos, caixa, hífens e espaços extras: "São João del-Rei" → "sao joao del rei". */
export function normalizarTexto(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-'\u2019.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_INDEX = [
  ...ENTRIES.flatMap((entry) => entry.cidades.map((city) => ({ city, uf: entry.uf, ddd: entry.ddd }))),
  ...DF_SURROUNDINGS.cities.map((city) => ({ city, uf: DF_SURROUNDINGS.state, ddd: DF_SURROUNDINGS.areaCode })),
].map((item) => ({ ...item, stateName: STATES[item.uf].name, key: normalizarTexto(item.city) }));

/** Dados de um DDD: buscarDDD(19) → { ddd, uf, estado, regiao, cidades, observacao }; null se não existir. */
export function buscarDDD(ddd) {
  if (typeof ddd !== 'number' && typeof ddd !== 'string') return null;
  let digits = String(ddd).replace(/\D/g, '');
  if (digits.length === 3 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 2) return null;
  return BY_AREA_CODE.get(Number(digits)) ?? null;
}

/** Todos os 67 DDDs, em ordem. */
export function listarDDDs() {
  return [...ENTRIES];
}

/** DDDs de uma UF, pela sigla ou pelo nome do estado: dddsPorUF('SP'), dddsPorUF('São Paulo'). */
export function dddsPorUF(uf) {
  const code = siglaDaUF(uf);
  return code ? ENTRIES.filter((entry) => entry.uf === code) : [];
}

/** As 27 UFs com nome, região e DDDs. */
export function listarUFs() {
  return Object.entries(STATES).map(([uf, { name, region }]) => ({
    uf,
    nome: name,
    regiao: region,
    ddds: ENTRIES.filter((entry) => entry.uf === uf).map((entry) => entry.ddd),
  }));
}

/** Sigla da UF a partir da sigla ou do nome ("sp", "São Paulo", "sao paulo"); null se não reconhecer. */
export function siglaDaUF(text) {
  if (typeof text !== 'string') return null;
  const upper = text.trim().toUpperCase();
  if (STATES[upper]) return upper;
  const key = normalizarTexto(text);
  const found = Object.entries(STATES).find(([, { name }]) => normalizarTexto(name) === key);
  return found ? found[0] : null;
}

/**
 * Procura uma cidade entre as cidades listadas, sem diferenciar acentos e maiúsculas.
 * Por padrão compara o nome inteiro; com { parcial: true }, aceita parte do nome.
 * @returns {{cidade: string, uf: string, estado: string, ddd: number}[]}
 */
export function buscarCidade(name, { parcial = false } = {}) {
  if (typeof name !== 'string') return [];
  const key = normalizarTexto(name);
  if (!key) return [];
  const rank = (item) => (item.key === key ? 0 : item.key.startsWith(key) ? 1 : 2);
  return CITY_INDEX.filter((item) => (parcial ? item.key.includes(key) : item.key === key))
    .sort((a, b) => rank(a) - rank(b) || a.city.localeCompare(b.city, 'pt-BR'))
    .map(({ city, uf, stateName, ddd }) => ({ cidade: city, uf, estado: stateName, ddd }));
}

function phoneResult(fields) {
  return {
    valido: false,
    tipo: null,
    ddd: null,
    uf: null,
    numero: null,
    e164: null,
    formatado: null,
    servico: null,
    motivo: null,
    ...fields,
  };
}

const invalid = (reason) => phoneResult({ motivo: reason });

/**
 * Valida um telefone brasileiro.
 * Aceita "(19) 99999-9999", "+55 19 3456-7890", "019 3456 7890", "0800 123 4567", "190"...
 * @returns {{valido: boolean, tipo: 'celular'|'fixo'|'nao-geografico'|'servico'|null, ddd: number|null,
 *   uf: string|null, numero: string|null, e164: string|null, formatado: string|null,
 *   servico: string|null, motivo: string|null}}
 */
export function validarTelefone(text) {
  if (typeof text !== 'string' && typeof text !== 'number') return invalid('Informe o telefone como texto.');
  const raw = String(text).trim();
  if (!raw) return invalid('Informe um número de telefone.');
  if (/[^\d\s()+\-./]/.test(raw)) {
    return invalid('O telefone tem caracteres inválidos: use só números, espaços, parênteses, hífen e +.');
  }
  let digits = raw.replace(/\D/g, '');
  if (!digits) return invalid('Informe um número de telefone.');

  const international = raw.startsWith('+');
  if (international && !digits.startsWith('55')) {
    return invalid('Só números do Brasil (+55) são aceitos.');
  }

  if (digits.length === 3 && !international) {
    const service = SERVICOS[digits];
    if (!service) return invalid(`O número ${digits} não está entre os serviços reconhecidos.`);
    return phoneResult({ valido: true, tipo: 'servico', numero: digits, formatado: digits, servico: service });
  }

  if (digits.length === 11 && PREFIXOS_NAO_GEOGRAFICOS.includes(digits.slice(0, 4))) {
    const formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    return phoneResult({ valido: true, tipo: 'nao-geografico', numero: digits, formatado: formatted });
  }

  // código do país (+55) e prefixo de longa distância (0)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  } else if (international) {
    return invalid('Depois do +55 vêm o DDD e o número, com 10 ou 11 dígitos no total.');
  } else if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 8 || digits.length === 9) {
    return invalid('Faltou o DDD: informe os 2 dígitos do código de área antes do número.');
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return invalid(
      `Quantidade de dígitos inválida (${digits.length}). Use DDD + número: 10 dígitos para fixo ou 11 para celular.`,
    );
  }

  const ddd = Number(digits.slice(0, 2));
  const number = digits.slice(2);
  const entry = BY_AREA_CODE.get(ddd);
  if (!entry) return invalid(`O DDD ${digits.slice(0, 2)} não existe.`);

  let kind;
  if (number.length === 9) {
    if (number[0] !== '9') return invalid('Números com 9 dígitos são de celular e começam com 9.');
    kind = 'celular';
  } else if (/^[2-5]/.test(number)) {
    kind = 'fixo';
  } else if (/^[6-9]/.test(number)) {
    return invalid('Números de 8 dígitos começando com 6 a 9 não são fixos. Se for celular, acrescente o 9 na frente.');
  } else {
    return invalid('Números fixos começam com 2, 3, 4 ou 5.');
  }

  const split = number.length - 4;
  return phoneResult({
    valido: true,
    tipo: kind,
    ddd,
    uf: entry.uf,
    numero: number,
    e164: `+55${ddd}${number}`,
    formatado: `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`,
  });
}

/**
 * Formata um telefone válido; devolve null se for inválido.
 * @param {string} text
 * @param {'nacional'|'internacional'|'e164'} [format='nacional']
 *   nacional: "(19) 99999-9999"; internacional: "+55 19 99999-9999"; e164: "+5519999999999".
 *   Serviços e números não geográficos só têm o formato nacional.
 */
export function formatarTelefone(text, format = 'nacional') {
  if (!['nacional', 'internacional', 'e164'].includes(format)) {
    throw new TypeError(`Formato inválido: "${format}". Use "nacional", "internacional" ou "e164".`);
  }
  const r = validarTelefone(text);
  if (!r.valido) return null;
  if (format === 'e164') return r.e164;
  if (format === 'internacional' && r.ddd !== null) {
    const split = r.numero.length - 4;
    return `+55 ${r.ddd} ${r.numero.slice(0, split)}-${r.numero.slice(split)}`;
  }
  return r.formatado;
}
