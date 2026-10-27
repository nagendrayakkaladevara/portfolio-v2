# Content editing and operations

## Edit the current portfolio

Personal data: `src/data/portfolio.ts`. Change work history, projects, contact links, skills, recognition and education there. The avatar is `/images/headshot.png`, copied from the supplied image without alteration. The original resume remains `public/Sai-Nagendra-Resume-2025.pdf`; replace it and update the content module when a newer resume is ready. Review historical statements before treating them as current.

Writing fixture (imported into the app; never fetched over HTTP): `src/data/posts.json` with `schemaVersion:1` and a `posts` array. Every post needs a stable UUID, kebab-case unique slug, title/excerpt, UTC dates, reading time, tags, optional coverImage, isDemo, Markdown body and media array. Use UUIDs with a valid version/variant (e.g. `crypto.randomUUID()`), not manually incremented zero UUIDs. Lists sort newest first. A future-dated fixture is not displayed.

Keep `isDemo:true` for illustrative writing. Only change it after replacing the sample with a real article approved for publication. Sample articles are visibly labeled and excluded from generated RSS/sitemap. If all real content is still private, continue noindex configuration at the deployment boundary. The private Site audience remains private; changing a robots tag does not change access permissions.

For images now, add a local file under `public/images/`, include a matching media record with `url`, id, width, height, alt and nullable caption, and reference that URL in Markdown. An undeclared image intentionally displays a text fallback. Future owner drafts use `asset://UUID` and the API resolves approved R2 renditions; that token format is not directly accepted as a public image URL by this preview renderer.

## Local commands

Node22.12+ (or a compatible newer LTS supporting Vite8); pnpm version pinned in `package.json`. From a portable checkout:

```bash
pnpm install --frozen-lockfile
cp env.example .env.local
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

The generated site is in `dist/`. `pnpm build` runs the TypeScript check, Vite bundle and content build. RSS/sitemap/route entry points are generated at build time; the raw Vite development server does not generate them. Changes to `src/data/posts.json` need a rebuild for those artifacts. Source code export includes a generic Vite config with no hosting-specific identity.

`python scripts/generate-api-spec.py` regenerates OpenAPI/examples from the source contract generator. Review both the generator and emitted document in a contract change. `python scripts/export-source.py` exports the source and specs ZIPs without credentials, node_modules, deployment identity or prior archives.

## Configuration inventory

| Setting | Location | Purpose |
| --- | --- | --- |
| VITE_CONTENT_SOURCE | Frontend build | `json` now; `api` for future real service |
| VITE_API_BASE_URL | Frontend build | Public API origin/path, default `/api/v1`; never a secret |
| VITE_SITE_URL | Frontend build | Canonical origin for generated route metadata/feed/sitemap |
| Database connection | Future server secret | PostgreSQL TLS credentials |
| OIDC issuer/client/secret/callback | Future server configuration/secrets | Owner login |
| Owner subject allowlist | Future server configuration | Exact trusted owner identity |
| Session encryption keys | Future durable secret storage | Shared/rotated cookie protection across instances |
| R2 account/access/secret keys | Future server secret | S3 SDK authentication; least privilege |
| Private/public bucket + asset domain | Future server config | Storage locations and allowed rendition URL origin |
| Allowed owner origins | Future server/R2 config | CORS and CSRF origin checks |
| Cursor signing secret | Future server secret | Opaque pagination integrity; rotate with grace window |
| Publication build hook credentials | Future server secret | Trigger and observe prerender/CDN refresh |

Use separate development/staging/production databases, buckets, keys and OIDC callbacks. Never share production credentials with local tests. The current Site has no R2 or database binding configured because the backend is deferred.

## Build, deployment and rollback

The existing Site deployment is owner-private. A successful source revision is built and saved through its hosting workflow; source and deployment remain tied to the same commit. Do not broaden audience as part of a content update. The source ZIP is a portable derivative; the tracked repository is the canonical implementation.

For an independent static host, serve generated files and configure SPA fallback for client routes while preserving real asset404s. Fixture routes have generated directory entry points. Unknown route404 status depends on host configuration; implement and test this explicitly before production. Never rewrite `/api/*` to `index.html`. The future gateway must route API requests to .NET and static routes to the frontend, with no authenticated response caching.

Rollback frontend to the last known-good immutable deployment. Database migrations use expand/contract: deploy additive changes, migrate data, then remove fields only after old clients are gone. A frontend rollback cannot undo a schema migration or content publication. Keep migration backups and publication history; rollback article content by explicitly publishing a chosen stored revision through the future editor/service.

## Recovery drills for the future backend

| Failure | Response |
| --- | --- |
| R2 upload expires | Reserve a new upload; do not reuse expired signed URLs |
| Image validation fails | Show rejection code, keep article draft, upload a valid replacement |
| Worker crashes mid-job | Lease expires; retry idempotent stage from durable outbox |
| Public copy succeeds / DB fails | Keep prior public revision; reconcile orphan renditions later |
| DB cutover succeeds / refresh fails | Operation stays retrying at refreshing; retry forward until caches/build converge |
| API unavailable | Reader sees recoverable error; no silent fixture fallback |
| Prerender fails | Serve last-good build; alert and retry; API/publication state remains observable |
| Database restore | Restore DB, verify referenced R2 inventory, rebuild views/feed, invalidate caches |
| Credentials compromised | Revoke/rotate key, invalidate sessions if relevant, inspect redacted audit log, reissue affected operations |

## Content and accessibility review

Before publishing: verify factual claims and dates, title/excerpt, links, unique slug, useful heading hierarchy, image alt/captions, no confidential content, complete publication state and correct canonical URL. Check real Markdown in narrow layout with long code lines. Keep article content original or properly licensed; the reference is a design source, not a writing source.

Before calling the application production-ready: finish the backend and SEO phases, run browser/screen-reader checks, measure performance, verify deployed404s/cache headers, test restore/rollback, and resolve all release gates in the implementation plan.

## Retire the temporary JSON when the API is ready

First implement and verify the documented public API and set `VITE_CONTENT_SOURCE=api`. After migration, remove the `bundledPosts` import and `JsonContentRepository` from `src/features/writing/repository.ts`, select `HttpContentRepository` directly, and delete `src/data/posts.json`. Move sample test data into test fixtures and update `scripts/generate-api-spec.py` to read those fixtures for documentation examples. The content build already skips the local JSON in API mode; replace that branch with the planned API snapshot/prerender/feed workflow before public production launch. The page components and query hooks do not need to change.

## Chat configuration

`src/data/chat.json` controls demo welcome text, starter questions and input limits. Demo facts are derived from the existing public `src/data/portfolio.ts`, not a second hidden biography. Set `VITE_CHAT_SOURCE=api` only when the endpoints in the chat addendum are live; the API supplies both UI configuration and answers. Sessions/transcripts remain browser memory only. New chat deletes the server conversation before clearing it in API mode. Refresh creates a new conversation; this release does not restore chat history.

Keep provider secrets, model selection, knowledge policy and spend limits on the backend. The current deployment remains a demo with no AI provider calls or charges. After launch, investigate failed streams using trace/turn IDs and safe codes; never capture tokens or full conversations in ordinary request logs.

## Implemented publishing Studio

The `/admin` route now provides owner OIDC sign-in, article search and status filtering, draft creation, Markdown editing and preview, publication/archive controls, R2 image upload/insertion/cover selection, and version history. Owner routes use memory-only access tokens. Configure public `VITE_OIDC_*` values from `env.example` and the matching backend `AUTH_*` values. Register the exact `/admin/callback` redirect URI. Sign out clears the local Studio session, not the identity provider's global session. The backend enforces the immutable owner subject; hiding the route is not authorization.

The companion Express backend implements `/api/v1/admin/session`, owner article listings and revision history. Its `docs/DEPLOYMENT.md` contains account configuration and release commands. Use `VITE_CONTENT_SOURCE=api` only after the API and real content are available. Public JSON mode stays available during setup; API failures never silently switch to sample content.

Production builds in API mode fetch all published summaries from an absolute HTTPS `VITE_API_BASE_URL` to generate article metadata, RSS and sitemap. Republish the frontend after content changes to refresh those static files. Public article bodies continue loading from the API. The static host needs an SPA fallback for article and Studio detail URLs.
