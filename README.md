# Portfolio

Site pessoal em [Astro](https://astro.build): posts, notas (digital garden), projetos e currículo. Site estático, sem framework de JS no cliente, fontes servidas pelo próprio site.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
```

## Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Nome, frase de apresentação, links | `src/config.ts` |
| Currículo (página `/cv/` e PDF) | `src/data/cv.ts` |
| Posts | `src/content/posts/*.md` |
| Notas | `src/content/notes/*.md` |
| Projetos | `src/content/projects/*.md` |
| Cores e tipografia | `src/styles/global.css` (tokens no topo) |

Os posts, notas e o projeto que vêm no repositório são exemplos. Apague ou reescreva à vontade. Procure por `TODO` para achar o que precisa preencher.

### Frontmatter

```yaml
# post
title: Título
description: Uma frase que aparece na lista.
date: 2026-11-02
tags: [databases]
draft: true        # opcional: não publica, só aparece no `npm run dev`

# nota
title: MVCC
summary: Uma frase.
status: seedling   # seedling | growing | evergreen
updated: 2026-11-02
```

## Escrever no Obsidian

As notas aceitam `[[nome-da-nota]]` e `[[nome-da-nota|texto]]`, igual ao Obsidian. O link vira `/notes/nome-da-nota/` e cada nota mostra no rodapé quem aponta para ela.

Para escrever direto do seu vault, você pode:

- abrir `src/content` como um vault separado no Obsidian, ou
- criar um link simbólico de uma pasta do seu vault para `src/content/notes`:
  `ln -s ~/Obsidian/03-Recursos/Publicar src/content/notes`

Só vai para o site o que estiver nessa pasta, então suas notas privadas continuam privadas.

## PDF do currículo

```bash
npm run build
pip install playwright && playwright install chromium
python scripts/cv_pdf.py   # gera public/cv.pdf a partir da página /cv/
npm run build              # copia o PDF para dist/
```

## Publicar

**GitHub Pages:** suba o repositório, vá em Settings → Pages → Source: GitHub Actions. O workflow em `.github/workflows/deploy.yml` publica a cada push na `main`.

**Cloudflare Pages ou Vercel:** importe o repositório; comando de build `npm run build`, pasta de saída `dist`.

Antes do primeiro deploy, troque `site` em `astro.config.mjs` pelo seu domínio. Um `.dev` próprio custa pouco por ano e passa a impressão certa.

## Já incluso

- RSS em `/rss.xml` e sitemap
- Tema claro e escuro (segue o sistema, com botão para trocar)
- Destaque de código com tema claro e escuro
- Página de currículo com estilos de impressão
