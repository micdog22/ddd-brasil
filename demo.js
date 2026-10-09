import { buscarDDD, buscarCidade, dddsPorUF, listarDDDs, siglaDaUF, validarTelefone, REGIOES } from './src/index.js';

const searchInput = document.getElementById('search');
const searchResult = document.getElementById('search-result');
const phoneInput = document.getElementById('phone');
const phoneResult = document.getElementById('phone-result');
const allCodes = document.getElementById('all-codes');

const KIND_NAMES = {
  celular: 'Celular',
  fixo: 'Fixo',
  'nao-geografico': 'Não geográfico (0800, 0300…)',
  servico: 'Serviço de utilidade pública',
};

function el(tag, properties = {}, children = []) {
  const element = document.createElement(tag);
  Object.assign(element, properties);
  element.append(...children);
  return element;
}

function message(text, kind = '') {
  return el('p', { className: `message ${kind}`.trim(), textContent: text });
}

function codeCard(entry) {
  const children = [
    el('div', { className: 'code-header' }, [
      el('span', { className: 'code-number', textContent: String(entry.ddd) }),
      el('span', { className: 'code-state', textContent: `${entry.estado} (${entry.uf})` }),
      el('span', { className: 'muted', textContent: entry.regiao }),
    ]),
    el('p', { className: 'code-cities', textContent: `Principais cidades: ${entry.cidades.join(', ')}.` }),
  ];
  if (entry.observacao) children.push(el('p', { className: 'code-note', textContent: entry.observacao }));
  return el('article', { className: 'code-card' }, children);
}

function search() {
  const text = searchInput.value.trim();
  if (!text) {
    searchResult.replaceChildren(message('Digite um DDD, uma cidade ou uma UF.'));
    return;
  }
  if (/^\(?\d+\)?$/.test(text)) {
    const entry = buscarDDD(text);
    searchResult.replaceChildren(entry ? codeCard(entry) : message(`O DDD ${text} não existe.`, 'error'));
    return;
  }
  const uf = siglaDaUF(text);
  if (uf) {
    searchResult.replaceChildren(...dddsPorUF(uf).map(codeCard));
    return;
  }
  if (text.length < 2) {
    searchResult.replaceChildren(message('Digite pelo menos duas letras do nome da cidade.'));
    return;
  }
  const cities = buscarCidade(text, { parcial: true });
  if (cities.length === 0) {
    searchResult.replaceChildren(message('Nenhuma cidade encontrada entre as principais cidades de cada DDD.', 'error'));
    return;
  }
  const items = cities.map((city) =>
    el('li', {}, [
      el('span', { textContent: `${city.cidade} (${city.uf})` }),
      el('span', { className: 'badge', textContent: `DDD ${city.ddd}` }),
    ]),
  );
  searchResult.replaceChildren(el('ul', { className: 'city-list' }, items));
}

function validatePhone() {
  const text = phoneInput.value;
  if (!text.trim()) {
    phoneResult.replaceChildren(message('Digite um número de telefone.'));
    return;
  }
  const r = validarTelefone(text);
  if (!r.valido) {
    phoneResult.replaceChildren(message(`Número inválido. ${r.motivo}`, 'error'));
    return;
  }
  const rows = [
    ['Tipo', KIND_NAMES[r.tipo]],
    ['Formatado', r.formatado, true],
  ];
  if (r.servico) rows.push(['Serviço', r.servico]);
  if (r.e164) rows.push(['E.164', r.e164, true]);
  if (r.ddd) {
    const entry = buscarDDD(r.ddd);
    rows.push(['DDD', `${entry.ddd} · ${entry.estado} (${entry.uf})`]);
  }
  const list = el(
    'dl',
    { className: 'details-list' },
    rows.flatMap(([label, value, monospace]) => [
      el('dt', { textContent: label }),
      el('dd', { textContent: value, className: monospace ? 'mono' : '' }),
    ]),
  );
  phoneResult.replaceChildren(message('Número válido.', 'ok'), list);
}

function buildTables() {
  const entries = listarDDDs();
  const blocks = REGIOES.flatMap((region) => {
    const inRegion = entries.filter((entry) => entry.regiao === region);
    const rows = inRegion.map((entry) =>
      el('tr', {}, [
        el('td', { textContent: String(entry.ddd) }),
        el('td', { textContent: entry.uf }),
        el('td', { textContent: entry.cidades.join(', ') + (entry.observacao ? ` (${entry.observacao})` : '') }),
      ]),
    );
    const head = el('thead', {}, [
      el('tr', {}, ['DDD', 'UF', 'Principais cidades'].map((title) => el('th', { scope: 'col', textContent: title }))),
    ]);
    return [
      el('h3', { className: 'region-title', textContent: `${region} (${inRegion.length} DDDs)` }),
      el('div', { className: 'table-scroll' }, [el('table', { className: 'codes-table' }, [head, el('tbody', {}, rows)])]),
    ];
  });
  allCodes.replaceChildren(...blocks);
}

searchInput.addEventListener('input', search);
phoneInput.addEventListener('input', validatePhone);

buildTables();
search();
validatePhone();
