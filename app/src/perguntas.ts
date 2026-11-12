// Perguntas guiadas da fase Descobrir. A ficha continua acessível: o objetivo é aprender, não avaliar.
// Cada pergunta usa só atributos que NÃO são lacuna, e a explicação liga as características entre si.
import { type Item, type Fio, type Instrumento, GRUPO, VALOR, fmtValor, rankingResistencia, item as getItem } from './content'

export type Opcao = { rotulo: string; correta: boolean }
export type Pergunta = { campo: string; pergunta: string; opcoes: Opcao[]; explicacao: string }

const ok = (a?: { s: string; v: unknown }) => !!a && a.s !== 'lacuna' && a.v !== null && a.v !== undefined
const nota = (a?: { s: string; nota?: string }) => (a && (a.s === 'divergente' || a.s === 'externa') && a.nota ? ` (${a.nota})` : '')
const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)
const multi = (e: string) => e.startsWith('multi')
/** artigo definido para nomes de instrumentos: 'a Pinça', 'o Porta-agulha', 'as Lâminas' */
export const art = (nome: string) => (/^(Pinça|Tesoura|Válvula)/.test(nome) ? 'a' : /^Lâminas/.test(nome) ? 'as' : 'o')
const Art = (nome: string) => art(nome).toUpperCase().slice(0, 1) + art(nome).slice(1)

function perguntasFio(f: Fio): Pergunta[] {
  const q: Pergunta[] = []
  // Nome como o aluno conhece (lista da disciplina): marca para os sintéticos absorvíveis e o Prolene; nome genérico para os demais.
  const MARCA: Record<string, string> = { vicryl: 'Vicryl', dexon: 'Dexon', monocryl: 'Monocryl', pds: 'PDS', polipropileno: 'Prolene', nylon: 'náilon' }
  const ref = MARCA[f.id] ?? `fio de ${f.nome.toLowerCase()}`
  const n = `O ${ref}`
  const doN = `do ${ref}`
  if (ok(f.absorcao))
    q.push({
      campo: 'absorcao',
      pergunta: `${n} é absorvível ou inabsorvível?`,
      opcoes: [
        { rotulo: 'Absorvível', correta: f.absorcao.v === 'absorvivel' },
        { rotulo: 'Inabsorvível', correta: f.absorcao.v === 'inabsorvivel' },
      ],
      explicacao:
        f.absorcao.v === 'absorvivel'
          ? `É absorvível: o organismo o degrada com o tempo${ok(f.mecanismoAbsorcao) ? `, por ${VALOR[f.mecanismoAbsorcao.v as string]}` : ''}. Por isso não precisa ser retirado, mas só serve enquanto mantém a resistência.`
          : `É inabsorvível: praticamente não se modifica com o tempo e dá suporte duradouro.${nota(f.absorcao)}`,
    })
  if (ok(f.origem))
    q.push({
      campo: 'origem',
      pergunta: `Qual é a origem ${doN}?`,
      opcoes: [
        { rotulo: 'Natural', correta: f.origem.v === 'natural' },
        { rotulo: 'Sintética', correta: f.origem.v === 'sintetico' },
      ],
      explicacao: `${fmtValor(f.origem)[0].toUpperCase() + fmtValor(f.origem).slice(1)}: ${f.composicao.v ?? ''}.${nota(f.origem)}${
        f.origem.v === 'natural' ? ' Fios naturais tendem a provocar mais reação tecidual que os sintéticos.' : ''
      }`,
    })
  if (ok(f.estrutura) && f.estrutura.v !== 'ambos') {
    const m = multi(f.estrutura.v)
    q.push({
      campo: 'estrutura',
      pergunta: `${n} é monofilamentar ou multifilamentar?`,
      opcoes: [
        { rotulo: 'Monofilamentar', correta: !m },
        { rotulo: 'Multifilamentar', correta: m },
      ],
      explicacao: `É ${fmtValor(f.estrutura)}.${nota(f.estrutura)}`,
    })
    if (ok(f.capilaridade))
      q.push({
        campo: 'capilaridade',
        pergunta: `Sendo ${m ? 'multifilamentar' : 'monofilamentar'}, ele tende a ter maior ou menor capilaridade?`,
        opcoes: [
          { rotulo: 'Maior capilaridade', correta: m },
          { rotulo: 'Menor capilaridade', correta: !m },
        ],
        explicacao: m
          ? 'Maior. Os espaços entre os filamentos absorvem e conduzem fluidos (e bactérias) para dentro da ferida, o que aumenta o risco de infecção.'
          : 'Menor. Um filamento único e compacto quase não absorve fluidos, por isso aloja menos bactérias.',
      })
  }
  // resistência relativa (tabela dos slides)
  const lista = f.absorcao.v === 'absorvivel' ? rankingResistencia.absorviveis : rankingResistencia.inabsorviveis
  const pos = lista.indexOf(f.id)
  if (pos >= 0) {
    const vizinho = lista[pos === 0 ? 1 : pos - 1]
    const outro = getItem(vizinho) as Fio
    const maisForte = pos === 0 // comparado com o vizinho mais forte, exceto quando é o primeiro da lista
    q.push({
      campo: 'resistenciaTensil',
      pergunta: `Na tabela dos slides, quem é mais resistente: ${f.nome.toLowerCase()} ou ${outro.nome.toLowerCase()}?`,
      opcoes: embaralhar([
        { rotulo: f.nome, correta: maisForte },
        { rotulo: outro.nome, correta: !maisForte },
      ]),
      explicacao: `Ordem dos ${f.absorcao.v === 'absorvivel' ? 'absorvíveis' : 'inabsorvíveis'} (do mais ao menos resistente): ${lista.map((id) => getItem(id).nome).join(' > ')}.`,
    })
  }
  return q
}

function perguntasInstr(i: Instrumento): Pergunta[] {
  const q: Pergunta[] = []
  const grupos = Object.keys(GRUPO) as (keyof typeof GRUPO)[]
  if (ok(i.grupo)) {
    const errados = embaralhar(grupos.filter((g) => g !== i.grupo.v)).slice(0, 2)
    q.push({
      campo: 'grupo',
      pergunta: `A que grupo cirúrgico pertence: ${i.nome}?`,
      opcoes: embaralhar([i.grupo.v, ...errados]).map((g) => ({ rotulo: GRUPO[g], correta: g === i.grupo.v })),
      explicacao: `${GRUPO[i.grupo.v]}: ${i.funcao.v}.${nota(i.grupo)}`,
    })
  }
  if (ok(i.serrilha) && ['total', 'dois_tercos'].includes(i.serrilha.v as string) && i.grupo.v === 'hemostasia')
    q.push({
      campo: 'serrilha',
      pergunta: `As ranhuras d${art(i.nome)} ${i.nome} ocupam toda a mandíbula ou só 2/3?`,
      opcoes: [
        { rotulo: 'Toda a extensão', correta: i.serrilha.v === 'total' },
        { rotulo: 'Só 2/3', correta: i.serrilha.v === 'dois_tercos' },
      ],
      explicacao:
        i.serrilha.v === 'dois_tercos'
          ? 'Só 2/3: perto da articulação a mandíbula é lisa. É o detalhe que separa a Kelly da Crile.'
          : 'Toda a extensão. A Kelly é a hemostática que tem ranhuras só até 2/3.',
    })
  if (ok(i.dentes) && i.dentes.v !== null && ['preensao', 'sintese'].includes(i.grupo.v) && !i.id.startsWith('ma'))
    q.push({
      campo: 'dentes',
      pergunta: `A ponta d${art(i.nome)} ${i.nome} tem dentes?`,
      opcoes: [
        { rotulo: 'Sim, tem dentes', correta: i.dentes.v === true },
        { rotulo: 'Não tem dentes', correta: i.dentes.v === false },
      ],
      explicacao:
        i.dentes.v === true
          ? `Tem. Dentes dão uma preensão firme, mas lesam o tecido (instrumento traumático): ${i.reconhecimento}`
          : `Não tem. Sem dentes, segura sem lesar: ${i.reconhecimento}`,
    })
  if (['mayo-hegar', 'mathieu'].includes(i.id) && ok(i.cabo))
    q.push({
      campo: 'cabo',
      pergunta: `Como é o cabo do porta-agulha ${i.nome.replace('Porta-agulha ', '')}?`,
      opcoes: [
        { rotulo: 'Com argolas, como uma tesoura', correta: i.cabo.v === 'argolas_cremalheira' },
        { rotulo: 'De pinça, sem argolas', correta: i.cabo.v === 'pinca_mola' },
      ],
      explicacao: 'A ponta dos dois porta-agulhas é igual (sulco central e ranhuras cruzadas). Quem diferencia é o cabo: Mayo-Hegar tem argolas; Mathieu tem cabo de pinça com mola.',
    })
  if (i.afastadorTipo && ok(i.afastadorTipo))
    q.push({
      campo: 'afastadorTipo',
      pergunta: `${Art(i.nome)} ${i.nome} é dinâmico ou autoestático?`,
      opcoes: [
        { rotulo: 'Dinâmico (alguém segura)', correta: i.afastadorTipo.v === 'dinamico' },
        { rotulo: 'Autoestático (fica aberto sozinho)', correta: i.afastadorTipo.v === 'autoestatico' },
      ],
      explicacao:
        i.afastadorTipo.v === 'dinamico'
          ? 'Dinâmico: precisa ser segurado por um auxiliar, que pode reposicioná-lo a qualquer momento.'
          : 'Autoestático: trava aberto sozinho (por cremalheira ou parafuso) e libera as mãos da equipe.',
    })
  if (ok(i.versoes) && i.versoes.v.length === 2 && i.grupo.v !== 'sintese')
    q.push({
      campo: 'versoes',
      pergunta: `${Art(i.nome)} ${i.nome} existe em versão reta, curva ou nas duas?`,
      opcoes: [
        { rotulo: 'Só reta', correta: false },
        { rotulo: 'Só curva', correta: false },
        { rotulo: 'Reta e curva', correta: true },
      ],
      explicacao: 'Existe reta e curva. Na mesa, a versão curva costuma ser a mais usada.',
    })
  return q
}

const PRIORIDADE_FIO = ['absorcao', 'estrutura', 'capilaridade', 'origem', 'resistenciaTensil']
export function perguntasGuiadas(it: Item, max = it.tipo === 'fio' ? 4 : 3): Pergunta[] {
  if (it.tipo === 'instr') return perguntasInstr(it).slice(0, max)
  return perguntasFio(it).sort((a, b) => PRIORIDADE_FIO.indexOf(a.campo) - PRIORIDADE_FIO.indexOf(b.campo)).slice(0, max)
}
