# Express backend implementation

Repository: https://github.com/nagendrayakkaladevara/portfolio-v2-BE

# Sai Nagendra · Portfolio API

Express 5 + TypeScript backend for [portfolio-v2](https://github.com/nagendrayakkaladevara/portfolio-v2). Node 24 LTS, Neon PostgreSQL, Cloudflare R2, Zod, Helmet, JOSE and database-backed rate limiting.

## Status

Implemented: public Writing reads; authenticated owner post create/read/update/publish/archive; optimistic concurrency; verified R2 uploads; anonymous expiring chat sessions; health checks; migrations; request IDs and redacted logs. AI generation deliberately returns **503 `ai_not_configured`** until its endpoint is specified. No provider URL, API key, model or protocol has been assumed. The frontend continues to use bundled JSON and demo chat.

This is a tested backend foundation, not a claim that external services are provisioned or production deployment is complete. Neon, R2 and your OIDC provider need configuration and live integration verification. Tests run against embedded PostgreSQL (PGlite), not a remote Neon instance.

## Run locally

1. Install Node 24 and PostgreSQL 16+ (or create a development Neon branch).
2. `npm ci`
3. Copy `env.example` to `.env`; fill database and rate-limit secret values.
4. `npm run db:migrate`
5. `npm run dev`
6. Check `http://localhost:3001/health/ready`.

Generate the rate-limit secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never commit `.env`. Do not use the example secret in production.

`npm run check` runs strict TypeScript, integration tests and the build. `npm start` runs the compiled server after `npm run build`. `npm run db:cleanup` expires capability sessions, rate counters and old audit records, and marks abandoned uploads failed; schedule hourly with your hosting platform. Configure a one-day R2 lifecycle rule for the private `incoming/` prefix, including failed/overwritten uploads. Schedule checks for orphaned public objects after interrupted upload processing.

## Production setup

**Neon:** use a pooled connection string in `DATABASE_URL`; use the direct non-pooler connection string in `DATABASE_DIRECT_URL` for migration session locks. Set `DATABASE_SSL=true`. Certificate verification is always enabled for TLS; URL flags cannot disable it. Place the API near your database region. Runtime needs only SELECT/INSERT/UPDATE/DELETE on application tables and usage on the audit sequence; use a separate schema owner for migrations. Migrations use a session advisory lock, checksums and transactions, and must run as a release job, never from every API replica. Enable backups/PITR and practice restoration.

**Owner authentication:** supply `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, and immutable comma-separated `AUTH_OWNER_SUBJECTS` from an OIDC provider. Use access tokens with this API's audience and RS256/ES256 signatures. The backend validates issuer, audience, expiration, issued-at and subject. It has no password login, test bypass or shared admin key in production. Unconfigured owner access fails closed. The test-only injected guard is never provided by `server.ts`. Keep owner access tokens in memory; use the provider's Authorization Code + PKCE flow when building an admin UI. MFA is recommended at the identity provider.

**R2:** use separate private-original and public-rendition buckets. Keep original bucket public access disabled. Set the public bucket's custom HTTPS asset origin. Scope the R2 token to these two buckets only. Private bucket CORS: allow only your exact admin origin, PUT, and Content-Type; expose ETag. A presigned URL expires in 5 minutes. Upload JPEG, PNG or WebP only, up to 5 MiB. Finalization checks actual length and decodes actual image format, caps decoded pixels at 16 million, rejects animation, strips metadata via re-encoding and publishes a bounded WebP rendition under a server-generated immutable key. Do not publish raw uploaded SVG, HTML or the original bucket. Original objects have no public read URL. Crash recovery/orphan reconciliation is an operational follow-up documented below.

**HTTP:** terminate TLS at a trusted ingress; set exact frontend origins in `ALLOWED_ORIGINS`. Only set `TRUST_PROXY` to actual ingress IP ranges; never `true` or an arbitrary hop count. Restrict direct access to the origin server at your firewall when behind a proxy. CORS is not authentication. Admin uses explicit bearer tokens with no cookies, so there is no ambient cookie-based CSRF authority. Apply ingress body-size, connection and request-rate limits as well; HTTP timeouts alone do not prevent volumetric attacks.

**Deploy:** build the Dockerfile (runs as non-root), inject secrets from your host, expose port 3001, and use `/health/live` and `/health/ready` probes. Handle SIGTERM with a 15-second drain budget. No deployment to a backend host is performed by this repository. Neon/R2 costs and availability remain your account's responsibility. Audit and update dependencies regularly; CI includes a production dependency audit.

## Structure

- `src/app.ts`: dependency composition, HTTP/security middleware, routers; no listening side effects.
- `src/server.ts`: validated configuration, database pool and graceful lifecycle.
- `src/config`: Zod environment schema with cross-field constraints.
- `src/db`: small database boundary, PostgreSQL pool and TLS settings.
- `src/middleware`: owner JWT verification and shared atomic rate-limit store.
- `src/modules/posts`: schemas, repository and public/admin routes.
- `src/modules/media`: upload contract, R2 adapter and image verification pipeline.
- `src/modules/chat`: capability sessions, request validation, disabled generation boundary and provider interface.
- `src/shared`: safe Problem Details errors.
- `migrations`, `scripts`: versioned schema and maintenance commands.
- `tests`: real SQL integration tests using PGlite; HTTP tests through Supertest.
- `docs`: implemented API, security scope and AI integration requirements.

## Connect the frontend later

Set `VITE_CONTENT_SOURCE=api` and `VITE_API_BASE_URL=https://your-api.example/api/v1` after publishing real posts. The public post response matches the frontend's Zod schemas. Keep `VITE_CHAT_SOURCE=demo` until the provider and streaming lifecycle are implemented and validated. Setting it to `api` now correctly shows the agent unavailable (`enabled:false`). No secret belongs in a `VITE_` variable.

## Remaining production work

The previous frontend specifications described a wider CMS. This repository implements the subset in `docs/API.md`; do not assume unlisted endpoints exist. Admin UI, search/tags APIs, revision history, scheduled publication, redirect management, media deletion, knowledge rebuild jobs and live SSE generation are not implemented. Do not enable AI by merely changing `enabled`: first implement the full turn/idempotency/cancellation/grounding lifecycle in `docs/AI-INTEGRATION.md`.

Before live launch: verify Neon migrations and privilege separation; verify OIDC with real keys; configure R2 CORS/lifecycle and test upload/finalization; verify reverse-proxy IP behavior/rate limits across replicas; set alerts, backups and recovery jobs; run dependency audit and external security review appropriate to your deployment.


# Implemented API · v1

All endpoints use `/api/v1` except health. All write bodies are strict JSON. Unknown fields are rejected. Errors use `application/problem+json` with `type`, `title`, `status`, `detail`, `requestId`; no SQL, stack, token or request-body echo. All dates are UTC ISO 8601. Public collection limit defaults to 20, maximum 50. Use returned cursors unchanged.

| Method | Route | Authentication | Behavior |
|---|---|---|---|
| GET | `/health/live` | None | Liveness `{status:"ok"}` |
| GET | `/health/ready` | None | Executes `SELECT 1`; readiness |
| GET | `/posts?limit=20&cursor=...` | None | Published summaries and cursor pagination |
| GET | `/posts/:slug` | None | Published article with Markdown and media |
| POST | `/admin/posts` | Owner JWT | Create draft/published article; 201 and ETag |
| GET | `/admin/posts/:id` | Owner JWT | Read any status; ETag |
| PUT | `/admin/posts/:id` | Owner JWT + If-Match | Full replacement; version increments; 412 if stale |
| POST | `/admin/media/uploads` | Owner JWT | Create private presigned PUT URL; 201 |
| POST | `/admin/media/:id/complete` | Owner JWT | Verify/re-encode/publish image |
| GET | `/chat/config` | None | Current `enabled:false` configuration |
| POST | `/chat/sessions` | None | Mint 60-minute anonymous capability; 201 |
| GET | `/chat/sessions/:id` | Session bearer | Current empty history contract |
| DELETE | `/chat/sessions/:id` | Session bearer | Delete/revoke session; 204 |
| POST | `/chat/sessions/:id/messages` | Session bearer | Validate request; 503 until AI integration |

Post write example:

```json
{"slug":"building-useful-interfaces","title":"Building useful interfaces","excerpt":"Notes from practice.","bodyMarkdown":"# An idea\n\nWrite the article here.","tags":[{"slug":"react","name":"React"}],"mediaIds":[],"coverImageId":null,"isDemo":false,"status":"draft"}
```

Status: `draft | published | archived`. To publish or unpublish, PUT the complete write object with the new status and `If-Match: "1"` (use the latest GET ETag). Publishing sets the first publication timestamp. Archived/draft records return 404 publicly. Slugs are lowercase words/digits separated by hyphens. Existing slugs can change, but redirect creation is not implemented; avoid changing published slugs until redirects are added. A slug collision returns 409. Missing If-Match is 428; stale version is 412. Owner write results are `{data:{...article,status,mediaIds,coverImageId}}`, with draft `publishedAt:null`.

Public article:

```json
{"data":{"id":"8318a34f-1484-4eb8-8ab1-b3a1378a2d8c","slug":"building-useful-interfaces","title":"Building useful interfaces","excerpt":"Notes from practice.","publishedAt":"2026-10-08T00:00:00.000Z","updatedAt":"2026-10-08T00:00:00.000Z","readingTimeMinutes":1,"tags":[{"slug":"react","name":"React"}],"coverImage":null,"isDemo":false,"bodyMarkdown":"# An idea\n\nWrite the article here.","media":[]}}
```

List `{data:[...summaries],pagination:{limit:20,hasMore:false,nextCursor:null}}`; summary excludes `bodyMarkdown` and `media`. Media entries: `{id,url,alt,width,height,caption:null}`. Source files must be finalized before media IDs can be attached to a post. Draft article visibility does not make already-finalized media private: finalization deliberately publishes its rendition. Use this only for public portfolio images; private draft-media publication workflows remain future work.

Upload request: `{contentType:"image/png",sizeBytes:125000,alt:"Diagram explaining the design"}`. Response `{data:{id,uploadUrl,method:"PUT",headers:{"Content-Type":"image/png"},expiresInSeconds:300}}`. PUT exactly those bytes/type to the URL, then POST `{}` to `/admin/media/:id/complete`. Response `{data:{id,url,width,height}}`. No presigned URL is logged or persisted. Processing is claimed atomically; repeated/expired/in-progress finalization returns 409. Failure marks upload failed; request a new upload. Finalization has multiple external steps rather than a distributed transaction: monitor/reconcile rare public-orphan objects after a process crash and expire original uploads using R2 lifecycle.

Chat session POST body `{}`; response `{data:{id,token,expiresAt}}`. Token is returned once, 256 random bits, stored server-side only as SHA-256, and sent subsequently as `Authorization: Bearer <token>`. Tokens never go in a URL or browser persistent storage. Invalid/missing/expired session returns 401. DELETE revokes the capability; repeated delete returns 401 (frontend treats expired/revoked state through its session recovery flow). No transcripts are stored before AI integration.

Message body `{clientMessageId:"uuid",content:"Tell me about Sai",pagePath:"/"}`; content 1–2000 trimmed characters, no unsafe controls. Paths local, maximum 240, no query/fragment. Current response is 503 Problem Details, never fake model output.

Rate limits: 120 API requests/minute/IP; 30 admin requests/minute/IP; 10 media requests/minute/IP; 5 session creations/hour/IP; 10 message requests/minute/IP. Counters are shared PostgreSQL rows with HMAC identifiers. IP addresses are not stored as raw counter keys. Limits fail closed on database failure. Responses expose standardized rate headers and 429/Retry-After. Apply edge limits before the database for hostile traffic. IPv6 subnet handling uses express-rate-limit defaults.

These contracts supersede the corresponding earlier .NET design for implemented routes. Earlier planned admin cookie/CSRF contracts are replaced here by owner OIDC bearer validation. The wider CMS specification remains a roadmap, not implemented API documentation.


# AI Agent integration boundary

The product is named **AI Agent**, with launcher/title **Ask about Sai**. The current frontend demo is explicit. Backend generation is disabled until the user provides the AI endpoint. The domain interfaces in `src/modules/chat/provider.ts` avoid coupling the application to a specific vendor or guessing that the future endpoint is OpenAI-compatible.

When the endpoint is supplied, clarify its authentication mechanism, request/response shape, streaming protocol, limits, model selection, retention and cost controls. Configure credentials only in server secrets; allow only the configured HTTPS host, do not accept a provider URL from a visitor. Add a dedicated adapter with bounded connection/response timeouts, output validation and cancellation. No generic unauthenticated proxy endpoint.

Before enabling generation, implement:

1. Durable turns table: session ID, unique clientMessageId, canonical request hash, status, lease/attempt count, answer, verified citation IDs and knowledge version. Same ID/body replays completed output; conflicting content returns 409. Atomic per-session active-turn claim, 20 user turns/session; never hold a DB transaction while waiting for a model.
2. Approved public knowledge query: curated profile facts and published non-demo article revisions only. Never consume drafts, secrets, raw uploads, arbitrary URLs, or stale deleted material. Keep document text separate from instructions. Use fixed retrieval limits and source IDs assigned by the server. Build retrievable profile content explicitly; no personal-context or conversation-memory ingestion.
3. Revalidate source publication before response finalization and history reuse. Map returned citation IDs to server-approved local URLs; never trust model-generated links. Answer unknown questions honestly. Do not impersonate Sai or claim personal availability.
4. Bounded turn budget: 12k input tokens, 800 output tokens (and max 8000 text characters), 45-second provider timeout, 60-second overall request timeout, per-session/IP and daily global cost caps. Define actual token accounting with the selected provider. Reject excess before invoking it.
5. Abort on disconnected response, explicit stop and session deletion. Cancel in-flight work across replicas using a shared cancellation state/poll or pubsub. Expired leases recover after crashes. Generation must not continue indefinitely after a client disconnects.
6. HTTP errors as Problem Details before SSE headers. Stream typed `start`, `delta`, `sources`, `done`, `error` events matching the existing frontend `chatEventSchema`. `start` echoes the request clientMessageId and assigns a messageId; `done` includes authoritative text, verified sources, finishReason and knowledgeVersion. Only a successful done event completes a turn. Add heartbeat and backpressure handling; do not buffer unlimited output.
7. Persist only safe conversation data, not system prompts or retrieved full documents. Add transcript retention/deletion and provider-data policy before production. Do not log question bodies, tokens, answers or raw provider errors by default.
8. Add authorization/isolation, concurrency, idempotency/replay, timeout, cancellation, revoked-session, malformed-stream, prompt-injection, citation, quota and interrupted-generation tests. Run live provider staging checks. Only then change `/chat/config.enabled` to true.

Current runtime has no network calls to AI providers, no live stream, no turns table and no billable model activity. Session infrastructure and HTTP validation are ready; the list above is intentionally a gate, not a claim of completed features.
