/* Datasets fictícios do Cultiva+ (hortas comunitárias).
 * Casos de borda propositais:
 *  - _id 5 e 17: `responsaveis` é um array vazio
 *  - _id 13: campo `cultura` ausente
 *  - _id 14: campo `areaM2` ausente
 *  - _id 15: campo `ativo` ausente
 * Cada execução de query parte de uma cópia limpa deste objeto.
 */
window.DATASETS = {
  hortas: [
    { _id: 1, nome: "Horta do Bosque",   bairro: "Jardim Botânico" },
    { _id: 2, nome: "Horta Esperança",   bairro: "Vila Nova" },
    { _id: 3, nome: "Horta da Praça",    bairro: "Centro" },
    { _id: 4, nome: "Horta Solidária",   bairro: "Vila Nova" }
  ],
  canteiros: [
    { _id: 1,  nome: "Canteiro A1", horta: 1, areaM2: 12, cultura: "Tomate",     responsaveis: ["Ana", "Bruno"],          ativo: true },
    { _id: 2,  nome: "Canteiro A2", horta: 1, areaM2: 8,  cultura: "Alface",     responsaveis: ["Ana"],                   ativo: true },
    { _id: 3,  nome: "Canteiro A3", horta: 1, areaM2: 15, cultura: "Couve",      responsaveis: ["Carlos", "Diana"],       ativo: true },
    { _id: 4,  nome: "Canteiro B1", horta: 2, areaM2: 20, cultura: "Tomate",     responsaveis: ["Eva"],                   ativo: true },
    { _id: 5,  nome: "Canteiro B2", horta: 2, areaM2: 10, cultura: "Cenoura",    responsaveis: [],                        ativo: true },
    { _id: 6,  nome: "Canteiro B3", horta: 2, areaM2: 6,  cultura: "Manjericão", responsaveis: ["Bruno"],                 ativo: false },
    { _id: 7,  nome: "Canteiro C1", horta: 3, areaM2: 25, cultura: "Milho",      responsaveis: ["Fábio", "Gabi", "Hugo"], ativo: true },
    { _id: 8,  nome: "Canteiro C2", horta: 3, areaM2: 9,  cultura: "Alface",     responsaveis: ["Gabi"],                  ativo: true },
    { _id: 9,  nome: "Canteiro C3", horta: 3, areaM2: 14, cultura: "Rúcula",     responsaveis: ["Diana", "Fábio"],        ativo: false },
    { _id: 10, nome: "Canteiro D1", horta: 4, areaM2: 30, cultura: "Feijão",     responsaveis: ["Ana", "Hugo"],           ativo: true },
    { _id: 11, nome: "Canteiro D2", horta: 4, areaM2: 18, cultura: "Abóbora",    responsaveis: ["Carlos"],                ativo: true },
    { _id: 12, nome: "Canteiro D3", horta: 4, areaM2: 7,  cultura: "Salsinha",   responsaveis: ["Eva"],                   ativo: true },
    { _id: 13, nome: "Canteiro E1", horta: 1, areaM2: 11,                         responsaveis: ["Bruno"],                 ativo: true },
    { _id: 14, nome: "Canteiro E2", horta: 2,             cultura: "Pimentão",   responsaveis: ["Ana"],                   ativo: true },
    { _id: 15, nome: "Canteiro E3", horta: 3, areaM2: 16, cultura: "Tomate",     responsaveis: ["Hugo"] },
    { _id: 16, nome: "Canteiro F1", horta: 4, areaM2: 22, cultura: "Couve",      responsaveis: ["Diana", "Eva", "Ana"],   ativo: true },
    { _id: 17, nome: "Canteiro F2", horta: 1, areaM2: 5,  cultura: "Hortelã",    responsaveis: [],                        ativo: false },
    { _id: 18, nome: "Canteiro F3", horta: 2, areaM2: 13, cultura: "Cenoura",    responsaveis: ["Carlos", "Bruno"],       ativo: true }
  ]
};
