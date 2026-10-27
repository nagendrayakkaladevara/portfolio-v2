# Libraries and technology choices

> **Backend implementation update · 8 October 2026:** Express 5 + TypeScript, Neon PostgreSQL, Cloudflare R2 and Zod replace the earlier ASP.NET proposal. See [current implementation and contracts](10-backend-implementation.md)
Versions below are the package.json constraints used by this implementation on 7 October 2026. `pnpm-lock.yaml` fixes exact resolved versions and is authoritative for reproducible installation. These are installed versions, not an assertion that each is the latest available release.

## Frontend and tooling

| Package | Constraint | Role |
| --- | --- | --- |
| `@fontsource-variable/geist` | `^5.3.0` | Self-hosted variable font |
| `@tanstack/react-query` | `^5.104.0` | Server state, cursor pagination, cancellation and retries |
| `class-variance-authority` | `0.7.1` | shadcn component variants |
| `clsx` | `2.1.1` | Conditional classes |
| `lucide-react` | `^1.31.0` | Icons |
| `mdast-util-to-string` | `^4.0.0` | Heading label extraction |
| `motion` | `^12.43.0` | Motion.dev React animations and reduced-motion support |
| `radix-ui` | `^1.6.7` | Accessible primitives used by local shadcn components |
| `react` | `19.2.6` | Component runtime |
| `react-dom` | `19.2.6` | DOM rendering |
| `react-markdown` | `^10.1.0` | Safe Markdown-to-React rendering without executable MDX |
| `react-router-dom` | `^7.18.4` | Declarative routes and navigation |
| `remark-gfm` | `^4.0.1` | Tables, task lists and other GFM syntax |
| `remark-parse` | `^11.0.0` | Markdown AST for shared heading extraction |
| `tailwind-merge` | `3.6.0` | Tailwind class composition |
| `uisfx` | `0.4.0` | Optional interaction sounds (minimal pack) |
| `unified` | `^11.0.5` | Markdown parsing pipeline |
| `unist-util-visit` | `^5.1.0` | AST traversal |
| `zod` | `^4.6.5` | Runtime public-content validation |
| `@apidevtools/swagger-parser` | `^12.1.0` | OpenAPI structural validation |
| `@tailwindcss/postcss` | `4.2.1` | Tailwind CSS build integration |
| `@types/mdast` | `^4.0.4` | Typed Markdown AST |
| `@types/node` | `22.19.19` | Build script/tool types |
| `@types/react` | `19.2.14` | React type definitions |
| `@types/react-dom` | `19.2.3` | DOM rendering type definitions |
| `@vitejs/plugin-react` | `6.0.2` | React transform |
| `tailwindcss` | `4.2.1` | Styling engine |
| `tw-animate-css` | `^1.4.0` | shadcn animation utility styles |
| `typescript` | `5.9.3` | Static typing |
| `vite` | `8.0.13` | Dev/build tooling |
| `vitest` | `^4.1.11` | Repository/render/contract tests |

`shadcn/ui` is a component source distribution, not a single runtime dependency. Owned component files are in `components/ui/`; their Radix primitives, Tailwind tokens and class helpers appear above. The implementation uses Avatar, Badge, Button, Card and Dialog. Keep updates intentional and review local changes before overwriting these files from the CLI.

The main application uses React Router declarative routing, not Next.js. No framework migration is required for the JSON preview. TanStack Query is the only remote-state cache; avoid adding a second fetch/cache library. Zod validates public responses as well as local fixtures. Markdown rendering skips raw HTML and constrains images to declared media; future backend publication performs additional validation.

## Backend libraries (implemented Express project)

Node 24, strict TypeScript, npm lockfile. Full versions are committed in the backend package-lock.json.

| Package | Version range |
|---|---|
| `@aws-sdk/client-s3` | `^3.1147.0` |
| `@aws-sdk/s3-request-presigner` | `^3.1147.0` |
| `cors` | `^2.8.6` |
| `dotenv` | `^18.0.6` |
| `express` | `^5.2.1` |
| `express-rate-limit` | `^8.7.1` |
| `helmet` | `^8.3.0` |
| `jose` | `^6.2.12` |
| `pg` | `^8.23.1` |
| `pino` | `^10.4.0` |
| `pino-http` | `^11.0.0` |
| `sharp` | `^0.35.5` |
| `zod` | `^4.6.5` |

Vitest, Supertest and PGlite test actual SQL and HTTP boundaries. JWT access tokens use JOSE and an owner subject allowlist. No provider SDK is selected until the AI endpoint is supplied.

## Primary documentation

- React: https://react.dev/
- React Router: https://reactrouter.com/start/declarative/routing
- shadcn/ui: https://ui.shadcn.com/
- Motion: https://motion.dev/docs/react
- UI SFX: https://uisfx.com/
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Zod: https://zod.dev/
- react-markdown: https://github.com/remarkjs/react-markdown
- Cloudflare R2: https://developers.cloudflare.com/r2/

Library choices should serve the design. Keep list rows and prose semantic and lightweight; do not introduce a large editor or animation package into the public reading path merely because the admin UI might eventually need it.

## Chat implementation choices

The CRT uses Koboyo’s original WebP sprite sheets and an MIT-attributed TypeScript adaptation of page-mascot 0.1.0, with cursor tracking and click reaction. The window reuses shadcn Dialog/Button and Lucide; TanStack Query loads configuration and Zod validates chat responses. Native fetch/ReadableStream/TextDecoder handles the application-owned SSE protocol. No model provider key is required for the demo. Responses render as plain text, with separately validated source links.

The backend uses a typed `AgentProvider` interface. Generation remains disabled until the AI endpoint and its protocol are supplied.
