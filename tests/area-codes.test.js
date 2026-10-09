import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarDDD,
  listarDDDs,
  dddsPorUF,
  listarUFs,
  siglaDaUF,
  buscarCidade,
  validarTelefone,
  formatarTelefone,
  normalizarTexto,
  REGIOES,
  SERVICOS,
} from '../src/index.js';

const EXPECTED_AREA_CODES = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
];

const EXPECTED_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

describe('dados', () => {
  const all = listarDDDs();

  test('são 67 DDDs, sem repetição e em ordem', () => {
    assert.equal(all.length, 67);
    assert.deepEqual(
      all.map((entry) => entry.ddd),
      EXPECTED_AREA_CODES,
    );
    assert.equal(new Set(all.map((entry) => entry.ddd)).size, 67);
  });

  test('todas as 27 UFs aparecem', () => {
    assert.deepEqual([...new Set(all.map((entry) => entry.uf))].sort(), EXPECTED_STATES);
  });

  test('cada DDD tem UF, estado, região válida e ao menos uma cidade', () => {
    for (const entry of all) {
      assert.ok(entry.cidades.length >= 1, `DDD ${entry.ddd} sem cidades`);
      assert.ok(REGIOES.includes(entry.regiao), `região inválida no DDD ${entry.ddd}`);
      assert.equal(typeof entry.estado, 'string');
      assert.equal(new Set(entry.cidades).size, entry.cidades.length, `cidade repetida no DDD ${entry.ddd}`);
    }
  });

  test('nenhuma cidade aparece em dois DDDs da mesma UF', () => {
    const seen = new Map();
    for (const entry of all) {
      for (const city of entry.cidades) {
        const key = `${city}/${entry.uf}`;
        assert.ok(!seen.has(key), `${key} aparece nos DDDs ${seen.get(key)} e ${entry.ddd}`);
        seen.set(key, entry.ddd);
      }
    }
  });

  test('UFs por DDD conferem com a tabela', () => {
    const expected = {
      SP: [11, 12, 13, 14, 15, 16, 17, 18, 19],
      RJ: [21, 22, 24],
      ES: [27, 28],
      MG: [31, 32, 33, 34, 35, 37, 38],
      PR: [41, 42, 43, 44, 45, 46],
      SC: [47, 48, 49],
      RS: [51, 53, 54, 55],
      DF: [61],
      GO: [62, 64],
      TO: [63],
      MT: [65, 66],
      MS: [67],
      AC: [68],
      RO: [69],
      BA: [71, 73, 74, 75, 77],
      SE: [79],
      PE: [81, 87],
      AL: [82],
      PB: [83],
      RN: [84],
      CE: [85, 88],
      PI: [86, 89],
      PA: [91, 93, 94],
      AM: [92, 97],
      RR: [95],
      AP: [96],
      MA: [98, 99],
    };
    for (const [uf, codes] of Object.entries(expected)) {
      assert.deepEqual(
        dddsPorUF(uf).map((entry) => entry.ddd),
        codes,
        uf,
      );
    }
  });

  test('regiões', () => {
    const byRegion = (region) => listarUFs().filter((state) => state.regiao === region).map((state) => state.uf).sort();
    assert.deepEqual(byRegion('Norte'), ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO']);
    assert.deepEqual(byRegion('Nordeste'), ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']);
    assert.deepEqual(byRegion('Centro-Oeste'), ['DF', 'GO', 'MS', 'MT']);
    assert.deepEqual(byRegion('Sudeste'), ['ES', 'MG', 'RJ', 'SP']);
    assert.deepEqual(byRegion('Sul'), ['PR', 'RS', 'SC']);
  });

  test('os dados não podem ser alterados', () => {
    const entry = buscarDDD(19);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.cidades));
    assert.throws(() => entry.cidades.push('Outra'), TypeError);
  });
});

describe('buscarDDD', () => {
  test('DDD 19', () => {
    assert.deepEqual(buscarDDD(19), {
      ddd: 19,
      uf: 'SP',
      estado: 'São Paulo',
      regiao: 'Sudeste',
      cidades: ['Campinas', 'Piracicaba', 'Limeira', 'Americana', 'Rio Claro', 'Sumaré'],
      observacao: null,
    });
  });
  test('DDD 61 também atende o Entorno', () => {
    const entry = buscarDDD(61);
    assert.equal(entry.uf, 'DF');
    assert.deepEqual(entry.cidades, ['Brasília']);
    assert.match(entry.observacao, /Luziânia, Formosa e Valparaíso de Goiás/);
  });
  test('aceita texto', () => {
    assert.equal(buscarDDD('19').ddd, 19);
    assert.equal(buscarDDD('(19)').ddd, 19);
    assert.equal(buscarDDD(' 019 ').ddd, 19);
  });
  test('inexistentes', () => {
    for (const code of [10, 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 60, 70, 72, 76, 78, 80, 90, 0, 1, 100, '1', '', 'abc']) {
      assert.equal(buscarDDD(code), null, String(code));
    }
    assert.equal(buscarDDD(null), null);
    assert.equal(buscarDDD({}), null);
  });
});

describe('dddsPorUF e siglaDaUF', () => {
  test('sigla ou nome, sem diferenciar acentos e caixa', () => {
    for (const uf of ['SP', 'sp', ' Sp ', 'São Paulo', 'sao paulo', 'SÃO PAULO']) {
      assert.equal(dddsPorUF(uf).length, 9, uf);
    }
    assert.deepEqual(
      dddsPorUF('Rio Grande do Sul').map((entry) => entry.ddd),
      [51, 53, 54, 55],
    );
    assert.equal(siglaDaUF('espirito santo'), 'ES');
    assert.equal(siglaDaUF('Piauí'), 'PI');
  });
  test('UF desconhecida', () => {
    assert.deepEqual(dddsPorUF('XX'), []);
    assert.deepEqual(dddsPorUF(''), []);
    assert.deepEqual(dddsPorUF(35), []);
    assert.equal(siglaDaUF('Guanabara'), null);
  });
  test('listarUFs', () => {
    const states = listarUFs();
    assert.equal(states.length, 27);
    assert.deepEqual(
      states.find((state) => state.uf === 'BA'),
      { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', ddds: [71, 73, 74, 75, 77] },
    );
    assert.ok(states.every((state) => state.ddds.length > 0));
  });
});

describe('buscarCidade', () => {
  test('sem diferenciar acentos e maiúsculas', () => {
    const expected = [{ cidade: 'Limeira', uf: 'SP', estado: 'São Paulo', ddd: 19 }];
    assert.deepEqual(buscarCidade('limeira'), expected);
    assert.deepEqual(buscarCidade('  LIMEIRA '), expected);
    assert.equal(buscarCidade('sao paulo')[0].ddd, 11);
    assert.equal(buscarCidade('FLORIANOPOLIS')[0].ddd, 48);
    assert.equal(buscarCidade('sao joao del rei')[0].ddd, 32);
    assert.equal(buscarCidade('Ji Parana')[0].ddd, 69);
    assert.equal(buscarCidade('santo angelo')[0].ddd, 55);
  });
  test('cidades do Entorno atendidas pelo 61', () => {
    assert.deepEqual(buscarCidade('Luziânia'), [{ cidade: 'Luziânia', uf: 'GO', estado: 'Goiás', ddd: 61 }]);
    assert.equal(buscarCidade('formosa')[0].ddd, 61);
    assert.equal(buscarCidade('valparaiso de goias')[0].uf, 'GO');
  });
  test('nome exato por padrão', () => {
    assert.deepEqual(buscarCidade('Caxias'), [{ cidade: 'Caxias', uf: 'MA', estado: 'Maranhão', ddd: 99 }]);
    assert.deepEqual(buscarCidade('São José'), [{ cidade: 'São José', uf: 'SC', estado: 'Santa Catarina', ddd: 48 }]);
  });
  test('busca parcial com o nome exato primeiro', () => {
    const r = buscarCidade('caxias', { parcial: true });
    assert.deepEqual(
      r.map((item) => `${item.cidade}/${item.ddd}`),
      ['Caxias/99', 'Caxias do Sul/54', 'Duque de Caxias/21'],
    );
    assert.equal(buscarCidade('sao jose', { parcial: true }).length, 5);
  });
  test('sem resultado', () => {
    assert.deepEqual(buscarCidade('Cidade Exemplo'), []);
    assert.deepEqual(buscarCidade(''), []);
    assert.deepEqual(buscarCidade(null), []);
    assert.deepEqual(buscarCidade('lime'), []);
  });
});

describe('validarTelefone', () => {
  const validCases = [
    ['(19) 99999-9999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['19999999999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['+55 (19) 99999-9999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['+5519999999999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['55 19 99999 9999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['019 99999-9999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['(019) 99999.9999', 'celular', 19, '999999999', '(19) 99999-9999'],
    ['(11) 3456-7890', 'fixo', 11, '34567890', '(11) 3456-7890'],
    ['1123456789', 'fixo', 11, '23456789', '(11) 2345-6789'],
    ['+55 21 4567-8901', 'fixo', 21, '45678901', '(21) 4567-8901'],
    ['0 21 5678-9012', 'fixo', 21, '56789012', '(21) 5678-9012'],
    ['55 55 3333-4444', 'fixo', 55, '33334444', '(55) 3333-4444'],
    ['(55) 99999-0000', 'celular', 55, '999990000', '(55) 99999-0000'],
    ['(99) 3521-0000', 'fixo', 99, '35210000', '(99) 3521-0000'],
  ];
  for (const [input, kind, ddd, number, formatted] of validCases) {
    test(`válido: ${input}`, () => {
      const r = validarTelefone(input);
      assert.equal(r.valido, true, r.motivo);
      assert.equal(r.tipo, kind);
      assert.equal(r.ddd, ddd);
      assert.equal(r.numero, number);
      assert.equal(r.formatado, formatted);
      assert.equal(r.e164, `+55${ddd}${number}`);
      assert.equal(r.uf, buscarDDD(ddd).uf);
      assert.equal(r.motivo, null);
    });
  }

  test('aceita number', () => {
    assert.equal(validarTelefone(19999999999).tipo, 'celular');
  });

  test('não geográficos', () => {
    for (const prefix of ['0800', '0300', '0303', '0500', '0900']) {
      const r = validarTelefone(`${prefix} 123 4567`);
      assert.equal(r.valido, true, prefix);
      assert.equal(r.tipo, 'nao-geografico');
      assert.equal(r.formatado, `${prefix} 123 4567`);
      assert.equal(r.numero, `${prefix}1234567`);
      assert.equal(r.ddd, null);
      assert.equal(r.e164, null);
    }
    assert.equal(validarTelefone('0800-123-4567').formatado, '0800 123 4567');
    assert.equal(validarTelefone('08001234567').valido, true);
    assert.equal(validarTelefone('0800 123 456').valido, false);
    assert.equal(validarTelefone('0700 123 4567').valido, false);
  });

  test('serviços de utilidade pública', () => {
    const expected = {
      190: 'Polícia Militar',
      191: 'Polícia Rodoviária Federal',
      192: 'SAMU',
      193: 'Corpo de Bombeiros',
      197: 'Polícia Civil',
      199: 'Defesa Civil',
      100: 'Disque Direitos Humanos',
      180: 'Central de Atendimento à Mulher',
      188: 'CVV',
    };
    assert.deepEqual({ ...SERVICOS }, expected);
    for (const [number, name] of Object.entries(expected)) {
      const r = validarTelefone(number);
      assert.equal(r.valido, true);
      assert.equal(r.tipo, 'servico');
      assert.equal(r.servico, name);
      assert.equal(r.formatado, number);
      assert.equal(r.ddd, null);
    }
    const unknown = validarTelefone('194');
    assert.equal(unknown.valido, false);
    assert.match(unknown.motivo, /194 não está entre os serviços/);
  });

  const invalidCases = [
    ['', /Informe um número/],
    ['   ', /Informe um número/],
    ['()-', /Informe um número/],
    ['abc', /caracteres inválidos/],
    ['(19) 9999-ABCD', /caracteres inválidos/],
    ['3456-7890', /Faltou o DDD/],
    ['99999-9999', /Faltou o DDD/],
    ['(23) 99999-9999', /DDD 23 não existe/],
    ['(10) 3456-7890', /DDD 10 não existe/],
    ['(19) 89999-9999', /9 dígitos são de celular e começam com 9/],
    ['(19) 9999-9999', /acrescente o 9/],
    ['(19) 6999-9999', /acrescente o 9/],
    ['(19) 1999-9999', /começam com 2, 3, 4 ou 5/],
    ['(19) 0999-9999', /começam com 2, 3, 4 ou 5/],
    ['+1 555 123 4567', /Só números do Brasil/],
    ['+55 19 9999', /Depois do \+55/],
    ['123456', /Quantidade de dígitos inválida \(6\)/],
    ['(19) 99999-99999', /Quantidade de dígitos inválida/],
  ];
  for (const [input, reason] of invalidCases) {
    test(`inválido: ${JSON.stringify(input)}`, () => {
      const r = validarTelefone(input);
      assert.equal(r.valido, false);
      assert.equal(r.tipo, null);
      assert.equal(r.formatado, null);
      assert.match(r.motivo, reason);
    });
  }
  test('tipos inválidos', () => {
    for (const input of [null, undefined, {}, []]) {
      assert.match(validarTelefone(input).motivo, /como texto/);
    }
  });
});

describe('formatarTelefone', () => {
  test('formatos', () => {
    assert.equal(formatarTelefone('19999999999'), '(19) 99999-9999');
    assert.equal(formatarTelefone('1934567890', 'internacional'), '+55 19 3456-7890');
    assert.equal(formatarTelefone('(19) 99999-9999', 'internacional'), '+55 19 99999-9999');
    assert.equal(formatarTelefone('(19) 99999-9999', 'e164'), '+5519999999999');
    assert.equal(formatarTelefone('08001234567', 'internacional'), '0800 123 4567');
    assert.equal(formatarTelefone('08001234567', 'e164'), null);
    assert.equal(formatarTelefone('192'), '192');
  });
  test('inválido vira null', () => {
    assert.equal(formatarTelefone('123'), null);
  });
  test('formato desconhecido', () => {
    assert.throws(() => formatarTelefone('19999999999', 'americano'), TypeError);
  });
});

test('normalizarTexto', () => {
  assert.equal(normalizarTexto('  São João   del-Rei '), 'sao joao del rei');
  assert.equal(normalizarTexto('JI-PARANÁ'), 'ji parana');
});
