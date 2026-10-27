# Sai Nagendra portfolio — application specification

Version 1.1 · 8 October 2026 · Status: frontend preview implemented; Express backend foundation implemented in a separate repository; external services unconfigured.

The source of truth for the current UI is the React application. The implemented contract is in the backend repository’s `docs/openapi.json` and `04-backend-requirements.md`. The root `openapi.json` retains the larger planned CMS contract; the backend requirements explain the behaviors that a schema alone cannot express. These documents do not imply that a backend, admin editor, R2 bucket, or public production service has been deployed.

## Reading order

| File | Purpose |
| --- | --- |
| [01-prd.md](01-prd.md) | Product goals, scope, user flows, acceptance criteria |
| [02-architecture.md](02-architecture.md) | Frontend boundaries, target backend, data model, publication flow |
| [03-design-spec.md](03-design-spec.md) | Reference measurements, tokens, states, responsive and accessibility rules |
| [04-backend-requirements.md](04-backend-requirements.md) | Endpoint semantics, concurrency, authentication, R2, operations |
| [openapi.json](openapi.json) | Importable OpenAPI 3.0.3 specification with request/response schemas |
| [examples](examples/) | Concrete public API, draft, upload and error examples |
| [05-implementation-plan.md](05-implementation-plan.md) | Ordered engineering tasks, dependencies, release gates |
| [06-libraries.md](06-libraries.md) | Installed versions, roles, proposed backend libraries |
| [07-content-and-operations.md](07-content-and-operations.md) | Editing guide, environments, deployments, recovery, SEO |
| [09-ai-chat-requirements.md](09-ai-chat-requirements.md) | CRT chat UI, sessions, streaming, grounded answers and AI operations |
| [08-validation.md](08-validation.md) | Verification evidence and work still requiring browser/backend checks |

## Decisions already made

React + TypeScript; shadcn/ui; Motion from motion.dev; optional sounds from UI SFX; original uploaded headshot; narrow, understated reference layout; `/posts` archive and `/posts/:slug` articles; JSON fixtures now; HTTP adapter later; Markdown articles; Cloudflare R2 for future blog images. Sample writing is explicitly labeled and excluded from RSS and sitemap article entries.

The selected backend is Express 5 with TypeScript, Neon PostgreSQL and Cloudflare R2, as requested. Hosting provider, canonical production domain, OIDC provider, and account-specific R2 details remain configuration decisions before phase 2. No cloud resources or paid services are provisioned by this preview.

## Traceability and maintenance

PRD IDs identify acceptance criteria. Each phase in the implementation plan lists those IDs. Changes to public JSON fields require changes to OpenAPI, Zod contracts, examples, and adapter tests together. Breaking HTTP changes use `/api/v2`. Store approved design deviations in the design spec. Keep personal resume facts separate from illustrative article content.
