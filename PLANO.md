# Plano de implementação — Jogo BTCA (fios de sutura e instrumentação)

## 0. Decisão de plataforma: Unity ou web?

**Recomendação: web nativa (React + TypeScript), não Unity.**

| Critério | Unity → WebGL | Web nativa (React) |
|---|---|---|
| iPad (Safari) | Build de 20–60 MB, limite de memória do Safari causa travamentos, teclado e toque são frágeis | Leve, carrega em segundos, toque e teclado nativos |
| Texto didático (fichas, explicações, termos clicáveis) | Texto é o ponto fraco do Unity (TextMeshPro, sem seleção, acessibilidade ruim) | Ponto forte: texto nítido, responsivo, com tooltips |
| Fotografias com zoom e recorte | Possível, mas trabalhoso | Simples (CSS e canvas) |
| Instalar no iPad e usar offline | Não | Sim, como PWA na tela inicial |
| Onde o "realismo" aparece | Em 3D, mas não há modelos 3D fiéis desses instrumentos | Em fotos reais, recortes ampliados e destaques visuais sobre a foto |

Neste jogo, realista quer dizer **fotografias reais, detalhes ampliados e conteúdo correto**. Não quer dizer cenas 3D. Modelos 3D genéricos de uma Kelly ou de uma Crile teriam detalhes errados, como a extensão das serrilhas, que é exatamente o que precisa ser aprendido. Fazer o jogo em Unity aumentaria o custo, pioraria a experiência no iPad e não traria ganho pedagógico.

O visual realista vem da direção de arte: fundo de campo cirúrgico verde, bandeja de inox, cartas como fichas de laboratório, animações suaves e sons discretos. Se depois surgirem modelos 3D fiéis, é possível incluir um visualizador 3D (Three.js / `<model-viewer>`) só no álbum, sem refazer nada.

## 1. Stack técnica

- **Vite + React + TypeScript**, um SPA estático
- **Zustand** com persistência em `localStorage` (progresso) e **IndexedDB** via `idb-keyval` (registro de erros, histórico)
- **Framer Motion** para virar cartas, transições e feedback
- **dnd-kit** para arrastar etiquetas (Monte a ficha) e, depois, para a Mesa cirúrgica
- **vite-plugin-pwa**: instalação no iPad, uso offline, ícone na tela inicial
- **Vitest** para testes de lógica e, principalmente, **testes de validação do conteúdo** (seção 9)
- Hospedagem estática gratuita (GitHub Pages, Netlify ou Vercel)

**Aviso importante sobre o iPad:** o Safari pode apagar o `localStorage` de sites não visitados há 7 dias. Por isso:
1. Orientar a instalação como PWA (Compartilhar → Adicionar à Tela de Início), que não sofre esse apagamento
2. Incluir **Exportar/Importar progresso** em um arquivo `.json`, que também permite passar o progresso do Mac para o iPad manualmente

### Estrutura de pastas

```
src/
  content/            ← dados (JSON tipado), nunca dentro dos componentes
    fios.json
    instrumentos.json
    termos.json        (capilaridade, memória, resistência tênsil, etc.)
    confusoes.json     (pares/grupos semelhantes + região de destaque)
    blocos.json        (campanha: ordem, itens, etapas)
    fontes.json        (referência de cada afirmação)
  engine/             ← lógica pura, testável, sem UI
    mastery.ts         (níveis de domínio)
    scheduler.ts       (revisão espaçada + reinserção de erros)
    whoami.ts          (motor de eliminação por pistas)
    mutations.ts       (geração de fichas adulteradas)
    questionGen.ts     (perguntas guiadas / desafio final)
  modes/              ← um diretório por modo de jogo
    discover/ memory/ buildCard/ whoAmI/ findError/ blockFinal/ compare/
  features/
    home/ campaign/ album/ errors/ review/ settings/
  ui/                 ← componentes visuais (Carta, Ficha, Etiqueta, FotoZoom, Termo)
public/img/
  fios/  instrumentos/  (inteira, detalhe-1, detalhe-2…, já recortadas)
scripts/
  extract-pdf.mjs      (extrai texto e imagens dos PDFs)
  validate-content.mjs
```

## 2. Modelo de dados

Todo atributo pode ter **valor, fonte e situação**. É isso que impede preencher a ficha com informação inventada.

```ts
type Fonte = { doc: "slides-fios" | "slides-instr" | "apostila-sutura" | "apostila-mesa"
              | "resumo" | "resumo-instr" | "roteiro" | "externa"; pagina?: number; nota?: string };

type Attr<T> = {
  valor: T;
  fontes: Fonte[];
  status: "confirmado" | "divergente" | "lacuna";   // lacuna → a UI mostra "não consta no material"
  divergencia?: string;                             // texto explicando a divergência
};

type Fio = {
  id: "vicryl"; nome: "Poliglactina 910"; comerciais: ["Vicryl"];
  origem: Attr<"natural" | "sintetico">;
  composicao: Attr<string>;
  absorcao: Attr<"absorvivel" | "inabsorvivel">;
  mecanismoAbsorcao?: Attr<"hidrolise" | "proteolise_fagocitose">;
  tempoAbsorcao?: Attr<string>;               // ex.: "56–70 dias"
  resistenciaTensil?: Attr<string>;           // ex.: "~50% em 3 semanas"
  estrutura: Attr<"mono" | "multi_trancado" | "multi_torcido" | "ambos">;
  reacaoTecidual: Attr<Nivel>;                 // Nivel = "minima"|"baixa"|"moderada"|"alta"
  capilaridade: Attr<Nivel>;
  memoria: Attr<Nivel>;
  manuseio: Attr<Nivel>;
  segurancaNo: Attr<Nivel>;
  indicacoes: Attr<string[]>;
  limitacoes: Attr<string[]>;
  diferencial: string;                         // "o que o separa dos semelhantes"
  confundeCom: string[];                       // ids
  imagens: Imagem[];
  prioridadeProva: 1 | 2 | 3;                  // vem da frequência no banco de provas
};

type Instrumento = {
  id: "kelly"; nome: "Pinça Kelly"; sinonimos: string[];
  grupo: Attr<"dierese"|"hemostasia"|"preensao"|"sintese"|"afastamento"|"auxiliar">;
  funcao: Attr<string>;
  ponta: Attr<string>;                          // formato da ponta/mandíbula
  dentes: Attr<boolean>; serrilha: Attr<"total"|"parcial"|"ausente"|"transversal"|"longitudinal">;
  versoes: Attr<("reta"|"curva")[]>;
  traumatico: Attr<boolean>;
  afastadorTipo?: Attr<"dinamico"|"autoestatico">;
  estrutura: Attr<string[]>; usos: Attr<string[]>;
  reconhecimento: string; confundeCom: string[];
  imagens: Imagem[]; prioridadeProva: 1|2|3;
};

type Imagem = {
  src: string; tipo: "inteiro" | "detalhe";
  qualidade: "boa" | "aceitavel" | "insuficiente";   // insuficiente → nunca usada para exigir identificação visual
  regioes?: { id: string; rotulo: string; x: number; y: number; w: number; h: number }[]; // coordenadas 0–1
  fonte: Fonte;
};
```

As `regioes` permitem destacar, em comparações e no "Quem sou eu?" visual, a parte que diferencia um item do outro (ex.: serrilha parcial da Kelly × serrilha total da Crile).

## 3. Pipeline de conteúdo e imagens (fase 1, antes de qualquer tela)

Essa é a fase mais importante, porque a correção do conteúdo é a prioridade.

1. **Extrair** texto e imagens dos 8 PDFs com `pdfjs-dist` (Node) em `scripts/extract-pdf.mjs`. Saída: texto por página e imagens numeradas por página.
2. **Montar uma tabela de evidências**: para cada um dos 42 itens e cada atributo, onde aparece e com que valor em cada material.
3. **Resolver divergências**: quando dois materiais discordam, marcar `divergente`, registrar ambos e, se preciso, conferir em fonte técnica externa (fonte `externa`, com referência). Quando nenhum material traz a informação, marcar `lacuna` e não inventar. Pontos que já merecem conferência:
   - Aço cirúrgico: alguns materiais o classificam como natural (mineral), outros como sintético ou "metálico"
   - Pinças anatômica e dente de rato: síntese (como na sua lista) ou preensão em outros autores
   - Mixter: hemostasia ou dissecção
   - Poligliconato (Maxon): costuma aparecer pouco nos slides, com risco alto de lacuna
   - Algodão e linho: confirmar o que o material diz sobre multifilamento e reação tecidual
4. **Imagens**: recortar cada instrumento (inteiro + 1–3 detalhes), dar nota de qualidade e marcar regiões distintivas. Itens sem foto boa recebem `qualidade: "insuficiente"`, e o jogo troca a identificação visual por pistas textuais, com um aviso visível ("foto do material insuficiente para diferenciação visual").
5. **Banco de provas**: ele **não está na pasta** (só há apostilas, resumos, roteiro e slides). Quando você o adicionar, contar a frequência de cada item e de cada atributo cobrado para preencher `prioridadeProva`. Até lá, prioridade = 2 para todos.
6. **Revisão humana**: gerar uma página `/conteudo` (ou um PDF) com todas as fichas e as fontes de cada atributo, para você conferir antes de jogar.

## 4. Campanha: blocos

Cada bloco segue as etapas: **Descobrir → Memória → Monte a ficha → Quem sou eu? → Encontre o erro → Desafio final**. Uma etapa só abre quando a anterior termina, e a primeira passagem não exige acerto mínimo; o domínio é medido à parte.

### Campanha de fios (14)

| Bloco | Itens |
|---|---|
| F0 Conceitos fundamentais | Cartas de conceito (sem itens): absorvível × inabsorvível, natural × sintético, mono × multifilamentar, capilaridade, memória, resistência tênsil, reação tecidual, segurança do nó, hidrólise × proteólise |
| F1 Naturais absorvíveis | Categute simples, Categute cromado |
| F2 Sintéticos absorvíveis | Vicryl, Dexon, Monocryl, PDS, Poligliconato |
| F3 Naturais inabsorvíveis | Seda, Algodão, Linho (+ Aço, se o material o classificar como natural) |
| F4 Sintéticos inabsorvíveis | Náilon, Polipropileno, Poliéster (+ Aço, se sintético) |
| F5 Comparação entre semelhantes | Simples × cromado, Vicryl × Dexon, Monocryl × PDS, Náilon × Prolene, Seda × Náilon |
| F6 Revisão geral | Os 14, com o agendador priorizando os mais errados |

F1 tem só 2 itens, então ganha mais perguntas sobre mecanismo de absorção (proteólise) e já introduz a comparação simples × cromado.

### Campanha de instrumentação (28)

| Bloco | Itens |
|---|---|
| I0 Conceitos e grupos | Tempos cirúrgicos, os 6 grupos, traumático × atraumático, reto × curvo, serrilha, cremalheira, dentes |
| I1 Diérese | Cabo nº 3, Cabo nº 4, Lâminas, Bisturi elétrico, Mayo, Metzenbaum |
| I2 Hemostasia | Halsted (mosquito), Kelly, Crile, Mixter |
| I3 Preensão | Kocher, Allis, Backhaus, Babcock, Duval, Pozzi |
| I4 Síntese | Mayo-Hegar, Mathieu, Anatômica, Dente de rato, Adson c/ dentes, Adson s/ dentes |
| I5 Afastamento + auxiliar | Farabeuf, Doyen, Finochietto, Gosset, Maleável, Cheron |
| I6 Comparação entre semelhantes | Mayo × Metzenbaum, Kelly × Crile, Kelly × Halsted, Anatômica × dente de rato, Adson c/ × s/ dentes, Mayo-Hegar × Mathieu, dinâmicos × autoestáticos, Allis × Babcock, Kocher × Kelly |
| I7 Revisão geral | Os 28 |

Blocos com 6 itens são divididos, nas etapas Descobrir e Memória, em sub-rodadas de 3.

## 5. Motor pedagógico

### 5.1 Níveis de domínio (por item)

| Nível | Como se alcança | Como se perde |
|---|---|---|
| 1 Descoberto | Ver a ficha completa em Descobrir | — |
| 2 Reconheço | 3 acertos de associação (memória, foto ↔ nome) | 2 erros seguidos de reconhecimento |
| 3 Sei montar a ficha | Ficha montada com ≥ 90% das etiquetas certas, 2 vezes, em dias diferentes | Ficha < 70% |
| 4 Identifico pelas pistas | Acertar o "Quem sou eu?" no 1º palpite permitido, 2 vezes | Erro no palpite final |
| 5 Domino | Desafio final ou revisão correta após ≥ 3 dias, sem erros recentes no registro | Qualquer erro → volta ao nível 4 e entra na fila de revisão |

O nível nunca cai abaixo de 2 depois de alcançado, para não desanimar. O que cai é a prioridade de revisão.

### 5.2 Agendador de revisão

- Cada item guarda: `facilidade`, `intervalo`, `próximaRevisão`, `errosRecentes`, histórico de `(modo, atributo, resposta dada, data)`
- Espaçamento simples tipo Leitner (1 → 2 → 4 → 8 → 16 dias), com peso extra pelo número de erros
- **Erro com reinserção em outro formato**: ao errar o item X no modo A, o agendador insere X de novo **5–8 questões depois, num modo diferente de A**, preferindo uma comparação com o item confundido. Exemplo: errou Kelly na foto e respondeu Crile → reaparece em "Kelly × Crile". Na sessão seguinte, aparece em "Quem sou eu?" ou "Encontre o erro".
- O registro do erro guarda **qual atributo** foi errado, para que a revisão cobre exatamente aquele ponto (ex.: "Vicryl/estrutura").

### 5.3 Feedback explicativo

Nenhum feedback é só "certo" ou "errado". Cada atributo tem um **texto de explicação causal**, escrito uma vez no conteúdo e reaproveitado em todos os modos:

```json
"explicacoes": { "vicryl.estrutura": "O Vicryl é multifilamentar trançado. Os espaços entre os filamentos favorecem maior capilaridade do que nos monofilamentares." }
```

Os termos técnicos dentro de qualquer texto viram automaticamente um componente `<Termo>` que pode ser aberto (definição curta + consequência prática).

## 6. Os modos

### 6.1 Descobrir
- Ficha com foto (zoom por pinça no iPad, clique no Mac), atributos agrupados e termos clicáveis
- Rodada: 2–3 itens → ao final de cada ficha, 2–3 **perguntas guiadas** com a ficha ainda acessível (botão "ver ficha")
- Perguntas geradas por modelos ligados aos atributos, inclusive perguntas de relação ("sendo multifilamentar, tende a ter maior ou menor capilaridade?")
- Ao terminar, a carta vai para o álbum com animação

### 6.2 Jogo da memória
- Tipos de par: foto ↔ nome, nome ↔ função, fio ↔ característica, instrumento ↔ grupo, instrumento ↔ detalhe visual
- Progressão: 3 pares → 4 → 6 (máx. 8 no iPad). Só usa itens já descobertos
- Cada par encontrado mostra o **reforço** curto (campo `diferencial`)
- Pares foto ↔ nome só usam imagens com qualidade `boa`

### 6.3 Monte a ficha
- Mostra nome ou foto; abaixo, grupos de etiquetas binárias/ordinais (natural/sintético, mono/multi, capilaridade maior/menor…) e etiquetas de indicação com distratores tirados de itens do mesmo bloco
- No iPad, tocar para escolher; no Mac, tocar ou arrastar
- Correção por etiqueta, cada uma com sua explicação causal. Atributos `lacuna` não aparecem; atributos `divergente` aceitam as duas respostas e mostram a nota de divergência

### 6.4 Quem sou eu? (eliminação lógica)

Esse modo é um **motor de restrições**, não um quiz:

1. **Candidatos**: os itens do bloco (ou de blocos anteriores, na revisão), todos visíveis como cartas
2. **Pistas**: cada pista é um predicado sobre um atributo (`origem = sintético`). O motor escolhe a ordem das pistas, do mais amplo ao mais específico: a cada passo, escolhe a pista verdadeira para o alvo que elimina alguns candidatos, mas não todos, deixando a identificadora (composição, nome comercial) por último
3. **O usuário elimina** as cartas incompatíveis. Eliminar uma carta compatível com a pista gera um feedback explicativo ("A seda é natural, mas a pista falou de absorção; ela continua possível?") e a carta volta
4. **Pedir nova pista nunca é penalizado** enquanto houver mais de 1 candidato compatível
5. **O palpite final só é liberado quando o conjunto compatível tem exatamente 1 item.** Antes disso o botão fica desativado com o texto "ainda há N possibilidades"
6. **Pontuação**: proporcional à qualidade das eliminações (eliminou todos os incompatíveis, não eliminou compatíveis), não ao número de pistas. Nunca existe chute com informação insuficiente
7. **Validação automática** (teste): para todo alvo e todo conjunto de candidatos usado, a sequência de pistas leva a um conjunto único. Se dois itens forem indistinguíveis pelos atributos cadastrados, o teste falha e o par é sinalizado para revisão do conteúdo

**Versão visual (instrumentos):**
1. Recorte de um detalhe (região `regioes`) → 2. zoom-out progressivo → 3. pista de grupo/função → 4. característica estrutural distintiva → 5. foto inteira
- O mesmo motor de candidatos vale aqui: cada etapa visual também tem um predicado associado
- Se a imagem do alvo tem qualidade `insuficiente`, ou se o detalhe mostrado **não diferencia** o alvo de algum candidato, o motor pula para pistas textuais antes de liberar o palpite

### 6.5 Encontre o erro
- Gera uma frase-ficha a partir dos atributos e aplica **mutações** (troca de valor por outro válido do mesmo atributo: natural→sintético, total→parcial)
- Mutações só em atributos `confirmado`; prioriza atributos já errados pelo usuário e atributos que diferenciam pares confusos
- O usuário toca nos trechos (cada atributo é um segmento clicável) e escolhe a correção entre opções
- Níveis: Fácil (1 erro, avisado), Médio (2, avisados), Difícil (0–3, número oculto, mínimo 1), Avançado (0–3, podendo ser 0, com botão "não há erros")
- Feedback mostra a ficha original lado a lado com a adulterada, com as diferenças destacadas e explicadas

### 6.6 Comparação entre semelhantes (usada em blocos, desafio e revisão)
- Duas fotos lado a lado, com as `regioes` correspondentes destacadas em sincronia (ex.: o terço distal da mandíbula da Kelly sem serrilha × a Crile com serrilha total)
- Tabela comparativa só com os atributos que **diferem**
- Pergunta final de discriminação ("qual destas tem serrilha em toda a mandíbula?")

### 6.6b Instrumentando (mesa + pedido do cirurgião)
- Mesa vista de cima, organizada como na apostila de mesa (sentido horário, diérese no canto inferior direito, 6 grupos). Cada instrumento fica sobre uma compressa, para que o fundo branco das fotos não destoe do campo verde
- Um cirurgião ilustrado (original) pede um instrumento num balão; o usuário toca no instrumento certo
- Níveis de pedido: pelo nome → pela função → pela característica distintiva → pela situação ("vou abrir a pele") → sequência de uma cirurgia
- Lupa: tocar e segurar mostra a foto ampliada antes de entregar (Kelly × Crile só se diferenciam pela ponta)
- Só entram itens já descobertos e com foto `boa` ou `aceitavel`; os outros ficam de fora, com aviso
- Erro: o cirurgião explica a diferença, e o erro é registrado na carta e reinserido depois
- Dificuldade: mesa com grupos rotulados → sem rótulos → embaralhada; cronômetro só no nível avançado
- Entra no M2, porque só depende de Descobrir

### 6.7 Desafio final do bloco
- 8–12 tarefas misturando: identificar foto, nome ↔ função, montar ficha, "Quem sou eu?" curto, encontrar erro, diferenciar semelhantes, **aplicação clínica simples** ("Sutura de pele de face com bom resultado estético: qual fio é mais adequado e por quê?")
- Só usa itens e atributos já vistos em Descobrir (o gerador filtra pelo progresso)
- Questões de aplicação são **escritas à mão** no conteúdo, com fonte, e não geradas automaticamente

## 7. Álbum, registro de erros e área inicial

- **Álbum**: grade de cartas (bloqueadas = silhueta; descobertas = foto + nome + selo de nível 1–5). Carta aberta: fotos (inteiro + detalhes), todos os atributos com fonte, "não confundir com…" (com link para a comparação), erros cometidos, acertos, nível e última revisão
- Atalhos: Revisar este item · Comparar com semelhante · Jogar "Quem sou eu?" · Ver meus erros
- Filtros: fios, instrumentais, absorvíveis, inabsorvíveis, naturais, sintéticos, os 6 grupos, dominados, precisam de revisão
- **Registro de erros**: lista cronológica e por item; botão "revisar estes erros"
- **Início**: progresso geral (itens descobertos/dominados), progresso por campanha, "Revisão de hoje (N itens)", continuar de onde parou

## 8. Direção visual e UX

- Paleta de campo cirúrgico (verde-azulado), cartas com textura de inox escovado e borda por grupo (cada um dos 6 grupos tem uma cor; fios absorvíveis e inabsorvíveis têm cores próprias)
- Tipografia legível (Inter ou Atkinson Hyperlegible), modo escuro para estudar à noite
- Layout pensado para iPad em retrato e paisagem (alvos de toque ≥ 44 px) e Mac (teclado: 1–4 para opções, Enter para confirmar)
- Feedback com microanimações (carta vira, etiqueta encaixa) e sons discretos que podem ser desligados
- Sessões curtas: cada etapa leva 3–8 minutos

## 9. Qualidade e testes

- **Testes de conteúdo** (rodam a cada build):
  - todos os 42 itens existem e têm os campos obrigatórios
  - todo `confundeCom` aponta para um id existente
  - todo atributo tem fonte ou está marcado como `lacuna`
  - o "Quem sou eu?" resolve unicamente em todos os conjuntos de candidatos
  - nenhuma mutação de "Encontre o erro" gera uma frase que continua verdadeira (ex.: trocar "multi" por "multi_trancado")
  - imagens referenciadas existem; itens visuais sem imagem `boa` ficam fora dos modos visuais
- **Testes de motor**: domínio, agendador e reinserção de erros
- **Teste manual em iPad real** (Safari + PWA) e Mac (Safari/Chrome) a cada marco

## 10. Marcos de entrega

| Marco | Entrega | O que dá para fazer com ele |
|---|---|---|
| **M1 Conteúdo** | Extração dos PDFs, os 42 itens em JSON com fontes, lacunas e divergências, imagens recortadas e avaliadas, página de revisão do conteúdo | Você confere a correção antes de tudo |
| **M2 Base + Descobrir + Álbum + Instrumentando** ✅ | Projeto, navegação, persistência, exportar/importar, área inicial, Descobrir com perguntas guiadas, álbum com filtros, termos clicáveis, PWA | Já dá para estudar os 42 itens |
| **M3 Memória + Monte a ficha** ✅ | Dois modos, registro de erros, domínio níveis 1–3 | Primeira metade da progressão do bloco |
| **M4 Quem sou eu? (texto + visual)** ✅ | Motor de eliminação validado por testes | Nível 4 |
| **M5 Encontre o erro + Comparações** ✅ | Mutações, 4 dificuldades, comparações lado a lado com destaque | Discriminação dos pares confusos |
| **M6 Desafio final + revisão automática** ✅ | Desafio misto, agendador espaçado, revisão do dia, nível 5 | Campanha completa ponta a ponta |
| **M7 Acabamento** ✅ (falta: prioridade pelo banco de provas) | Sons, animações, ajustes de iPad, prioridade pelo banco de provas | Versão 1 para a prova |
| *Bônus* | Mesa cirúrgica (arrastar para os 6 grupos → depois posição e sequência) | — |

M1 e M2 juntos já entregam um material de estudo utilizável, e cada marco seguinte acrescenta uma etapa da progressão.

## 11. Pendências e perguntas em aberto

1. **Banco de provas**: não está na pasta. Sem ele, a prioridade por frequência fica neutra. Pode enviar?
2. **Classificações divergentes** (aço, pinças anatômica/dente de rato, Mixter): seguir a classificação dos slides da disciplina como resposta principal e mostrar a alternativa como nota? (Sugestão: sim.)
3. **Qualidade das fotos**: só será conhecida em M1. Itens sem foto boa terão modos visuais limitados e aviso explícito.
4. **Hospedagem**: GitHub Pages (gratuito, precisa de conta GitHub) ou Netlify, ou rodar só localmente no Mac?
