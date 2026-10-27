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

## Proposed backend libraries (not installed)

| Technology | Version family / policy | Use |
| --- | --- | --- |
| .NET / ASP.NET Core | 10 LTS; latest supported servicing patch when implemented | HTTP endpoints, OIDC/cookie auth, authorization, rate limits, health checks |
| EF Core | 10.x compatible with runtime | Migrations, persistence, optimistic concurrency |
| Npgsql EF Core provider | Compatible10.x release selected at implementation | PostgreSQL provider; verify actual compatibility matrix |
| AWSSDK.S3 | Current maintained compatible release, pinned after R2 integration tests | R2 S3 upload signing, HEAD/GET/COPY/DELETE |
| System.Text.Json | Runtime bundled | Camel-case DTO serialization |
| Markdig | Maintained pinned stable release | Parse/validate stored Markdown and asset tokens on server |
| Magick.NET | Maintained pinned stable Q8 build after deployment/format/license review | Bounded image decode, orientation cleanup, EXIF removal, WebP renditions |
| OpenTelemetry .NET | Maintained compatible stable packages | Traces/metrics with exporter selected for host |
| xUnit + Microsoft.AspNetCore.Mvc.Testing | Maintained runtime-compatible releases | Endpoint/auth/concurrency integration tests |
| Testcontainers for .NET | Maintained stable version | Isolated real PostgreSQL in CI |
| React Hook Form | Future admin-only package; pin during phase4 | Accessible editor forms with Zod validation |

Do not lock speculative future package patches in this document. Resolve and pin supported versions when backend work begins; commit the .NET lock/configuration files. Check native image library deployment support, vulnerabilities and licensing before production. No paid image service is required by this design; R2/account costs depend on actual usage.

No Kafka, Redis, external queue, search cluster or separate microservice is required initially. PostgreSQL outbox + a durable worker handles publication reliably at this scale. Add infrastructure only when an observed throughput or reliability need justifies it.

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
- Markdig: https://github.com/xoofx/markdig
- Magick.NET: https://github.com/dlemstra/Magick.NET
- Npgsql EF Core10: https://www.npgsql.org/efcore/release-notes/10.0.html
- .NET lifecycle: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core

Library choices should serve the design. Keep list rows and prose semantic and lightweight; do not introduce a large editor or animation package into the public reading path merely because the admin UI might eventually need it.

## Chat implementation choices

The CRT uses Koboyo’s original WebP sprite sheets and an MIT-attributed TypeScript adaptation of page-mascot 0.1.0, with cursor tracking and click reaction. The window reuses shadcn Dialog/Button and Lucide; TanStack Query loads configuration and Zod validates chat responses. Native fetch/ReadableStream/TextDecoder handles the application-owned SSE protocol. No model provider key is required for the demo. Responses render as plain text, with separately validated source links.

The planned .NET backend adds a compatible pinned Microsoft.Extensions.AI package and the selected provider adapter at implementation time. IChatClient supports a provider boundary and streaming responses. ASP.NET Core10’s SSE result facilities can implement the specified protocol. This choice preserves the already proposed .NET architecture; a separate Node AI service or Vercel AI SDK runtime is not required. Exact provider/model versions remain server configuration to verify when the backend is built.
