# DDD Brasil — consulte DDDs e valide telefones brasileiros (JavaScript • Node.js)

Biblioteca sem dependências com os 67 DDDs do Brasil (UF, estado, região e principais cidades) e um validador de telefones que entende celular, fixo, 0800 e números de serviço como 190 e 192. Serve para formulários de cadastro, limpeza de bases de contatos e qualquer sistema que precise saber de onde é um número. Acompanha uma linha de comando e uma página de demonstração.

**Demonstração online:** https://micdog22.github.io/ddd-brasil/

## Recursos

- Os 67 DDDs com UF, nome do estado, região e principais cidades.
- Consulta por DDD, por UF (sigla ou nome do estado) e por cidade, sem diferenciar acentos e maiúsculas.
- Validação de telefone: celular (9 dígitos, começando com 9), fixo (8 dígitos, começando com 2 a 5), não geográficos (0800, 0300, 0303, 0500, 0900) e serviços de utilidade pública.
- Aceita o número como a pessoa digita: com ou sem +55, com o 0 da operadora, parênteses, espaços e hífens.
- Formatação nacional "(19) 99999-9999", internacional "+55 19 99999-9999" e E.164 "+5519999999999".
- Mensagens de erro claras em português ("Faltou o DDD", "O DDD 23 não existe").
- CLI `ddd` com saída em JSON.

## Instalação

```bash
npm install github:micdog22/ddd-brasil
```

## Como usar

```js
import {
  buscarDDD, listarDDDs, dddsPorUF, listarUFs, buscarCidade,
  validarTelefone, formatarTelefone,
} from 'ddd-brasil';

buscarDDD(19);
// { ddd: 19, uf: 'SP', estado: 'São Paulo', regiao: 'Sudeste',
//   cidades: ['Campinas', 'Piracicaba', 'Limeira', 'Americana', 'Rio Claro', 'Sumaré'],
//   observacao: null }

listarDDDs().length;                // 67
dddsPorUF('SP').map((e) => e.ddd);  // [11, 12, 13, 14, 15, 16, 17, 18, 19]
dddsPorUF('Minas Gerais').length;   // 7

buscarCidade('limeira');
// [{ cidade: 'Limeira', uf: 'SP', estado: 'São Paulo', ddd: 19 }]
buscarCidade('caxias', { parcial: true }).map((c) => c.cidade);
// ['Caxias', 'Caxias do Sul', 'Duque de Caxias']

validarTelefone('+55 (19) 99999-9999');
// { valido: true, tipo: 'celular', ddd: 19, uf: 'SP', numero: '999999999',
//   e164: '+5519999999999', formatado: '(19) 99999-9999', servico: null, motivo: null }

validarTelefone('0800 123 4567').tipo;  // 'nao-geografico'
validarTelefone('192').servico;         // 'SAMU'
validarTelefone('(19) 9999-9999').motivo;
// 'Números de 8 dígitos começando com 6 a 9 não são fixos. Se for celular, acrescente o 9 na frente.'

formatarTelefone('1934567890');                   // '(19) 3456-7890'
formatarTelefone('1934567890', 'internacional');  // '+55 19 3456-7890'
formatarTelefone('1934567890', 'e164');           // '+551934567890'
```

`validarTelefone` sempre devolve o mesmo formato de objeto: `valido`, `tipo` (`'celular'`, `'fixo'`, `'nao-geografico'` ou `'servico'`), `ddd`, `uf`, `numero` (sem o DDD), `e164`, `formatado`, `servico` (nome do serviço) e `motivo` (por que é inválido). Campos que não se aplicam vêm como `null`. `formatarTelefone` devolve `null` para números inválidos.

`buscarCidade` procura entre as principais cidades de cada DDD (a lista não tem todos os municípios do país). Por padrão compara o nome inteiro; com `{ parcial: true }`, aceita parte do nome e traz o nome exato primeiro.

### Regras de validação

| Tipo | Regra | Exemplo formatado |
| --- | --- | --- |
| Celular | DDD + 9 dígitos começando com 9 | (19) 99999-9999 |
| Fixo | DDD + 8 dígitos começando com 2, 3, 4 ou 5 | (19) 3456-7890 |
| Não geográfico | 0800, 0300, 0303, 0500 ou 0900 + 7 dígitos | 0800 123 4567 |
| Serviço | 190, 191, 192, 193, 197, 199, 100, 180, 188 | 190 |

O código do país (+55 ou 55) é removido quando o número tem 12 ou 13 dígitos, e o 0 de longa distância também ("019 99999-9999").

Serviços reconhecidos: 190 Polícia Militar, 191 Polícia Rodoviária Federal, 192 SAMU, 193 Corpo de Bombeiros, 197 Polícia Civil, 199 Defesa Civil, 100 Disque Direitos Humanos, 180 Central de Atendimento à Mulher e 188 CVV.

### Linha de comando

```bash
npx ddd 19
# DDD 19 · São Paulo (SP) · Sudeste
# Principais cidades: Campinas, Piracicaba, Limeira, Americana, Rio Claro e Sumaré

npx ddd limeira
# Limeira (SP): DDD 19

npx ddd --uf SP
npx ddd --telefone "(19) 99999-9999"
# Telefone válido: celular
# Formatado: (19) 99999-9999
# E.164: +5519999999999
# DDD 19: São Paulo (SP)

npx ddd --todos --json
```

Opções: `--uf`, `--telefone`, `--todos`, `--json`, `--help` e `--version`. O código de saída é 0 quando a consulta encontra resultado (ou o telefone é válido), 1 quando não encontra (ou o telefone é inválido) e 2 em erro de uso.

## Como rodar localmente

```bash
node bin/ddd.js 19
```

Para abrir a página de demonstração, sirva a pasta do projeto e acesse http://localhost:8000 (módulos ES não carregam via `file://`):

```bash
python3 -m http.server 8000
```

## Testes

```bash
npm test
```

## Observações

- O DDD 61 é do Distrito Federal, mas também atende municípios do Entorno em Goiás, como Luziânia, Formosa e Valparaíso de Goiás. Por isso `dddsPorUF('GO')` traz só 62 e 64, e o DDD 61 tem uma observação explicando o caso.
- A validação confere o formato e o DDD. Ela não garante que o número esteja ativo ou pertença a alguém.

## Contribuindo

Issues e pull requests são bem-vindos.

## Licença

MIT — veja [LICENSE](LICENSE).
