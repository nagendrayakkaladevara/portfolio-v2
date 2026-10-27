# Implementation plan

> **Backend implementation update · 8 October 2026:** Express 5 + TypeScript, Neon PostgreSQL, Cloudflare R2 and Zod replace the earlier ASP.NET proposal. See [current implementation and contracts](10-backend-implementation.md)
Status labels describe delivered work in this repository, not a promise of a running backend. Implement phases in order. Each phase ends with a reviewable result and explicit exit gate. Effort depends on hosting/editor choices; no delivery-date estimate is implied.

## Phase 1 — portfolio and Writing preview (implemented)

| Task | Deliverable | Verification / PRD |
| --- | --- | --- |
| Use supplied identity | Original headshot, CSS crop, editable profile module | Avatar path and source asset verified; P01 |
| Match the reference | Home retained, archive and reading layouts, responsive sidebar | Measurements documented; browser visual comparison outstanding; P02 |
| Add routing and states | `/posts`, article route, not-found, retry/loading/empty | Typecheck and adapter/render tests; P03–P05 |
| Separate content access | Zod contracts, repository interface, JSON and HTTP adapters | Payload validation, cursor and failure tests; P06 |
| Add example writing | Eight original illustrative Markdown posts, sample labels | All `isDemo:true`, excluded from feeds; P08 |
| Preserve interaction controls | Theme, dialogs, optional sound, reduced motion | Source review; browser accessibility checks pending; P07 |
| Document future service | PRD, architecture, design, requirements, OpenAPI, examples | OpenAPI structural validation and sample compatibility |

Before public portfolio use: owner reviews current role, dates, resume, links, sample content and headshot crop. Do a browser pass at the design matrix sizes. Never present code checks as visual parity certification.

## Phase 2 — backend foundation

Dependencies: production domain/gateway, .NET hosting, PostgreSQL connection, OIDC provider and owner subject, R2 account/buckets and custom asset domain.

1. Create solution projects `Portfolio.Api`, `Portfolio.Application`, `Portfolio.Infrastructure`, `Portfolio.Worker`, and contract/integration tests. Keep domain modules within those projects; avoid service-per-module deployment.
2. Add health endpoints, structured logging, RFC9457 errors, trace IDs, configuration validation, database migrations and environment separation.
3. Implement migrations/constraints for profiles, posts/revisions, assets/variants/references, operations, outbox, idempotency keys and audit events.
4. Configure OIDC, encrypted persistent session keys, subject allowlist, cookie settings, CSRF, trusted proxies, gateway routing and rate limits.
5. Implement public profile/posts endpoints and private draft/history endpoints. Add DTOs generated from or checked against OpenAPI. Implement stable keyset pagination and conditional requests.
6. Implement optimistic concurrency and idempotency before adding publication endpoints. Race tests must exercise actual database transactions, not in-memory repository mocks.

Exit: public API integration tests pass, unauthenticated admin calls fail, CSRF bypasses fail, invalid cursor and stale ETag cases behave as specified, drafts cannot leak through any public route. P06, P09, P12.

## Phase 3 — image pipeline on R2

1. Provision private and public buckets outside the frontend; enable custom public asset domain; configure exact-origin private upload CORS and scoped server-only credentials.
2. Implement upload reservation, quotas, signed PUT, complete, metadata, preview and deletion endpoints.
3. Build durable asset worker: immutable upload snapshot, bounded decode, MIME/size/dimension/hash verification, orientation/metadata cleanup, WebP renditions, rejection reporting and no-store private preview.
4. Add lifecycle and orphan cleanup with reference/operation checks. Track orphan bytes and job age. Test presigned URL reuse/expiry and overwrite races.

Exit: valid raster formats work; spoofed MIME, SVG, oversized/decompression-abuse and missing uploads are rejected; drafts cannot be fetched from the public domain; referenced assets cannot be deleted. P10, P14.

## Phase 4 — owner editor and publication

1. Build `/admin` separately from the public reading bundle. Use shadcn/ui forms/dialogs, React Hook Form and Zod. Add draft list, editor, image manager, split preview, revision history and operation status.
2. Editor stores Markdown with asset IDs, not public URLs. Validate references; require alt text or an explicit decorative choice. Autosave is optional; start with explicit Save and unsaved-changes navigation protection.
3. On412 display a recoverable conflict: keep local edits, retrieve latest revision and let the owner compare/copy changes. Never silently overwrite server content.
4. Implement publish/unpublish with outbox, per-post operation locking, immutable rendition promotion, atomic public revision cutover, retries and cache/prerender refresh.
5. Test saving during publication, two simultaneous publish requests, repeated idempotency keys, worker crash after R2 copy and after DB commit, and refreshing-stage retry.

Exit: published page stays unchanged during draft editing; a failed pre-commit operation retains the old article; successful publication exposes exactly the requested revision; operation status survives restart. P09–P12, P14.

## Phase 5 — frontend API integration and public launch

1. Point `VITE_CONTENT_SOURCE=api` at the same-origin gateway. Import/verify public DTO compatibility. Replace the static profile adapter separately; do not pretend the existing profile module already consumes the API.
2. Remove fixture content from the production deployment, publish real articles, and review current biography/resume. Keep a separate staging environment with labeled demos.
3. Implement deterministic public snapshot/prerender or server rendering. Generate complete HTML bodies and metadata, correct404 responses, Article JSON-LD, social preview images, canonical URLs, feed/sitemap and robots rules. Make publication refresh retryable with last-good output retained.
4. Verify deployed frontend → API → PostgreSQL → R2 end-to-end. Test private/public caches separately. Validate public canonical host and asset domain TLS.
5. Run browser visual comparisons, keyboard/screen-reader checks, reduced motion/sound preferences, narrow layouts, mobile perf and failure recovery. Resolve essential-text contrast issues before WCAG AA claim.
6. Perform backup restore and rollback drill, configure alerts, and review secrets/permissions. Launch only after owner content review.

Exit: P01–P14, public-route SEO and accessibility/performance targets verified. Backend launch is a separate future deliverable from this preview.

## Work sequencing and gates

Backend draft/public reads can be completed before the editor; asset upload contract precedes image editor controls; revision model and concurrency precede publishing; publishing state changes precede cache/prerender events; public launch follows operational rehearsal. Never let a publish UI imply success while an asynchronous operation is queued or refreshing.

CI gates: clean lockfile install → strict TypeScript → focused tests → OpenAPI validation → production build → asset/route manifest validation. Future backend CI adds .NET build/test, PostgreSQL integration, storage integration against isolated buckets, migrations on ephemeral databases, auth/CSRF matrix, DTO compatibility and deployment smoke checks. Do not run destructive integration tests against production buckets or the live content database.

## Phase 6 — live portfolio assistant

The CRT/chat frontend and local demo are implemented. After backend phases2–5: (1) implement config and anonymous token sessions with expiry/isolation; (2) add approved knowledge documents and publication-triggered refresh; (3) implement the provider abstraction and bounded POST/SSE protocol; (4) add idempotency, cancellation and budget enforcement; (5) connect owner settings/status/rebuild to the future admin UI; (6) switch `VITE_CHAT_SOURCE=api` in staging, run C01–C10, then enable live inference. Keep production disabled until factual-answer, unknown/private-question, prompt-injection, revoked-source, cross-session, timeout, duplicate-generation and spend-limit tests pass. See the chat addendum for exact endpoints and responses.
