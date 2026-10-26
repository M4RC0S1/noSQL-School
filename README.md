# noSQL School

Trilha de 4 semanas para aprender MongoDB, 100% no navegador (HTML/CSS/JS puro, sem backend).
As queries são executadas com [mingo](https://github.com/kofrasa/mingo) sobre datasets fictícios (Cultiva+).

## Como abrir

Abra `index.html` direto no navegador, ou sirva a pasta (ex.: `npx serve`, `python -m http.server`).
O progresso fica no `localStorage`.

## Estrutura

| Arquivo | Função |
|---|---|
| `js/data/lessons.js` | **Todo o conteúdo** (aulas, teoria, exercícios). Veja o guia no topo do arquivo. |
| `js/data/datasets.js` | Coleções `canteiros` e `hortas` (com casos de borda). |
| `js/engine.js` | Emulação do mongosh: find/sort/limit, insert/update/delete, aggregate, correção. |
| `js/store.js` | Progresso, streak e tempo de estudo. |
| `js/app.js` | Interface: painel, aulas, revisão, simulado, dataset, timer. |
| `vendor/mingo.min.js` | mingo 6.4.15 (bundle com todos os operadores, exposto como `window.mingo`). |

## Adicionando conteúdo

Em `lessons.js`, troque `guided: null` / `challenge: null` por um exercício:

```js
{ type: 'query', prompt: 'Conte os canteiros ativos.', solution: 'db.canteiros.countDocuments({ ativo: true })' }
{ type: 'mcq',   prompt: '...', options: ['a', 'b'], answer: 1, explanation: '...' }
{ type: 'fill',  prompt: '...', template: 'db.x.find({ a: { {{0}}: 1 } })', blanks: [['$gt']] }
```

O resultado esperado das queries é calculado executando `solution`, então não é preciso digitá-lo.
Use `unlockAll: true` em `config` para liberar todas as semanas enquanto cria aulas.

## Regras

- Semana seguinte libera com ≥ 80% das aulas da atual concluídas (aula = guiada + desafio corretos).
- Desafio: até 2 dicas; gabarito após 2 tentativas erradas (a questão volta na revisão e só conta ao acertar).
- Meta: 10 min/dia de tempo ativo; streak conta dias com ≥ 1 min.
- Simulado: 10 questões das semanas liberadas, 20 min, sem dicas.
