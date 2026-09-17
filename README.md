# C++ Tips

An Astro site for long-form C++ articles, focused tips, and short compiler and
language updates. The codebase was originally derived from the
[Chirping Astro starter](https://github.com/kannansuresh/chirping-astro-starter)
and is being substantially customized for cpp.tips.

## Project structure

```text
assets/                 shared source assets processed by Astro
content/
  articles/             long-form articles
  tips/                 short-form tips and insights
  updates/              updates, cool stuff that's happening and whatnot
  pages/                other pages
public/                 fixed-name files copied verbatim to the built site
src/                    application code: routes, layouts, components, utilities
styles/                 site-wide styles
```

Keep files that belong to one entry beside its Markdown file. For example,
`content/articles/example/index.md` and `content/articles/example/diagram.svg`
travel together. Use `assets/` only for shared site-wide resources such as the
logo. Use `public/` only when a file must retain its exact filename and contents,
such as `robots.txt` or the RSS and sitemap stylesheets.

Content URLs follow their type: `/articles/<slug>/`, `/tips/<slug>/`, and
`/updates/<slug>/`. The site is English-only and has no language-prefixed routes.

Posts may declare one or more contributors in frontmatter. If `authors` is
omitted, the site-wide author from `src/config.ts` is used:

```yaml
authors:
  - name: Contributor Name
    url: https://example.com
```

Control the homepage reel with `showcase` in a post's frontmatter:

```yaml
showcase: hide # Never include this post in the reel
showcase: feature # Always include it, subject to the five-post limit
```

The default is `showcase: auto`: the newest eligible article, tip, and update
are included first, then the remaining recent posts fill the reel. `highlighted: true`
remains a compatibility alias for `showcase: feature`; `showcase: hide` wins if both are set.

## Develop

Install [Bun](https://bun.sh/), then run:

```sh
bun install
bun run dev
```

Astro serves the site at <http://localhost:4321>. A Dev Container is also
provided for contributors who prefer a containerized environment.

## Verify

```sh
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
```

Site identity and navigation live in `src/config.ts`; visual tokens and layout
styles live in `styles/global.css`. Copy `.env.example` to `.env` for local
overrides. The GitHub Pages workflow deploys to <https://cpp.tips/> by default.

## Tooling

`package.json` is the JavaScript project manifest and `bun.lock` makes installs
reproducible; both are required. Bun runs all package scripts, so there is no
second npm lockfile or parallel package-manager configuration. The Dockerfile is
used only by the optional Dev Container; normal local development does not need
Docker.
