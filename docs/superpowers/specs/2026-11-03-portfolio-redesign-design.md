# Redesign do portfólio: "log stream"

- **Data:** 2026-11-03
- **Status:** aprovado no brainstorming
- **Mockup de referência:** [`2026-11-03-portfolio-redesign-mockup.html`](./2026-11-03-portfolio-redesign-mockup.html) (abrir no navegador)

## Objetivo

Trocar o portfólio gerado anteriormente (claro por padrão, bloco azul, seções Writing/Notes/Projects/CV) por um site **só escuro**, com mais impacto e personalidade, que conte quatro coisas:

1. **Logs:** posts e notas num feed só.
2. **Experiência.**
3. **Contribuições open source** (PRs em projetos de terceiros).
4. **Links.**

A direção visual é a **A · Log stream**: o site inteiro se apresenta como um log, todo em monoespaçado, com cada item (post, nota, PR, emprego) virando uma linha com data e tipo colorido.

## Fora do escopo

- Seção de projetos próprios (a coleção `projects` sai).
- Tema claro e botão de troca de tema.
- Filtros, busca ou páginas por tag em `/logs/`.
- Redirecionamentos dos endereços antigos (`/writing/`, `/notes/`, `/projects/`): o site nunca foi publicado.
- JavaScript de framework no cliente.
- Tradução: o conteúdo do site continua em inglês (`lang="en"`).

## Abordagem

Reaproveitar o projeto Astro existente. Mantém-se: content collections de `posts` e `notes`, plugin de `[[wikilinks]]`, RSS, sitemap, workflow de deploy (`.github/workflows/deploy.yml`) e o script `scripts/cv_pdf.py`. Troca-se: estilos, layouts, componentes, páginas e parte do modelo de dados.

## Visual

### Tokens (`src/styles/global.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0b0b0a` | fundo da página |
| `--bg-2` | `#121210` | linhas alternadas, hover, código inline |
| `--line` | `#24231f` | bordas e divisórias |
| `--ink` | `#e8e6df` | texto principal |
| `--dim` | `#bdbab0` | texto de leitura secundário (lead, bullets) |
| `--mute` | `#8a877c` | metadados, datas (contraste 5.4:1 sobre `--bg`) |
| `--amber` | `#ffb224` | cor principal: cursor, links, foco, números de seção |
| `--kind-post` | `#ffb224` | rótulo POST |
| `--kind-note` | `#8fd18b` | rótulo NOTE, status "open", linhas adicionadas |
| `--kind-oss` | `#7fb8ff` | rótulo OSS, nome do repositório |
| `--kind-job` | `#e98bd8` | rótulo JOB |
| `--merged` | `#b48cff` | selo MERGED |
| `--del` | `#f07178` | linhas removidas |

`color-scheme: dark` fixo. Sem `@media (prefers-color-scheme)`, sem `data-theme`, sem script de tema.

### Tipografia

- Uma fonte só: **JetBrains Mono Variable** (`@fontsource-variable/jetbrains-mono`, já instalada).
- Saem as dependências `@fontsource-variable/archivo` e `@fontsource-variable/source-serif-4`.
- Corpo: 15px / 1.6. Metadados: 12px. Nome no topo: `clamp(4.5rem, 16vw, 9rem)`, peso 800, `letter-spacing: -0.07em`.
- Texto dos logs (prosa): 16px / 1.75, largura máxima de 72ch.

### Layout e detalhes

- Largura máxima 1080px; margem lateral `clamp(16px, 4vw, 40px)` (16px no celular, sem rolagem horizontal).
- Cabeçalho de seção: `01 experience ───────────── ~3 yrs` (número em âmbar, título, linha que preenche o espaço, metadado à direita).
- Cursor âmbar piscando ao lado do nome. Com `prefers-reduced-motion: reduce`, fica parado e visível.
- Foco: contorno âmbar de 2px. O tipo de cada item aparece como texto (NOTE, POST...), nunca só pela cor.
- Blocos de código: tema `vesper` do Shiki (escuro, puxado para âmbar). Se a versão instalada do Shiki não tiver `vesper`, usar `github-dark`. Uma configuração de tema só (`theme`, não `themes`), e o CSS de troca de tema do código sai.

## Modelo de dados

### `src/config.ts`

```ts
export const site = {
  name: 'Yuri',
  title: 'Yuri — software engineer',
  description: '…',                 // meta description (mantém o texto atual)
  tagline: 'backend engineer → low-level & distributed systems', // linha "// ..." acima do nome
  intro: '…',                       // parágrafo do topo (mantém o texto atual)
  available: 'open to work',        // opcional; mostra ponto verde. Omitir para esconder.
  facts: ['São Paulo, BR', 'open to relocation'],
  links: [
    { cmd: 'open github',   label: 'github.com/your-handle',   href: 'https://github.com/your-handle' },   // TODO
    { cmd: 'open linkedin', label: 'linkedin.com/in/your-handle', href: 'https://www.linkedin.com/in/your-handle' }, // TODO
    { cmd: 'mail',          label: 'you@yourdomain.dev',       href: 'mailto:you@yourdomain.dev' },         // TODO
    { cmd: 'curl cv.pdf',   label: 'download',                 href: '/cv.pdf' },
    { cmd: 'curl rss.xml',  label: 'feed',                     href: '/rss.xml' },
  ],
};
```

`site.links` passa de objeto (`{ github, linkedin, email }`) para lista. O `/cv/` acha e-mail, GitHub e LinkedIn nessa lista procurando `mailto:`, `github.com` e `linkedin.com` no `href`.

### `src/data/oss.ts` (novo)

```ts
export type Contribution = {
  repo: string;           // 'owner/name'
  number: number;         // número do PR
  title: string;
  url: string;
  status: 'merged' | 'open';
  date: string;           // 'YYYY-MM-DD': data do merge, ou da abertura se ainda aberto
  impact: string;         // uma frase: o que mudou e por que importa
  additions?: number;     // opcional, mostrado como +N
  deletions?: number;     // opcional, mostrado como −N
};

export const contributions: Contribution[] = [
  // exemplo comentado, nenhum item real
];
```

Ordenado por `date` decrescente na exibição. **Lista vazia:** a seção "open source" e o link `oss` no menu não aparecem, e as seções seguintes são renumeradas.

### `src/data/cv.ts`

Cada item de `experience` troca `period` por datas estruturadas:

```ts
{ role: 'Software Engineer', org: 'Mercado Livre', start: '2026-01', end: undefined, bullets: [...] }
```

- `start` e `end` no formato `'YYYY-MM'`; `end` ausente significa emprego atual.
- Na home: `2026-01 → now`. No `/cv/` (PDF): `Jan 2026 — present`.
- O resto de `cv.ts` (headline, summary, skills, languages, education) continua igual e só é usado no `/cv/`.
- O emprego anterior de exemplo continua com `TODO` no cargo e na empresa, mas com `start`/`end` válidos (`'2023-01'`/`'2025-12'`), para não quebrar o cálculo de datas.

### Coleções (`src/content.config.ts`)

- `posts` e `notes`: schemas inalterados.
- `projects`: removida, junto com `src/content/projects/`.

### Funções em `src/lib/content.ts`

- `getPosts()`, `getNotes()`: inalteradas (rascunhos aparecem só no `npm run dev`).
- `getLogs(): Log[]` junta posts e notas, ordenado por data decrescente.

  ```ts
  type Log = {
    kind: 'post' | 'note';
    id: string;            // slug
    title: string;
    summary: string;       // post: description · nota: summary
    date: Date;            // post: date · nota: updated
    href: string;          // /logs/<id>/
    meta: string;          // post: "8 min" · nota: "seedling" | "growing" | "evergreen"
    entry: CollectionEntry<'posts'> | CollectionEntry<'notes'>;
  };
  ```

  Se o mesmo `id` existir em posts e em notas, lança `Error('Log slug "<id>" exists in both posts and notes. Rename one of them.')` e o build falha.
- `readingTime(body)`: palavras / 220, mínimo 1, em minutos.
- `getTimeline(): TimelineItem[]` junta logs, contribuições e empregos (pela data de `start`), ordenado por data decrescente. Usado no bloco do topo, que mostra os 6 primeiros.

  ```ts
  type TimelineItem = { date: Date; kind: 'post' | 'note' | 'oss' | 'job'; label: string; href: string };
  // post/nota: label = título, href = /logs/<id>/
  // oss: label = "<nome-do-repo>#<número> merged|open", href = url do PR
  // job: label = "joined <org>", href = /#experience
  ```
- `fmtDate(d)`: `YYYY-MM-DD` em UTC.
- `getBacklinks(log, logs)`: logs cujo corpo contém um `[[...]]` que aponta para `log.id`.

### Wikilinks (`src/lib/wikilinks.mjs`)

- O link gerado passa de `/notes/<slug>/` para `/logs/<slug>/`.
- O mapa de títulos lê `src/content/posts` e `src/content/notes`, então `[[...]]` funciona para posts e notas.
- Alvo inexistente (slug fora do mapa): vira `<span class="wikilink-missing">texto</span>`, sem link, em vez de apontar para uma 404. Assim dá para citar uma nota que ainda não foi publicada.

## Páginas

| Rota | Arquivo | Conteúdo |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | topo + 01 experience + 02 open source + 03 logs + 04 links |
| `/logs/` | `src/pages/logs/index.astro` | lista completa de logs |
| `/logs/<id>/` | `src/pages/logs/[...slug].astro` | página de um post ou nota |
| `/cv/` | `src/pages/cv.astro` | página só para gerar o PDF |
| `/404` | `src/pages/404.astro` | página não encontrada |
| `/rss.xml` | `src/pages/rss.xml.js` | feed com posts e notas |

### Estrutura comum (`src/layouts/Base.astro`)

- Menu: `yuri@log:~$` à esquerda (link para `/`). À direita: `logs` (`/logs/`, com `aria-current` quando estiver em `/logs/...`), `experience` (`/#experience`), `oss` (`/#oss`, só se houver contribuições), `links` (`/#links`).
- Rodapé: `-- EOF --` à esquerda e `© <ano> <nome>` à direita.
- Mantém: link "skip to content", meta description, OG title/description, link do RSS, favicon.

### Home

1. **Topo** (duas colunas no desktop, empilhado abaixo de 720px):
   - Esquerda: `// <tagline>`, nome em minúsculas com cursor, `intro`, linha de status (`available` com ponto verde + `facts`).
   - Direita: bloco `tail ~/log` com os 6 primeiros itens de `getTimeline()`: data, rótulo de tipo colorido, texto. Cada linha é um link.
2. **experience** (`id="experience"`): metadado `~N yrs` (anos entre o `start` mais antigo e a data do build, arredondado; escondido se menor que 1). Cada emprego: período à esquerda; cargo, `@ empresa` e bullets com `>` em âmbar à direita. Botão `↓ cv.pdf` no fim.
3. **open source** (`id="oss"`, só se houver itens): metadado `N merged · M repos`. Cada PR: selo MERGED/OPEN, `repo #número · título`, `+adições −remoções` (se houver), frase de impacto abaixo. A linha inteira leva ao PR.
4. **logs** (`id="logs"`): metadado `N entries · rss` (o "rss" é link para `/rss.xml`). Os 6 logs mais recentes: data, tipo, título, meta à direita, resumo abaixo. Link `→ all logs` no fim.
5. **links** (`id="links"`): grade de duas colunas (uma no celular) com `$ <cmd>` e o rótulo. Links externos abrem na mesma aba.

**Sem logs:** a seção mostra `no entries yet` no lugar da lista.

### `/logs/`

Cabeçalho com o mesmo estilo de seção (`logs ─── N entries`) e uma frase curta explicando que posts são textos acabados e notas são rascunhos que mudam. Depois, a lista completa com o mesmo componente da home.

### `/logs/<id>/`

- Link `← cd ../logs` no topo.
- Linha de metadados:
  - Post: `2026-10-28 · POST · 8 min · performance, hardware` (+ `· updated YYYY-MM-DD` se houver `updated`).
  - Nota: `2026-10-30 · NOTE · seedling`.
- Título (grande, peso 800), resumo, divisória, texto.
- Prosa: `h2` com prefixo `## ` em `--mute`; links em âmbar sublinhados; wikilinks com sublinhado pontilhado; citações com borda âmbar à esquerda; código inline com fundo `--bg-2`; tabelas com bordas `--line` e números tabulares.
- No fim, se houver backlinks: `── linked from ──` com título e resumo de cada log que aponta para este. Vale para posts e notas.

### `/cv/`

- Não aparece no menu, tem `<meta name="robots" content="noindex">` e fica fora do sitemap (`sitemap({ filter: (page) => !page.includes('/cv/') })`).
- Layout próprio de impressão, fundo branco, fonte do sistema (`system-ui`), sem usar `Base.astro`. Mostra nome, headline, localização, contatos (vindos de `site.links`), resumo, experiência, skills, formação e idiomas.
- `scripts/cv_pdf.py` continua funcionando sem mudanças (abre `dist/cv/index.html`).

### 404

Texto `bash: cd: <caminho>: No such file or directory`. O caminho vem de `location.pathname` por um script inline curto; sem JavaScript, mostra `bash: cd: this page: No such file or directory`. Links `cd ~` (home) e `ls /logs` (lista).

### RSS

Todos os logs (posts e notas), com `link: /logs/<id>/`, `pubDate` = data do log e `description` = resumo.

## Arquivos

**Novos:** `src/data/oss.ts`, `src/layouts/LogLayout.astro`, `src/components/SectionHead.astro`, `src/components/Tail.astro`, `src/components/LogList.astro`, `src/components/Experience.astro`, `src/components/OssList.astro`, `src/components/Links.astro`, `src/pages/logs/index.astro`, `src/pages/logs/[...slug].astro`.

**Reescritos:** `src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/index.astro`, `src/pages/cv.astro`, `src/pages/404.astro`, `src/pages/rss.xml.js`, `src/lib/content.ts`, `src/lib/wikilinks.mjs`, `src/config.ts`, `src/data/cv.ts`, `src/content.config.ts`, `astro.config.mjs`, `README.md`.

**Removidos:** `src/pages/writing/`, `src/pages/notes/`, `src/pages/projects/`, `src/content/projects/`, `src/components/PostList.astro`, `src/components/NoteList.astro`, `src/components/ProjectList.astro`, `src/components/LatencyLadder.astro`, `src/layouts/Article.astro`, `src/layouts/ListPage.astro`.

**Dependências:** remover `@fontsource-variable/archivo` e `@fontsource-variable/source-serif-4` do `package.json`.

**Conteúdo de exemplo:** os posts e notas atuais ficam (são exemplos e agora apontam para `/logs/`). Os `TODO` em `config.ts` e `cv.ts` continuam para o dono preencher.

## Tratamento de erros

| Situação | Comportamento |
| --- | --- |
| Mesmo slug em posts e notas | build falha com mensagem dizendo qual slug e o que fazer |
| `contributions` vazio | seção e item de menu `oss` somem; seções renumeradas |
| Nenhum log | `no entries yet` na home e em `/logs/` |
| `additions`/`deletions` ausentes | a coluna +/− não aparece naquele PR |
| `available` ausente | linha de status mostra só os `facts` |
| `[[alvo]]` inexistente | texto sem link (`.wikilink-missing`) |
| Experiência com menos de 1 ano | metadado `~N yrs` escondido |

## Verificação

Não há framework de testes no projeto e não será adicionado um. A verificação é:

1. `npm run build` termina sem erros.
2. Com `npm run dev` (ou `npm run preview`), conferir no navegador em 1280px e 390px de largura: `/`, `/logs/`, um post, uma nota com backlinks, `/404`, `/cv/`. Sem rolagem horizontal no celular.
3. Clicar nos `[[wikilinks]]` das notas de exemplo e confirmar que levam a `/logs/<id>/` e que a nota de destino lista a origem em "linked from".
4. Colisão de slug: criar temporariamente `src/content/posts/mvcc.md`, confirmar que o build falha com a mensagem esperada e apagar o arquivo.
5. `contributions` vazio: a seção `open source` e o link `oss` não aparecem. Com um item de teste temporário, aparecem e a numeração fica 01–04.
6. `dist/sitemap-0.xml` não contém `/cv/`; `dist/cv/index.html` existe.
7. `dist/rss.xml` contém posts e notas com links `/logs/...`.
