// Monte a ficha: grupos de etiquetas gerados a partir dos atributos confiáveis de cada item.
// Atributos 'lacuna' nunca são cobrados; divergências aceitam a alternativa registrada em 'aceitaTambem'.
import { type Item, type Fio, type Instrumento, type Attr, GRUPO, VALOR, fmtValor, itens } from './content'

export type Opcao = { id: string; rotulo: string }
export type GrupoEtiquetas = {
  campo: string
  titulo: string
  termo?: string
  multi: boolean
  opcoes: Opcao[]
  corretas: string[] // multi: o conjunto exato; único: qualquer uma delas está certa
  explicacao: string
  nota?: string
}

const ok = (a?: Attr) => !!a && a.s !== 'lacuna' && a.v !== null && a.v !== undefined
const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)
const multi = (e: string) => e.startsWith('multi')
const nivel2 = (v: unknown) => (v === 'alta' || v === 'muito_alta' ? 'maior' : v === 'baixa' || v === 'muito_baixa' ? 'menor' : null)
const notaDe = (a?: Attr) => (a && (a.s === 'divergente' || a.s === 'externa') ? a.nota ?? (a.s === 'externa' ? 'Este dado não consta nos materiais da disciplina; vem de referência técnica.' : undefined) : undefined)

function grupoBinario(campo: string, titulo: string, opcoes: Opcao[], certo: string, explicacao: string, a?: Attr, termo?: string, extras: string[] = []): GrupoEtiquetas {
  return { campo, titulo, termo, multi: false, opcoes, corretas: [certo, ...extras], explicacao, nota: notaDe(a) }
}

/** Retira frases que citam outro item pelo nome, para a etiqueta não entregar a resposta. */
function semNomesDeOutros(texto: string, proprio: Item): string {
  const nomes = itens.filter((i) => i.id !== proprio.id).flatMap((i) => [i.nome.replace(/^(Pinça|Afastador|Porta-agulha|Tesoura de) /, ''), ...(i.tipo === 'instr' ? i.sinonimos : [])]).filter((n) => n.length > 3)
  const frases = texto.split(/(?<=\.)\s+/)
  const limpas = frases.filter((f) => !nomes.some((n) => f.toLowerCase().includes(n.toLowerCase())))
  return (limpas.length ? limpas.join(' ') : texto).trim()
}

function gruposFio(f: Fio, outros: Fio[]): GrupoEtiquetas[] {
  const g: GrupoEtiquetas[] = []
  if (ok(f.origem))
    g.push(grupoBinario('origem', 'Origem', [{ id: 'natural', rotulo: 'Natural' }, { id: 'sintetico', rotulo: 'Sintético' }], f.origem.v,
      `${f.nome} é ${fmtValor(f.origem)}: ${f.composicao.v ?? ''}.`, f.origem))
  if (ok(f.absorcao))
    g.push(grupoBinario('absorcao', 'Absorção', [{ id: 'absorvivel', rotulo: 'Absorvível' }, { id: 'inabsorvivel', rotulo: 'Inabsorvível' }], f.absorcao.v,
      f.absorcao.v === 'absorvivel'
        ? `É absorvível${ok(f.mecanismoAbsorcao) ? ` (por ${VALOR[f.mecanismoAbsorcao.v as string]})` : ''}${ok(f.tempoAbsorcao) ? `; tempo de absorção: ${String(f.tempoAbsorcao.v).toLowerCase()}` : ''}.`
        : 'É inabsorvível: praticamente não se modifica com o tempo.', f.absorcao, 'absorvivel'))
  if (ok(f.estrutura) && f.estrutura.v !== 'ambos') {
    const m = multi(f.estrutura.v)
    const alt = (f.estrutura.aceitaTambem ?? []).map((x) => (multi(x) ? 'multi' : 'mono'))
    g.push(grupoBinario('estrutura', 'Estrutura', [{ id: 'mono', rotulo: 'Monofilamentar' }, { id: 'multi', rotulo: 'Multifilamentar' }], m ? 'multi' : 'mono',
      `É ${fmtValor(f.estrutura)}. ${m ? 'Vários filamentos trançados ou torcidos: bom manuseio e nó firme, porém mais capilaridade.' : 'Um único filamento: superfície lisa, pouca capilaridade, mas em geral mais memória.'}`, f.estrutura, 'multifilamentar', alt))
  }
  const cap = nivel2(f.capilaridade?.v)
  if (ok(f.capilaridade) && cap)
    g.push(grupoBinario('capilaridade', 'Capilaridade', [{ id: 'maior', rotulo: 'Maior capilaridade' }, { id: 'menor', rotulo: 'Menor capilaridade' }], cap,
      cap === 'maior'
        ? `${f.nome} é multifilamentar: os espaços entre os filamentos absorvem e conduzem fluidos (e bactérias), por isso a capilaridade é maior que a dos monofilamentares.`
        : `${f.nome} é monofilamentar: um filamento único e compacto quase não absorve fluidos, por isso a capilaridade é menor.`, f.capilaridade, 'capilaridade'))
  const rea = nivel2(f.reacaoTecidual?.v)
  if (ok(f.reacaoTecidual) && rea)
    g.push(grupoBinario('reacaoTecidual', 'Reação tecidual', [{ id: 'maior', rotulo: 'Maior reação tecidual' }, { id: 'menor', rotulo: 'Menor reação tecidual' }], rea,
      rea === 'maior'
        ? `A reação tecidual de ${f.nome} é ${fmtValor(f.reacaoTecidual)}. ${f.origem.v === 'natural' ? 'Fios naturais provocam mais inflamação que os sintéticos.' : ''}`
        : `A reação tecidual de ${f.nome} é ${fmtValor(f.reacaoTecidual)}: fios sintéticos costumam ser mais inertes que os naturais.`, f.reacaoTecidual, 'reacao-tecidual'))
  if (f.absorcao.v === 'absorvivel' && ok(f.mecanismoAbsorcao))
    g.push(grupoBinario('mecanismoAbsorcao', 'Como é absorvido', [{ id: 'hidrolise', rotulo: 'Hidrólise' }, { id: 'proteolise_fagocitose', rotulo: 'Proteólise / fagocitose' }], f.mecanismoAbsorcao.v as string,
      f.mecanismoAbsorcao.v === 'hidrolise' ? 'Sintéticos absorvíveis são quebrados pela água (hidrólise): processo previsível e com pouca inflamação.' : 'O categute, natural, é degradado por enzimas e células de defesa (proteólise/fagocitose), com mais inflamação.', f.mecanismoAbsorcao, 'hidrolise'))
  // Indicações não são exclusivas na prática clínica. Por isso o grupo pergunta o que o MATERIAL cita,
  // só existe quando as indicações do fio vêm dos slides, e os distratores também vêm dos slides.
  if (ok(f.indicacoes) && f.indicacoes.v.length && f.indicacoes.s === 'material') {
    const minhas = f.indicacoes.v
    // Distratores vêm de fios da OUTRA classe (absorvível × inabsorvível) e não podem compartilhar palavras-chave
    // com as indicações do item (nem com as extras), para não haver distrator que também seja verdadeiro.
    const PARADA = new Set(['sutura', 'suturas', 'cirurgia', 'cirurgias', 'atual', 'tecidos', 'precisam', 'suporte'])
    const palavras = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 4 && !PARADA.has(w))
    const minhasPalavras = new Set([...minhas, ...(f.indicacoes.extra ?? [])].flatMap(palavras))
    const distratores = embaralhar([...new Set(outros.filter((o) => o.absorcao.v !== f.absorcao.v && o.indicacoes.s === 'material').flatMap((o) => (ok(o.indicacoes) ? o.indicacoes.v : [])))])
      .filter((x) => !minhas.includes(x) && !palavras(x).some((w) => minhasPalavras.has(w)))
      // 'ligadura' vale para muitos fios (absorvíveis e inabsorvíveis): nunca serve de distrator
      .filter((x) => !/ligadura/i.test(x))
      // usos clinicamente compartilhados entre as classes: não servem de distrator
      .filter((x) => (f.absorcao.v === 'absorvivel' ? !/pele|vasos|vascular|aponeurose/i.test(x) : !/parede abdominal|f[aá]scia|aponeurose|tend[oõ]es|m[uú]sculo|intrad/i.test(x)))
      .slice(0, Math.max(2, 5 - minhas.length))
    g.push({
      campo: 'indicacoes', titulo: 'Indicações citadas no material (marque todas)', multi: true,
      opcoes: embaralhar([...minhas, ...distratores]).map((x) => ({ id: x, rotulo: x })),
      corretas: minhas,
      explicacao: `Os slides citam para ${f.nome}: ${minhas.join('; ')}.${f.indicacoes.extra ? ` Referência técnica acrescenta: ${f.indicacoes.extra.join('; ')}.` : ''}`, nota: notaDe(f.indicacoes),
    })
  }
  return g
}

// Pares cujas descrições de reconhecimento não se excluem (a de um também vale para o outro).
const NAO_EXCLUSIVOS = [['pinca-anatomica', 'adson-sem-dentes'], ['dente-de-rato', 'adson-com-dentes'], ['doyen', 'maleavel']]
const naoExclusivos = (a: string, b: string) => NAO_EXCLUSIVOS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

/** Pega os primeiros textos distintos, mantendo a ordem (vizinhos do bloco primeiro = distratores mais difíceis). */
function primeirosDistintos(textos: string[], excluir: string[], n: number): string[] {
  const vistos = new Set(excluir)
  const r: string[] = []
  for (const t of textos) if (!vistos.has(t) && r.length < n) { vistos.add(t); r.push(t) }
  return r
}

function gruposInstr(i: Instrumento, outros: Instrumento[]): GrupoEtiquetas[] {
  const g: GrupoEtiquetas[] = []
  if (ok(i.grupo))
    g.push({
      campo: 'grupo', titulo: 'Grupo cirúrgico', multi: false,
      opcoes: (Object.keys(GRUPO) as (keyof typeof GRUPO)[]).map((x) => ({ id: x, rotulo: GRUPO[x] })),
      corretas: [i.grupo.v, ...(i.grupo.aceitaTambem ?? [])],
      explicacao: `${i.nome}: ${GRUPO[i.grupo.v].toLowerCase()} — ${i.funcao.v}.`, nota: notaDe(i.grupo),
    })
  if (ok(i.funcao)) {
    // funções do MESMO grupo podem se sobrepor (ex.: 'pinçar vasos' × 'pinçar pequenos vasos'); distratores vêm de outros grupos
    const dist = primeirosDistintos(outros.filter((o) => ok(o.funcao) && o.grupo.v !== i.grupo.v).map((o) => o.funcao.v), [i.funcao.v], 2)
    g.push({ campo: 'funcao', titulo: 'Função', multi: false, opcoes: embaralhar([i.funcao.v, ...dist]).map((x) => ({ id: x, rotulo: x })), corretas: [i.funcao.v], explicacao: `Função: ${i.funcao.v}.`, nota: notaDe(i.funcao) })
  }
  if (ok(i.traumatico) && typeof i.traumatico.v === 'boolean')
    g.push(grupoBinario('traumatico', 'Trauma ao tecido', [{ id: 'sim', rotulo: 'Traumático' }, { id: 'nao', rotulo: 'Atraumático' }], i.traumatico.v ? 'sim' : 'nao',
      i.traumatico.v ? `Traumático: ${i.reconhecimento} Dentes, garras ou pontas lesam o tecido que seguram.` : `Atraumático: segura sem lesar. ${i.reconhecimento}`, i.traumatico, 'traumatico'))
  if (ok(i.dentes) && typeof i.dentes.v === 'boolean' && ['preensao', 'sintese'].includes(i.grupo.v) && !['mayo-hegar', 'mathieu'].includes(i.id))
    g.push(grupoBinario('dentes', 'Ponta', [{ id: 'sim', rotulo: 'Com dentes' }, { id: 'nao', rotulo: 'Sem dentes' }], i.dentes.v ? 'sim' : 'nao',
      `${i.dentes.v ? 'Tem dentes' : 'Não tem dentes'}: ${i.reconhecimento}`, i.dentes))
  if (ok(i.serrilha) && i.grupo.v === 'hemostasia' && ['total', 'dois_tercos'].includes(i.serrilha.v as string))
    g.push(grupoBinario('serrilha', 'Serrilha da mandíbula', [{ id: 'total', rotulo: 'Em toda a extensão' }, { id: 'dois_tercos', rotulo: 'Só até 2/3' }], i.serrilha.v as string,
      i.serrilha.v === 'dois_tercos' ? 'Só até 2/3: perto da articulação a mandíbula é lisa. É o que separa a Kelly da Crile.' : 'Em toda a extensão. Entre as hemostáticas, só a Kelly tem ranhuras até 2/3.', i.serrilha, 'serrilha'))
  if (i.afastadorTipo && ok(i.afastadorTipo))
    g.push(grupoBinario('afastadorTipo', 'Tipo de afastador', [{ id: 'dinamico', rotulo: 'Dinâmico' }, { id: 'autoestatico', rotulo: 'Autoestático' }], i.afastadorTipo.v,
      i.afastadorTipo.v === 'dinamico' ? 'Dinâmico: alguém precisa segurá-lo.' : 'Autoestático: trava aberto sozinho e libera as mãos da equipe.', i.afastadorTipo, 'afastador-dinamico'))
  if (['mayo-hegar', 'mathieu'].includes(i.id))
    g.push(grupoBinario('cabo', 'Cabo', [{ id: 'argolas_cremalheira', rotulo: 'Com argolas (como tesoura)' }, { id: 'pinca_mola', rotulo: 'De pinça, sem argolas' }], i.cabo.v,
      'A ponta dos dois porta-agulhas é igual; o cabo diferencia: Mayo-Hegar tem argolas, Mathieu tem cabo de pinça com mola.', i.cabo))
  if (ok(i.versoes) && i.versoes.v.length && i.versoes.s !== 'externa' && i.versoes.v.every((x) => x === 'reta' || x === 'curva')) {
    const v = i.versoes.v.length === 2 ? 'ambas' : i.versoes.v[0]
    g.push(grupoBinario('versoes', 'Versões', [{ id: 'reta', rotulo: 'Só reta' }, { id: 'curva', rotulo: 'Só curva' }, { id: 'ambas', rotulo: 'Reta e curva' }], v,
      `Existe ${fmtValor(i.versoes).replace(' · ', ' e ')}.`, i.versoes))
  }
  if (i.reconhecimento) {
    const proprio = semNomesDeOutros(i.reconhecimento, i)
    const dist = primeirosDistintos(outros.filter((o) => o.reconhecimento && !naoExclusivos(i.id, o.id)).map((o) => semNomesDeOutros(o.reconhecimento!, o)), [proprio], 2)
    if (dist.length)
      g.push({ campo: 'reconhecimento', titulo: 'Característica que permite reconhecê-lo', multi: false, opcoes: embaralhar([proprio, ...dist]).map((x) => ({ id: x, rotulo: x })), corretas: [proprio], explicacao: i.reconhecimento })
  }
  return g
}

/** `vizinhos`: itens do mesmo bloco (distratores mais difíceis) e depois os demais. */
export function gruposDaFicha(it: Item, vizinhos: Item[]): GrupoEtiquetas[] {
  if (it.tipo === 'fio') {
    const outros = [...vizinhos, ...itens].filter((x): x is Fio => x.tipo === 'fio' && x.id !== it.id)
    return gruposFio(it, outros)
  }
  // vizinhos do bloco embaralhados primeiro, depois o restante embaralhado
  const doBloco = embaralhar(vizinhos.filter((x): x is Instrumento => x.tipo === 'instr' && x.id !== it.id))
  const resto = embaralhar(itens.filter((x): x is Instrumento => x.tipo === 'instr' && x.id !== it.id && !doBloco.includes(x as Instrumento)))
  return gruposInstr(it, [...doBloco, ...resto])
}

export function corrigir(g: GrupoEtiquetas, marcadas: string[]): boolean {
  if (g.multi) return marcadas.length === g.corretas.length && marcadas.every((m) => g.corretas.includes(m))
  return marcadas.length === 1 && g.corretas.includes(marcadas[0])
}
