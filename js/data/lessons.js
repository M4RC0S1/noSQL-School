/* ============================================================
 * CONTEÚDO DO CURSO — edite apenas este arquivo para adicionar aulas.
 *
 * Aula:
 *   { id, title, minutes, theory:{ text, example, runnable? }, guided, challenge }
 *   - theory.text  : até ~120 palavras. Aceita `código` e **negrito**.
 *   - theory.example: comando de exemplo (runnable:false se o simulador não executa).
 *   - guided / challenge: exercício (ou null = "em construção"; a aula então só
 *     precisa ser marcada como lida). ids dos exercícios são gerados sozinhos.
 *   - simulado:true  → aula que libera ao atingir a nota mínima no Modo Simulado.
 *
 * Exercício de query (editor + execução em mingo):
 *   { type:'query', prompt, starter, solution, collection?, ordered?, requires?, hints:[d1,d2] }
 *   - solution   : código correto; o resultado esperado é calculado executando-o.
 *   - collection : coleção exibida quando a solução altera dados (padrão 'canteiros').
 *   - ordered    : true se a ORDEM do resultado importa (sort).
 *   - requires   : textos que a resposta precisa conter (ex.: ['$in']).
 *
 * Exercício de múltipla escolha:
 *   { type:'mcq', prompt, options:[...], answer:<índice>, explanation, hints? }
 *
 * Exercício "complete o comando" (checagem de texto):
 *   { type:'fill', prompt, template:'... {{0}} ... {{1}} ...', blanks:[[aceitas0],[aceitas1]],
 *     explanation, hints? }
 *
 * Dados de exemplo: js/data/datasets.js (coleções "canteiros" e "hortas").
 * ============================================================ */
window.COURSE = {
  config: {
    passRatio: 0.8,      // fração de aulas concluídas para liberar a semana seguinte
    dailyGoalMin: 10,    // meta diária de estudo (minutos)
    timerMin: 10,        // timer opcional de sessão
    simSize: 10,         // questões do simulado
    simMinutes: 20,      // tempo do simulado
    simPass: 0.7,        // nota mínima (fração) para concluir a aula de simulado final
    unlockAll: false     // true = libera todas as semanas (útil ao criar conteúdo)
  },

  weeks: [
    /* ======================= SEMANA 1 (completa) ======================= */
    {
      n: 1,
      title: 'Fundamentos e CRUD',
      summary: 'NoSQL vs relacional, BSON e as operações básicas.',
      lessons: [
        {
          id: 's1a1', title: 'NoSQL vs relacional e BSON', minutes: 10,
          theory: {
            text: 'Bancos **relacionais** guardam linhas em tabelas com esquema fixo e ligam dados por JOINs. Bancos **NoSQL** trocam parte disso por flexibilidade e escala horizontal. Os quatro tipos principais: **documento** (MongoDB), **chave-valor** (Redis), **colunar** (Cassandra) e **grafo** (Neo4j). No MongoDB, uma *linha* vira um **documento** e uma *tabela* vira uma **coleção**. Documentos ficam em **BSON**, um JSON binário que acrescenta tipos como `ObjectId`, `Date`, `Int32`, `Int64` e `Decimal128`. Todo documento tem um `_id` único.',
            example: 'db.hortas.find()'
          },
          guided: {
            type: 'query',
            prompt: 'Liste **todos** os documentos da coleção `hortas`.',
            starter: '// escreva sua query aqui\n',
            solution: 'db.hortas.find()',
            hints: ['Toda leitura começa com `db.<coleção>`.', 'Use `find()` sem argumentos para trazer tudo.']
          },
          challenge: {
            type: 'mcq',
            prompt: 'Quando você insere um documento **sem** informar o campo `_id`, que tipo de valor o MongoDB gera automaticamente?',
            options: ['Um inteiro auto incrementado', 'Um UUID em texto', 'Um ObjectId (BSON)', 'Um timestamp em milissegundos'],
            answer: 2,
            explanation: 'O driver/servidor gera um `ObjectId` de 12 bytes (timestamp + identificador da máquina/processo + contador), tipo próprio do BSON.',
            hints: ['É um tipo que existe no BSON mas não no JSON puro.', 'Seu nome começa com "Object".']
          }
        },
        {
          id: 's1a2', title: 'Inserir, buscar e projetar', minutes: 10,
          theory: {
            text: '`insertOne` adiciona um documento e `insertMany` recebe um array deles. Sem `_id`, o MongoDB cria um `ObjectId`. Para ler, use `find(filtro, projeção)`: o filtro `{ cultura: "Tomate" }` escolhe documentos e a projeção escolhe campos — `1` inclui e `0` exclui. O `_id` aparece por padrão; use `_id: 0` para ocultá-lo. Não misture inclusão e exclusão na mesma projeção (a única exceção é o `_id`).',
            example: 'db.canteiros.find({ cultura: "Tomate" }, { nome: 1, areaM2: 1, _id: 0 })'
          },
          guided: {
            type: 'query',
            prompt: 'Insira um novo canteiro com `_id: 19`, nome `"Canteiro G1"`, horta `1`, `areaM2` `10`, cultura `"Beterraba"`, responsáveis `["Ana"]` e `ativo: true`.',
            collection: 'canteiros',
            starter: 'db.canteiros.',
            solution: 'db.canteiros.insertOne({ _id: 19, nome: "Canteiro G1", horta: 1, areaM2: 10, cultura: "Beterraba", responsaveis: ["Ana"], ativo: true })',
            hints: ['Use `insertOne` passando um único objeto.', 'Os nomes dos campos são os mesmos do dataset (veja o botão Dataset).']
          },
          challenge: {
            type: 'query',
            prompt: 'Mostre apenas `nome` e `cultura` (sem `_id`) dos canteiros cuja cultura é `"Alface"`.',
            starter: '',
            solution: 'db.canteiros.find({ cultura: "Alface" }, { nome: 1, cultura: 1, _id: 0 })',
            hints: ['O segundo argumento do `find` é a projeção.', 'Projeção: `{ nome: 1, cultura: 1, _id: 0 }`.']
          }
        },
        {
          id: 's1a3', title: 'sort, limit e comparações', minutes: 10,
          theory: {
            text: '`sort({ campo: 1 })` ordena de forma crescente e `-1` de forma decrescente. `limit(n)` restringe a quantidade e `skip(n)` pula documentos (paginação). Operadores de comparação ficam dentro de um objeto: `$gt` (>), `$gte` (≥), `$lt` (<), `$lte` (≤). Combine-os no mesmo campo para criar uma faixa: `{ areaM2: { $gte: 5, $lte: 10 } }`. Não importa a ordem do encadeamento: o MongoDB aplica sort, depois skip, depois limit.',
            example: 'db.canteiros.find({ areaM2: { $gt: 15 } }).sort({ areaM2: -1 }).limit(3)'
          },
          guided: {
            type: 'query',
            prompt: 'Liste os canteiros com `areaM2` **maior que 20**, do maior para o menor.',
            starter: '',
            solution: 'db.canteiros.find({ areaM2: { $gt: 20 } }).sort({ areaM2: -1 })',
            ordered: true,
            requires: ['$gt'],
            hints: ['O filtro é `{ areaM2: { $gt: 20 } }`.', 'Encadeie `.sort({ areaM2: -1 })`.']
          },
          challenge: {
            type: 'query',
            prompt: 'Mostre `nome` e `areaM2` (sem `_id`) dos **3 menores** canteiros com área **entre 5 e 10 m²** (inclusive), do menor para o maior.',
            starter: '',
            solution: 'db.canteiros.find({ areaM2: { $gte: 5, $lte: 10 } }, { nome: 1, areaM2: 1, _id: 0 }).sort({ areaM2: 1 }).limit(3)',
            ordered: true,
            requires: ['$gte', '$lte', 'limit'],
            hints: ['Dois operadores no mesmo campo: `{ areaM2: { $gte: 5, $lte: 10 } }`.', 'Falta `sort` crescente e `limit(3)`; a projeção é o 2º argumento do `find`.']
          }
        },
        {
          id: 's1a4', title: '$in, $ne, $and e $or', minutes: 10,
          theory: {
            text: '`$in` testa se o valor está em uma lista (`$nin` é o oposto). `$ne` significa "diferente de" — e **inclui documentos que nem têm o campo**! `$and` e `$or` recebem um array de condições. Vários campos no mesmo filtro já funcionam como **AND implícito**; use `$or` quando basta uma condição ser verdadeira. Cuidado com campos ausentes (como `ativo` no canteiro 15): eles casam com `$ne`, mas não com `{ ativo: false }`.',
            example: 'db.canteiros.find({ $or: [{ cultura: "Tomate" }, { areaM2: { $gt: 25 } }] })'
          },
          guided: {
            type: 'query',
            prompt: 'Liste os canteiros cuja cultura seja **Alface ou Couve**, usando `$in`.',
            starter: '',
            solution: 'db.canteiros.find({ cultura: { $in: ["Alface", "Couve"] } })',
            requires: ['$in'],
            hints: ['`$in` recebe um array de valores aceitos.', '`{ cultura: { $in: ["Alface", "Couve"] } }`.']
          },
          challenge: {
            type: 'query',
            prompt: 'Liste `nome` e `ativo` dos canteiros das hortas **2 ou 4** cujo `ativo` seja **diferente de false** (use `$ne`).',
            starter: '',
            solution: 'db.canteiros.find({ horta: { $in: [2, 4] }, ativo: { $ne: false } }, { nome: 1, ativo: 1 })',
            requires: ['$ne'],
            hints: ['Dois campos no mesmo filtro = AND implícito. Para "horta 2 ou 4" use `$in` (ou `$or`).', 'Filtro: `{ horta: { $in: [2, 4] }, ativo: { $ne: false } }`; projeção: `{ nome: 1, ativo: 1 }` (o `_id` vem por padrão).']
          }
        },
        {
          id: 's1a5', title: 'Atualizar e apagar', minutes: 10,
          theory: {
            text: '`updateOne` altera o primeiro documento que casa; `updateMany` altera todos. O segundo argumento usa operadores: `$set` define ou cria um campo, `$inc` soma (aceita negativos) e `$unset` remove o campo. Sem operador, a atualização é inválida. `deleteOne` e `deleteMany` removem documentos; `deleteMany({})` esvazia a coleção. Teste o filtro com `find` antes de atualizar ou apagar. Aqui, cada execução parte do dataset original.',
            example: 'db.canteiros.updateOne({ _id: 1 }, { $set: { ativo: false } })'
          },
          guided: {
            type: 'query',
            prompt: 'Some **5** à `areaM2` de **todos** os canteiros da horta `1`, usando `$inc`.',
            collection: 'canteiros',
            starter: '',
            solution: 'db.canteiros.updateMany({ horta: 1 }, { $inc: { areaM2: 5 } })',
            requires: ['$inc', 'updateMany'],
            hints: ['Vários documentos → `updateMany(filtro, atualização)`.', '`{ $inc: { areaM2: 5 } }` com filtro `{ horta: 1 }`.']
          },
          challenge: {
            type: 'query',
            prompt: 'Em **duas operações**: (1) remova o campo `cultura` do canteiro `_id: 7` com `$unset`; (2) apague **todos** os canteiros com `ativo: false`.',
            collection: 'canteiros',
            starter: '// duas linhas, uma operação em cada\n',
            solution: 'db.canteiros.updateOne({ _id: 7 }, { $unset: { cultura: "" } })\ndb.canteiros.deleteMany({ ativo: false })',
            requires: ['$unset', 'deleteMany'],
            hints: ['Escreva cada operação em sua própria linha.', '`updateOne({ _id: 7 }, { $unset: { cultura: "" } })` e depois `deleteMany({ ativo: false })`.']
          }
        }
      ]
    },

    /* ======================= SEMANA 2 ======================= */
    {
      n: 2,
      title: 'Arrays, regex e validação',
      summary: 'Consultas e atualizações em arrays, $regex, $exists e $jsonSchema.',
      lessons: [
        {
          id: 's2a1', title: 'Consultando arrays', minutes: 10,
          theory: {
            text: 'Campos podem ser arrays. `{ responsaveis: "Ana" }` encontra qualquer array que **contenha** Ana. `$all` exige todos os valores listados, em qualquer ordem; `$size` compara o tamanho **exato** do array (não aceita `$gt`); `$elemMatch` aplica várias condições ao **mesmo elemento** — útil em arrays de subdocumentos. Um array vazio (`[]`) tem `$size: 0` e não casa com nenhum valor.',
            example: 'db.canteiros.find({ responsaveis: { $all: ["Ana", "Hugo"] } })'
          },
          guided: {
            type: 'query',
            prompt: 'Liste os canteiros com **exatamente 3** responsáveis.',
            starter: '',
            solution: 'db.canteiros.find({ responsaveis: { $size: 3 } })',
            requires: ['$size'],
            hints: ['Use `$size` dentro do campo `responsaveis`.', '`{ responsaveis: { $size: 3 } }`.']
          },
          challenge: {
            type: 'query',
            prompt: 'Mostre `nome` e `responsaveis` (sem `_id`) dos canteiros em que **Ana e Diana** são responsáveis ao mesmo tempo.',
            starter: '',
            solution: 'db.canteiros.find({ responsaveis: { $all: ["Ana", "Diana"] } }, { nome: 1, responsaveis: 1, _id: 0 })',
            requires: ['$all'],
            hints: ['"Contém todos" → `$all`.', '`{ responsaveis: { $all: ["Ana", "Diana"] } }` + projeção.']
          }
        },
        {
          id: 's2a2', title: '$push, $pull e $addToSet', minutes: 10,
          theory: {
            text: '`$push` adiciona ao fim do array (permite duplicatas); `$addToSet` adiciona só se o valor ainda não existir; `$pull` remove todos os elementos que casam com a condição; `$pop` remove o primeiro (`-1`) ou o último (`1`). Com `$each` você adiciona vários valores de uma vez: `{ $push: { responsaveis: { $each: ["Ivo", "Lia"] } } }`.',
            example: 'db.canteiros.updateOne({ _id: 2 }, { $addToSet: { responsaveis: "Bruno" } })'
          },
          guided: null,     // TODO: atividade guiada (ex.: $push em _id 5)
          challenge: null   // TODO: desafio (ex.: $pull de "Eva" em todos os canteiros)
        },
        {
          id: 's2a3', title: '$regex e $exists', minutes: 10,
          theory: {
            text: '`$regex` filtra textos por expressão regular: `{ nome: { $regex: /^Canteiro A/ } }` (opção `i` ignora maiúsculas). `$exists: true` casa com documentos que **têm** o campo (mesmo `null`) e `$exists: false` com os que **não têm**. Lembre: campo ausente ≠ `null`. No dataset, `cultura` está ausente no canteiro 13 e `areaM2` no 14.',
            example: 'db.canteiros.find({ cultura: { $exists: false } })'
          },
          guided: null,
          challenge: null
        },
        {
          id: 's2a4', title: 'createCollection com $jsonSchema', minutes: 10,
          theory: {
            text: '`createCollection` cria uma coleção explicitamente e aceita um `validator`. Com `$jsonSchema` descrevemos o formato esperado: `bsonType`, `required`, `properties` e restrições como `minimum`. Escritas que violam o esquema são rejeitadas (ou apenas avisadas, conforme `validationAction`). O simulador não executa `createCollection`: aqui a prática é por texto.',
            example: 'db.createCollection("hortas", {\n  validator: { $jsonSchema: {\n    bsonType: "object",\n    required: ["nome", "bairro"],\n    properties: { nome: { bsonType: "string" } }\n  } }\n})',
            runnable: false
          },
          guided: {
            type: 'fill',
            prompt: 'Complete o comando: o documento deve ser um **objeto** e o campo **nome** é obrigatório.',
            template: 'db.createCollection("hortas", {\n  validator: { $jsonSchema: {\n    bsonType: "{{0}}",\n    required: ["{{1}}"]\n  } }\n})',
            blanks: [['object'], ['nome']],
            explanation: '`bsonType: "object"` descreve o documento inteiro e `required` lista os campos obrigatórios.',
            hints: ['O documento é do tipo BSON "object".', 'O campo obrigatório é `nome`.']
          },
          challenge: {
            type: 'mcq',
            prompt: 'Qual `validationAction` faz o MongoDB **apenas registrar um aviso** no log, sem rejeitar a escrita inválida?',
            options: ['error', 'warn', 'ignore', 'strict'],
            answer: 1,
            explanation: '`validationAction: "warn"` grava o aviso e deixa a escrita passar; `"error"` (padrão) rejeita.',
            hints: ['Existem só dois valores válidos: `error` e …', 'O nome lembra "warning".']
          }
        },
        {
          id: 's2a5', title: 'collMod, validationLevel e validationAction', minutes: 10,
          theory: {
            text: '`collMod` altera uma coleção existente, por exemplo trocando o `validator`. `validationLevel` define **quais** documentos são validados: `strict` (padrão) valida todos os inserts e updates; `moderate` só valida updates de documentos que já estavam válidos. `validationAction` define **o que fazer** ao falhar: `error` rejeita, `warn` só avisa.',
            example: 'db.runCommand({\n  collMod: "canteiros",\n  validator: { $jsonSchema: { required: ["nome"] } },\n  validationLevel: "moderate",\n  validationAction: "warn"\n})',
            runnable: false
          },
          guided: null,
          challenge: null
        }
      ]
    },

    /* ======================= SEMANA 3 ======================= */
    {
      n: 3,
      title: 'Aggregation Framework',
      summary: 'Pipelines: $match, $group, $unwind, $lookup e expressões condicionais.',
      lessons: [
        {
          id: 's3a1', title: '$match, $project e $sort', minutes: 10,
          theory: {
            text: 'O `aggregate` recebe um **pipeline**: uma lista de estágios em que a saída de um é a entrada do próximo. `$match` filtra (use cedo!), `$project` escolhe/calcula campos e `$sort` ordena. A sintaxe de `$match` é a mesma do `find`.',
            example: 'db.canteiros.aggregate([\n  { $match: { ativo: true } },\n  { $project: { nome: 1, areaM2: 1, _id: 0 } },\n  { $sort: { areaM2: -1 } }\n])'
          },
          guided: null,
          challenge: null
        },
        {
          id: 's3a2', title: '$group e acumuladores', minutes: 10,
          theory: {
            text: '`$group` agrupa documentos por `_id` (a chave do grupo) e calcula acumuladores: `$sum`, `$avg`, `$max`, `$min`. Referencie campos com `"$campo"`. Use `_id: null` para agrupar tudo em um só grupo. `{ $sum: 1 }` conta documentos.',
            example: 'db.canteiros.aggregate([\n  { $group: { _id: "$horta", total: { $sum: 1 }, areaMedia: { $avg: "$areaM2" }, maior: { $max: "$areaM2" } } }\n])'
          },
          guided: null,
          challenge: null
        },
        {
          id: 's3a3', title: '$cond e $switch', minutes: 10,
          theory: {
            text: '`$cond` funciona como um if/else: `{ $cond: [condição, seVerdadeiro, seFalso] }`. `$switch` trata vários casos com `branches` (`case` + `then`) e um `default`. Ambos são **expressões**, usadas dentro de `$project`, `$addFields` ou `$group`.',
            example: 'db.canteiros.aggregate([\n  { $project: { nome: 1, porte: { $cond: [{ $gte: ["$areaM2", 15] }, "grande", "pequeno"] } } }\n])'
          },
          guided: null,
          challenge: null
        },
        {
          id: 's3a4', title: '$unwind', minutes: 10,
          theory: {
            text: '`$unwind` "desmonta" um array: gera um documento para cada elemento, repetindo os demais campos. Documentos com array **vazio** ou ausente **somem** do resultado (a menos que use `preserveNullAndEmptyArrays: true`). É a base para contar ou agrupar por elemento de array.',
            example: 'db.canteiros.aggregate([\n  { $unwind: "$responsaveis" },\n  { $group: { _id: "$responsaveis", canteiros: { $sum: 1 } } }\n])'
          },
          guided: null,
          challenge: null
        },
        {
          id: 's3a5', title: '$lookup (join)', minutes: 10,
          theory: {
            text: '`$lookup` faz um **left outer join** com outra coleção: `from`, `localField`, `foreignField` e `as` (campo que receberá o array de documentos encontrados). Depois, `$unwind` costuma transformar esse array em um único subdocumento.',
            example: 'db.canteiros.aggregate([\n  { $lookup: { from: "hortas", localField: "horta", foreignField: "_id", as: "hortaInfo" } },\n  { $unwind: "$hortaInfo" },\n  { $project: { nome: 1, "hortaInfo.nome": 1 } }\n])'
          },
          guided: null,
          challenge: null
        }
      ]
    },

    /* ======================= SEMANA 4 ======================= */
    {
      n: 4,
      title: 'Modelagem, desempenho e teoria',
      summary: 'Embutir vs referenciar, índices, CAP, BASE, replicação, sharding e simulado final.',
      lessons: [
        {
          id: 's4a1', title: 'Modelagem: embutir vs referenciar', minutes: 10,
          theory: {
            text: '**Embutir** (subdocumentos/arrays) traz tudo numa leitura só — bom para dados que são lidos juntos e têm relação 1:poucos. **Referenciar** (guardar o `_id` de outro documento, como `horta` em `canteiros`) evita duplicação e documentos gigantes (limite de 16 MB) — bom para 1:muitos e muitos:muitos, ao custo de `$lookup` ou de uma segunda consulta.',
            example: '// embutido\n{ nome: "Horta do Bosque", canteiros: [{ nome: "A1" }, { nome: "A2" }] }\n// referenciado\n{ nome: "Canteiro A1", horta: 1 }',
            runnable: false
          },
          guided: null,
          challenge: null
        },
        {
          id: 's4a2', title: 'Índices e explain', minutes: 10,
          theory: {
            text: 'Sem índice, o MongoDB faz um **COLLSCAN** (lê a coleção inteira). Um índice cria uma estrutura ordenada (B-tree) que permite **IXSCAN**. `createIndex({ cultura: 1 })` cria um índice ascendente; índices compostos obedecem à ordem dos campos. `explain("executionStats")` mostra o plano usado, documentos examinados e retornados. Índices aceleram leituras, mas custam espaço e escrita.',
            example: 'db.canteiros.createIndex({ cultura: 1 })\ndb.canteiros.find({ cultura: "Tomate" }).explain("executionStats")',
            runnable: false
          },
          guided: null,
          challenge: null
        },
        {
          id: 's4a3', title: 'CAP, BASE e ACID', minutes: 10,
          theory: {
            text: 'O teorema **CAP** diz que, numa partição de rede, um sistema distribuído escolhe entre **Consistência** e **Disponibilidade** (C ou A; P é inevitável). **ACID** (Atomicidade, Consistência, Isolamento, Durabilidade) é típico de bancos relacionais; **BASE** (*Basically Available*, *Soft state*, *Eventually consistent*) descreve sistemas que privilegiam disponibilidade e consistência eventual. O MongoDB, por padrão, é CP e oferece transações ACID multi-documento.',
            runnable: false
          },
          guided: {
            type: 'mcq',
            prompt: 'Em uma **partição de rede**, um sistema classificado como **CP** prioriza o quê?',
            options: ['Disponibilidade, mesmo com dados divergentes', 'Consistência, podendo recusar requisições', 'Latência mínima', 'Escalabilidade vertical'],
            answer: 1,
            explanation: 'CP = Consistência + tolerância a Partição: prefere recusar/esperar a devolver dados inconsistentes.',
            hints: ['O "C" de CP é de qual propriedade?']
          },
          challenge: {
            type: 'mcq',
            prompt: 'O que significa o "**BA**" de **BASE**?',
            options: ['Backup Automático', 'Basically Available', 'Big Atomicity', 'Balanced Architecture'],
            answer: 1,
            explanation: '*Basically Available*: o sistema responde mesmo diante de falhas parciais; o "S" é Soft state e o "E" é Eventual consistency.',
            hints: ['É uma expressão em inglês com a ideia de disponibilidade.', 'Começa com "Basically".']
          }
        },
        {
          id: 's4a4', title: 'Replicação e sharding', minutes: 10,
          theory: {
            text: '**Replica set**: um nó *primary* recebe as escritas e replica para os *secondaries*; se o primary cai, ocorre uma eleição. Dá alta disponibilidade e leitura escalável. **Sharding** divide os dados entre vários servidores (shards) por uma **shard key**, escalando **horizontalmente**; o `mongos` roteia as consultas. Uma boa shard key tem alta cardinalidade e distribui a carga.',
            runnable: false
          },
          guided: null,
          challenge: null
        },
        {
          id: 's4a5', title: 'Simulado final', minutes: 20,
          simulado: true,
          theory: {
            text: 'Hora de testar tudo: o **Modo Simulado** sorteia 10 questões das semanas liberadas, cronometradas e **sem dicas**. Você recebe a nota ao final, com a lista dos erros e os gabaritos. Esta aula é concluída com nota **≥ 70%**.',
            runnable: false
          },
          guided: null,
          challenge: null
        }
      ]
    }
  ]
};
