# Sai Nagendra — Portfolio and Writing

> Backend now uses Express/TypeScript, Neon and R2. See [implementation status](docs/10-backend-implementation.md).
React + TypeScript portfolio based on the measured layout of [kamran.fyi](https://kamran.fyi/), with the supplied headshot, shadcn/ui components, Motion animations and optional UI SFX sounds. Includes home, Writing archive, article pages, light/dark themes, and eight clearly labeled sample articles.

## Run locally

Use Node 24 LTS and the pnpm version declared in package.json.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Writing imports `src/data/posts.json` directly into the application bundle. It makes no JSON fetch or API request in JSON mode; no backend or credentials are needed. The portable source ZIP contains a standard Vite config and does not require Sites. Deploy `dist/` to a static host with SPA routing; never rewrite API requests to HTML.

## Edit content

- `src/data/portfolio.ts`: biography, employment, projects, contact links, skills and education.
- `public/images/headshot.png`: original supplied headshot.
- `public/Sai-Nagendra-Resume-2025.pdf`: historical resume; review before public sharing.
- `src/data/posts.json`: sample Markdown articles, dates, tags and image metadata.
- `src/styles.css`: layout measurements, tokens and responsive behavior.

All fixture articles are illustrative and marked `isDemo:true`; they are not claims of previously published writing. Only remove this flag after replacing them with approved real articles. Generated RSS and sitemap exclude samples.

Copy `env.example` to `.env.local` for public build-time configuration. `VITE_CONTENT_SOURCE=api` switches the Writing repository to `/api/v1` (or `VITE_API_BASE_URL`), without changing components. The implemented Express API lives in [portfolio-v2-BE](https://github.com/nagendrayakkaladevara/portfolio-v2-BE). Configure its Neon database, R2 storage, owner identity provider, and hosting before enabling API mode. HTTP failure does not silently fall back to samples. The profile currently remains a static module.

## Application specifications

Start with [docs/README.md](docs/README.md). The package includes PRD, architecture/data model, measured design spec, backend requirements, OpenAPI3.0.3 with36 operations/58 schemas, concrete request/response examples, implementation phases, library choices, content/operations guide and verification report. The current backend uses Express + TypeScript, Neon PostgreSQL and Cloudflare R2. Earlier .NET specifications are historical roadmap material; the implemented contract is documented in the backend repository. The owner Studio is available at `/admin`; external services and live deployment still require configuration.

## Architecture

React Router handles page navigation; TanStack Query handles request state, retry and pagination. Zod validates data. JSON and HTTP repositories share an interface. ReactMarkdown renders safe Markdown, GFM tables and code; heading anchors and contents navigation share an AST parser. Images render only from declared media metadata. Article code is loaded separately from the home page. Theme and sound preferences live in the shared shell.

Build-time route entry points carry metadata, but article bodies are client-rendered. Full prerender/SSR, proper hosted404 behavior and publication-driven feed/cache refresh are explicit production gates. This preview is not described as a complete production publishing system.

## Verification and exports

Run `pnpm typecheck`, `pnpm test`, and `pnpm build`. Tests cover fixture/schema compatibility, pagination, HTTP failure/cancellation, Markdown anchors/safety, and OpenAPI validity. Browser visual/accessibility QA was unavailable in this environment; exact pixel parity is not certified. See [docs/08-validation.md](docs/08-validation.md).

```bash
python scripts/generate-api-spec.py
python scripts/export-source.py
```

Exports source and specification ZIPs to `public/`. Exports omit credentials, runtime data, hosting identity and build output. This repository is the portable frontend source; its build has no dependency on ChatGPT Sites.

Design reference: Kamran Ahmed’s portfolio. Personal content derives from the supplied resume/context; sample writing is original illustrative text. Dependencies retain their respective licenses.

## CRT AI Agent

A small CRT mascot stays in the bottom-right corner. Click it to open a clean chat window with starter questions, progressive replies, verified local source links, Stop, Retry and New chat. The demo is clearly labeled and uses only public portfolio facts. It does not call an AI provider.

`src/data/chat.json` edits the welcome/questions; `VITE_CHAT_SOURCE=demo` is the default. `api` selects the future backend transport, which loads configuration and streams answers from `/api/v1/chat/...`. It never silently falls back to demo replies. The original backend roadmap includes anonymous sessions, grounded knowledge retrieval, SSE events, owner settings/reindexing, privacy, rate limits and budgets. Read [docs/09-ai-chat-requirements.md](docs/09-ai-chat-requirements.md) and the updated OpenAPI/examples.

## Owner Studio

Open `/admin` to manage drafts, publish/archive articles, inspect revision history,
and upload images through the backend. Sign-in uses OIDC Authorization Code +
PKCE. Set the public `VITE_OIDC_*` configuration in `env.example` and register
`/admin/callback` with the identity provider. Never add a client secret to this app.

The default build uses sample Writing data and explicit demo chat. Owner sign-in,
image uploads and API content require the separately deployed backend. Live AI
chat remains unavailable until its provider integration is implemented.

## Source recovery

Recovered from the existing portfolio Site source at commit
`30fa239` and prepared as a standalone Vite project. Hosting identity,
checkout-specific tools and previously generated ZIPs are excluded. Application
source, original assets, specifications and existing tests are retained. This
recovered project includes the supplied profile information, headshot and resume.
Review these files before publishing the repository publicly.
