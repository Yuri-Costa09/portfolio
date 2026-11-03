# Portfolio

Site pessoal em [Astro](https://astro.build), tema escuro, tudo em monoespaçado: logs (posts e notas), experiência, contribuições open source e links. Site estático, sem framework de JS no cliente, fonte servida pelo próprio site.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # testes das funções puras (node --test)
npm run build    # gera dist/
```

## Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Nome, tagline, apresentação, status, links | `src/config.ts` |
| Experiência (home, `/cv/` e PDF) | `src/data/cv.ts` |
| Contribuições open source | `src/data/oss.ts` |
| Posts | `src/content/posts/*.md` |
| Notas | `src/content/notes/*.md` |
| Cores e fonte | `src/styles/global.css` (tokens no topo) |

Procure por `TODO` para achar o que precisa preencher.

## Logs

Posts e notas aparecem juntos no feed (`/logs/`) e cada um vira `/logs/<nome-do-arquivo>/`. Por isso **um post e uma nota não podem ter o mesmo nome de arquivo**: o build para com uma mensagem dizendo qual.

```yaml
# post (src/content/posts)
title: Título
description: Uma frase que aparece na lista.
date: 2026-11-02
tags: [databases]
draft: true        # opcional: só aparece no `npm run dev`

# nota (src/content/notes)
title: MVCC
summary: Uma frase.
status: seedling   # seedling | growing | evergreen
updated: 2026-11-02
```

## Open source

Cada contribuição é um item em `src/data/oss.ts`: repositório, número do PR, título, link, status (`merged` ou `open`), data (`YYYY-MM-DD`) e uma frase de impacto. `additions`/`deletions` são opcionais. Com a lista vazia, a seção e o link `oss` do menu somem.

## Experiência

Em `src/data/cv.ts`, cada emprego tem `start` e, se já acabou, `end`, no formato `YYYY-MM`. A data de início também aparece no `tail ~/log` do topo da home.

## Escrever no Obsidian

Posts e notas aceitam `[[nome]]` e `[[nome|texto]]`, igual ao Obsidian. O link vira `/logs/nome/` e cada página mostra no rodapé quem aponta para ela ("linked from"). Se o alvo ainda não existe, o texto aparece sem link.

Para escrever direto do seu vault, você pode:

- abrir `src/content` como um vault separado no Obsidian, ou
- criar um link simbólico de uma pasta do seu vault para `src/content/notes`:
  `ln -s ~/Obsidian/03-Recursos/Publicar src/content/notes`

Só vai para o site o que estiver nessas pastas.

## PDF do currículo

A página `/cv/` existe só para gerar o PDF: não aparece no menu nem no sitemap.

```bash
npm run build
pip install playwright && playwright install chromium
python scripts/cv_pdf.py   # gera public/cv.pdf a partir de /cv/
npm run build              # copia o PDF para dist/
```

## Publicar

**GitHub Pages:** suba o repositório, vá em Settings → Pages → Source: GitHub Actions. O workflow em `.github/workflows/deploy.yml` publica a cada push na `main`.

**Cloudflare Pages ou Vercel:** importe o repositório; comando de build `npm run build`, pasta de saída `dist`.

Antes do primeiro deploy, troque `site` em `astro.config.mjs` pelo seu domínio.

## Já incluso

- RSS em `/rss.xml` (posts e notas) e sitemap
- Destaque de código com o tema `vesper`
- 404 no estilo terminal
