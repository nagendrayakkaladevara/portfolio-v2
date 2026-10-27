# Backend requirements and HTTP contract

> **Backend implementation update · 8 October 2026:** Express 5 + TypeScript, Neon PostgreSQL, Cloudflare R2 and Zod replace the earlier ASP.NET proposal. See [current implementation and contracts](10-backend-implementation.md)
Status: implementation specification for a future backend. No live server, authentication, admin interface, database or R2 integration is included in the current preview. `openapi.json` is OpenAPI 3.0.3 and defines all paths and shapes listed here. Examples in `examples/` use reserved sample identifiers and domains.

## Service defaults

ASP.NET Core 10 LTS, EF Core/Npgsql, PostgreSQL, AWS SDK for .NET S3 client targeting Cloudflare R2. Deploy API and durable worker to a .NET-capable host, behind HTTPS and a same-origin gateway. Public API base `/api/v1`; owner routes `/api/v1/admin`; auth `/api/v1/auth`. Public portfolio pages remain `/`, `/posts`, `/posts/{slug}`. All JSON UTF-8, camelCase, UUID identifiers, UTC RFC3339 date-times; nullable values are explicit nulls. Public response envelope is `{ "data": ... }`; collections add pagination. Never return private object keys, tokens or draft body fields in public summaries.

Limit request JSON to 512 KiB; article Markdown to 200,000 characters; title160; excerpt320; slug120; maximum8 tags,50 images; alt250; caption500. Tags: slug60 and name60. Validate Unicode text after trimming; reject control characters other than valid Markdown whitespace. Limit per-author content rather than truncating silently. Client Zod validates public shape, but server validation remains authoritative.

## Endpoint catalogue

| Method + path | Purpose | Success / conditional behavior |
| --- | --- | --- |
| GET `/profile` | Public approved profile | 200 ProfileResponse; ETag/304 |
| GET `/posts?limit=20&cursor=…` | Published post summaries | 200 PostList; ETag/304 |
| GET `/posts/{slug}` | Published revision with Markdown/media | 200 PostResponse; 404 if absent/unpublished; ETag/304 |
| GET `/auth/login?returnTo=/admin` | Start owner OIDC flow | 302; only allowlisted relative return paths |
| GET `/auth/callback` | Validate OIDC response, establish session | 302; 400/401 on failed validation |
| GET `/auth/session` | Current owner identity | 200 SessionResponse or 401; no-store |
| GET `/auth/csrf` | Token bound to authenticated session | 200 CsrfResponse; no-store |
| POST `/auth/logout` | Revoke current session | 204; CSRF required |
| GET `/admin/profile` | Editable profile and version | 200 AdminProfileResponse; ETag |
| PUT `/admin/profile` | Replace editable fields | 200 AdminProfileResponse; If-Match required |
| GET `/admin/posts` | Owner list, optional lifecycle filter | 200 AdminPostList; limit/cursor |
| POST `/admin/posts` | Create draft and revision1 | 201 AdminPostResponse; Location, ETag; Idempotency-Key required |
| GET `/admin/posts/{id}` | Draft plus publication metadata | 200 AdminPostResponse; ETag |
| PUT `/admin/posts/{id}` | Create immutable draft revision | 200 AdminPostResponse; If-Match required |
| DELETE `/admin/posts/{id}` | Soft archive an unpublished/draft post | 204; If-Match; 409 if published or operation active |
| POST `/admin/posts/{id}/publish` | Publish a specific stored revision | 202 OperationResponse; If-Match and Idempotency-Key |
| POST `/admin/posts/{id}/unpublish` | Remove public article | 202 OperationResponse; If-Match and Idempotency-Key |
| GET `/admin/posts/{id}/revisions` | Immutable revision summaries | 200 RevisionList; limit/cursor |
| GET `/admin/posts/{id}/revisions/{revisionId}` | One immutable revision | 200 RevisionResponse |
| POST `/admin/media/uploads` | Reserve private upload | 201 UploadResponse; Idempotency-Key |
| POST `/admin/media/{id}/complete` | Verify uploaded object and process | 202 OperationResponse; Idempotency-Key |
| GET `/admin/media/{id}` | Asset state/metadata | 200 AssetResponse; no signed URL |
| GET `/admin/media/{id}/preview` | Ready private rendition preview | 302 to signed GET URL valid60s; 409 if not ready |
| DELETE `/admin/media/{id}` | Delete unreferenced asset | 202 OperationResponse; If-Match + Idempotency-Key; 409 if referenced |
| GET `/admin/operations/{id}` | Poll durable processing/publication state | 200 OperationResponse; Retry-After while running |
| GET `/health/live` | Process liveness | 200 minimal status |
| GET `/health/ready` | DB, worker backlog/storage configuration readiness | 200/503; gateway/internal only |

Paths above are relative to `/api/v1`. RSS `/feed.xml`, sitemap `/sitemap.xml`, robots `/robots.txt` and prerendered pages are frontend publication artifacts, not JSON endpoints. Search, tags-filter endpoints, revision restore, hard-delete posts and scheduled publish are deferred; do not infer them from the list.

## Public reads

`PostSummary`: id, slug, title, excerpt, publishedAt, updatedAt, readingTimeMinutes, tags, coverImage, isDemo. `Post` adds bodyMarkdown and media. `ArticleMedia`: id, url, alt, width, height, caption. All article image URLs in production use HTTPS on the configured public asset domain. The frontend permits root-relative asset URLs for the local fixture; production API must not return arbitrary external origins.

`publishedAt` is the first successful publication timestamp and remains stable through republishing. `updatedAt` is the current published revision publication time, not the latest draft save. Reading time is computed server-side from prose word count at200 words/minute, rounded up with minimum1. Public API only returns `isDemo:false` in production; `isDemo:true` is permitted in preview environments.

List ordering is `(first_published_at DESC, id DESC)`. Cursor is an opaque base64url signed payload with version, snapshot upper bound, last tuple, filters and 24-hour expiry; reject tampering, filter mismatch or expiry with400 `invalid_cursor`. It is not an offset. A snapshot excludes newly published posts after the initial page; an unpublish may shorten later pages. Return `nextCursor:null` and `hasMore:false` at the end. Default limit20, range1–50; invalid values400. Never return an empty page with `hasMore:true`. Unpublished/deleted items disappear, so absolute total counts are intentionally omitted.

Use strong or weak resource ETags consistently for conditional GET, `Vary: Accept-Encoding`, and `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=60`. On matching If-None-Match return304 without JSON body. The client does not need to handle raw304 manually when ordinary browser caching serves the validated response. Cache public failures for at most30s; never cache 5xx or authenticated responses.

## Owner authentication and authorization

Use server-side OpenID Connect authorization code + PKCE. Default deployment may select any compatible provider; configure issuer, client ID, secret, callback and an exact subject allowlist server-side. Require provider MFA for the owner. Validate issuer, audience, signatures, state, nonce, PKCE and callback URL. Store opaque session ID server-side or encrypt/sign protected session tickets with rotated persistent data-protection keys. Session idle expiry8h, absolute24h. The admin cookie is Secure, HttpOnly, SameSite=Lax; no token in localStorage.

Every `/admin` request requires the owner. State-changing admin/auth requests require `X-CSRF-Token` bound to the session and a valid same-origin Origin/Referer check. Session/CSRF acquisition uses credentials; public repository intentionally does not. CORS for API permits no cross-origin credentials by default. Authentication failure401; authenticated disallowed identity403. Callback `returnTo` can only be `/admin` or a validated child route; never accept an external URL. Authentication endpoints are limited by both IP and session to reduce abuse.

## Drafts, versions and writes

A draft request includes slug, title, excerpt, bodyMarkdown, tags, coverAssetId, media references `{assetId,alt,caption}`. Markdown images refer to `asset://{UUID}` tokens in drafts. Parse the Markdown AST to resolve tokens, reject remote image URLs, verify declared asset references and ready state on publish, and rewrite to public rendition URLs in the public response. Do not use blind string replacement or perform HTTP fetches for arbitrary Markdown URLs. Links may use HTTPS, HTTP, mailto, local paths or anchors; strip/reject unsafe schemes. Raw HTML is forbidden by backend validation and skipped by frontend defense in depth.

POST creates id/version1 and an immutable first revision. PUT requires all editable fields; omitted fields do not mean partial patch. If content changed it creates a new revision and increments post version. Return ETag `"post-{id}-v{version}"`; require that exact token on subsequent writes. Slug uniqueness409; slug change after first publication409 `immutable_slug`; invalid fields422; stale version412; missing If-Match428. Revisions are immutable and numbered monotonically within a post. GET history uses revision_number DESC keyset pagination; archived history is owner-readable.

Profile PUT likewise replaces the profile payload, with ETag `"profile-v{version}"`; public profile is changed atomically on successful write. Profile image changes accept only ready asset references and use the same public-rendition promotion workflow before the profile transaction; on processing/storage failure return503 and retain previous public profile. Profile is relatively small and synchronous in v1; the client may retry with the same version after refetching. Profile content sections have stable IDs and typed items as defined by OpenAPI.

All mutation requests with Idempotency-Key use UUID keys. Uniqueness includes admin subject, method and path; hash the canonical request body and relevant precondition headers. Replay the stored status/body for the same key/input even if the original precondition has since advanced. Same key with different input409 `idempotency_conflict`. Concurrent initial attempts serialize on the idempotency record. Retain24h; clients must not reuse old keys. Idempotency never grants authorization; check owner/CSRF first.

## Publishing operations

Publish request `{revisionId}` selects an existing revision belonging to the post. All referenced assets must be READY (otherwise422 `asset_not_ready`). Acquire per-post operation lock, verify If-Match, reserve operation and outbox in one transaction, and increment post version to make competing writes aware of the state. Return202 with operation Location and Retry-After2. Saving newer drafts is allowed while publishing; second publish/unpublish/archive is409. Capture the chosen revision and avoid advancing the draft pointer on worker completion.

Worker copies immutable clean renditions to public storage, verifies copies, then commits the published pointer, lifecycle and timestamps. Public reads use that exact revision. Complete after required cache eviction/feed/prerender refresh has succeeded; failures after DB cutover are reported as `retrying` with stage `refreshing` and must retry forward, not undo a valid article. Distinguish this from failures before cutover, which preserve the previous published revision. Operation states: queued, running, retrying, succeeded, failed. Stage: validating, processing, promoting, committing, refreshing, deleting, completed. Progress is informational0–100. Poll at2s initially with capped exponential delay to10s; stop on terminal states.

Unpublish is idempotent in effect. It nulls public visibility through lifecycle, retains revision history and first publication date, increments version, and uses the same refresh outbox. Already-unpublished posts may return a succeeded operation. Archive is soft, requires not currently published and no active operation; after archive no normal writes except read/history (restoration is deferred). Public slugs always404 when lifecycle is not published.

## Cloudflare R2 upload contract

Use two separately configured buckets: private staging/ready originals and public published renditions. Defaults: `portfolio-private` and `portfolio-public` are examples, not provisioned resources. Public bucket is served through `https://assets.YOUR-DOMAIN` custom domain with caching. Do not use `r2.dev` for production. R2 S3 API account endpoint signs uploads; presigned URLs do not work on the public custom domain.

1. POST uploads with fileName, contentType, sizeBytes, optional sha256. Allowed original types: image/jpeg, image/png, image/webp, image/avif; max10,485,760 bytes. Do not allow SVG, GIF or arbitrary documents in blog image upload v1.
2. API verifies quotas, creates assetUUID and a random non-overwritable key `staging/{assetId}/{randomNonce}`, issues a PUT URL expiring in300s. Return methodPUT, exactly required headers (Content-Type), expiresAt, maxBytes and assetId. Sign Content-Type. Filename never controls an object path. URL is a bearer credential; do not log it.
3. Browser PUTs bytes directly to the S3 endpoint. Set R2 CORS AllowedOrigins to exact owner UI origin(s); AllowedMethodsPUT; AllowedHeadersContent-Type; ExposeHeadersETag only if needed; MaxAgeSeconds300. No wildcard origin and no credentials in this cross-origin PUT. CORS does not replace signed authentication.
4. POST complete schedules verification. Completion does not trust the browser’s MIME, size, digest or reported ETag. Worker performs HEAD for size, streams bounded content, verifies magic bytes and decoded format/dimensions, independently computes SHA-256, and compares a declared SHA if supplied. Reject oversize, malformed, disguised, multi-frame/animated or >40MP images; bound memory/CPU/time and isolate image processing.
5. Copy the uploaded object to a separate private processing key before validating so a reusable presigned PUT cannot mutate the rendition being checked. Only process that snapshot. Keep the staging key disposable; short expiry and random keys limit the overwrite window. Presigned PUT is not a one-time token and client Content-Length is not sufficient size enforcement.
6. Strip EXIF/location metadata, apply orientation, decode/re-encode, create WebP variants320,640,1280,1920px without upscaling, and an original-size capped1920px clean fallback. Preserve alpha where appropriate. Store actual dimensions/bytes/hash per variant. MarkREADY only after output verification. Frontend v1 may use the default1280/next-smaller rendition; width/height correspond to that exact returned URL.
7. Private preview signs one clean ready rendition GET for60s, no-store redirect. Publication copies approved variants to immutable `published/{assetId}/{sha256}/{width}.webp` keys. Serve `Cache-Control: public, max-age=31536000, immutable`, correct image Content-Type, `X-Content-Type-Options:nosniff`. Never expose original/staging keys or EXIF-bearing files.

Asset states: RESERVED → PROCESSING → READY, or REJECTED; deletion → DELETING → DELETED. Store machine-readable rejection codes. Complete on PROCESSING returns the existing operation; onREADY returns a succeeded operation; onREJECTED requires a new upload. Missing upload object409 `upload_incomplete`. Expired unused reservation410. Enforce at most20 outstanding reservations and200MiB staged per owner,10 upload reservations/minute. Lifecycle deletes abandoned staging objects after24h. A daily reconciler removes ready orphans older than7days only after DB reference and active-operation checks. Clean private snapshots after successful rendition processing plus a24h recovery window. Object ETag is not assumed to be a content checksum.

DELETE asset checks retained draft/published revisions/profile and active operations, returns409 if referenced, and requires If-Match asset version. Worker deletes private/public variants, purges caches where supported and marksDELETED. This cannot revoke third-party downloaded copies. Audit all upload, publish, delete and rejection events without sensitive URLs.

## Errors and rate limits

Use `application/problem+json` (RFC9457) with type, title, status, detail, instance, traceId, code and optional errors keyed by field path. Never expose stack traces, database errors, storage keys or credentials.

| Status | Examples |
| --- | --- |
| 400 | invalid_cursor, invalid_query, malformed_json |
| 401 / 403 | unauthenticated / forbidden, invalid_csrf |
| 404 | post_not_found, asset_not_found; public draft existence not disclosed |
| 409 | slug_taken, immutable_slug, publish_in_progress, asset_referenced, upload_incomplete, idempotency_conflict |
| 410 | upload_expired |
| 412 / 428 | stale_version / precondition_required |
| 413 / 415 | payload_too_large / unsupported_media_type |
| 422 | validation_failed, asset_not_ready, invalid_markdown |
| 429 | rate_limited with Retry-After seconds |
| 503 | dependency_unavailable; safe generic public message |

Initial configurable limits: public120 requests/min/IP; owner writes60/min/session; login10/min/IP; uploads10/min/owner. Apply at gateway and service with shared state when scaling; IP limits account for trusted proxy headers only. Health probes bypass ordinary public read limits but are gateway restricted where appropriate.

## Operations and production gates

Logs include traceId, route template, status, latency, operationId, resourceId and actor hash. Metrics: read latency/error rate, queue age, publish failure rate, invalid image rate, orphan bytes and cache refresh lag. Alert if oldest operation >5min, recurring job failures, readiness degraded or public error rate exceeds agreed budget. Retries use exponential backoff with jitter, maximum5 attempts before failed/dead-letter; owner can resubmit a publish using a new key after diagnosing failure. Worker leases must expire safely after crash.

PostgreSQL daily backups plus PITR where supported; target RPO15min, RTO4h, verified quarterly. Retain private clean images long enough for rebuild policy; immutable public objects are reproducible from retained clean variants. Database restore does not automatically restore deleted objects, so include object inventory/backups in recovery design. Store credentials only in server secret management; scope R2 token to the two buckets and required actions, rotate and test. CI validates OpenAPI, generated DTO compatibility, authorization matrix, concurrency, idempotency, draft isolation, multipart/format abuse, upload expiry, job crash recovery, cache invalidation, feed and 404 behavior.

## Official references

- R2 public buckets/custom domains: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Presigned URLs and S3 endpoint constraints: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/
- AWS .NET SDK with R2: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/
- .NET support: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- ASP.NET cookie authentication: https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0

## Portfolio AI chat extension (v1.1)

The bottom-right CRT opens a portfolio assistant. The frontend currently uses a labeled deterministic demo; the live AI backend is deferred. Implement the nine chat operations in [09-ai-chat-requirements.md](09-ai-chat-requirements.md), which is part of this backend specification and defines every field, stream event, security boundary and lifecycle. The shared `openapi.json` now includes the chat schemas and bearer session security scheme alongside existing owner APIs.

| Endpoint | Purpose |
| --- | --- |
| GET `/chat/config` | Backend-provided welcome, questions, limits and enabled state |
| POST `/chat/sessions` | Create short-lived anonymous conversation/token |
| GET `/chat/sessions/{id}` | Read only the matching token’s history |
| POST `/chat/sessions/{id}/messages` | Stream answers grounded in approved public data |
| DELETE `/chat/sessions/{id}` | Cancel, revoke and delete conversation |
| GET / PUT `/admin/chat/settings` | Owner configuration with version/CSRF checks |
| GET `/admin/chat/knowledge` | Knowledge snapshot status |
| POST `/admin/chat/knowledge/rebuild` | Durable refresh through the existing outbox/operation system |

Chat uses its own session-scoped bearer token, never the owner session for visitors. Generation runs in the .NET service; provider credentials stay server-side. Public profile/published-revision changes trigger knowledge refresh; demos/drafts/private assets are excluded. The existing Operation kind enum adds `rebuild_chat_knowledge`. Chat traffic is no-store and bypasses public CDN caching. The detailed addendum’s chat-specific limits and retention rules apply instead of generic public-read defaults for these endpoints.
