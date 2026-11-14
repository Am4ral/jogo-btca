# Jogo BTCA — fios de sutura e instrumentação

Jogo web (PWA) para aprender os 14 fios e os 28 instrumentais da disciplina de BTCA. O plano completo está em [PLANO.md](PLANO.md).

## Pastas

- `content/` — **fonte única do conteúdo**: fichas (`fios.json`, `instrumentos.json`), termos, pares que confundem, blocos da campanha, falas do cirurgião (`pedidos.json`) e fotos (`img/`). Cada atributo traz a fonte e a situação (no material / fonte externa / divergente / lacuna).
- `app/` — o jogo (Vite + React + TypeScript). Lê o conteúdo diretamente de `content/`.
- `tools/` — scripts de extração dos PDFs, validação do conteúdo e geração da página de revisão.
- `extracted/` — texto e imagens extraídos dos PDFs (intermediário).

## Rodar o jogo

```bash
npm --prefix app install
npm --prefix app run dev
```

Abra `http://localhost:5173`. Para testar no iPad na mesma rede Wi‑Fi, rode `npm --prefix app run dev -- --host` e abra o endereço de rede que aparecer.

## Gerar a versão para publicar

```bash
npm --prefix app run build
```

O site é publicado na **Vercel**: o arquivo `vercel.json` já diz como instalar, validar o conteúdo, gerar o site e de qual pasta servir (`app/dist`). Com o repositório ligado à Vercel, cada envio para a branch `main` publica uma nova versão. No iPad, abra o site no Safari e use Compartilhar → Adicionar à Tela de Início para que o progresso não seja apagado.

## Conferir o conteúdo

```bash
node tools/validate-content.mjs
node tools/build-review.mjs && node tools/serve.mjs
```

O primeiro comando checa referências, fontes, imagens e se o "Quem sou eu?" tem solução. O segundo gera e abre `revisao-conteudo.html` em `http://localhost:4173`.

## Outros scripts

```bash
node tools/icons.mjs
```

Regera os ícones PNG do app (`content/icon-180.png`, `-192`, `-512`) a partir do desenho de `content/icon.svg`.

## Testar a versão de produção (offline)

```bash
npm --prefix app run build
npm --prefix app run preview -- --port 4174
```

Abra `http://localhost:4174`. Depois do primeiro acesso, o jogo funciona sem internet (todas as fotos e o conteúdo ficam em cache).

## Atalhos no Mac

Teclas **1 a 9** escolhem as opções; **Enter** aciona o botão principal. Som e tema (claro/escuro) ficam em Progresso → Preferências.
