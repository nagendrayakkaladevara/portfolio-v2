# Verification report

8 October 2026. This document distinguishes automated evidence from checks that require a browser or the future backend.

## Implemented and checked

- Original uploaded headshot exists and is referenced by the portfolio avatar; source byte identity is checked during artifact validation.
- Strict TypeScript compilation succeeds for application/build configuration.
- The original fourteen Writing/contract tests pass: the homepage list/archive/every article with fetch disabled, fixture shape/uniqueness, summary pagination without body leakage, invalid inputs, future-date exclusion, malformed response recovery, HTTP endpoint/unwrap, no silent mock fallback, cancellation propagation, AST heading anchors, unsafe Markdown rejection, declared image dimensions/links, OpenAPI validity and concrete public response compatibility.
- OpenAPI3.0.3 resolves successfully:29 paths,36 operations,58 named schemas. This proves structural validity, not backend implementation correctness.
- Production Vite build completes; content generation creates the archive and eight fixture article entry points,404 page, RSS and sitemap. All samples remain excluded from feed items and sitemap article URLs.
- Vite reports a main-bundle size warning (approximately651 kB minified /204 kB gzip); article code is a separate chunk. Real mobile performance still needs measurement and further splitting if targets are missed.
- Export archive integrity, included docs/source/assets and exclusion of hosting identity/credentials are verified before deployment.

## Browser verification not performed

The managed environment did not expose the Sites-supported browser QA capability. No local preview server or substitute browser automation was used for the application. The reference website was inspected separately for visual research. Therefore desktop/mobile screenshot comparison, interaction playback, screen-reader behavior, contrast measurement, Core Web Vitals and deployed deep-link HTTP status remain unverified. Do not infer pixel-perfect parity or accessibility certification from the successful build.

The design spec includes an explicit visual review matrix and the sidebar breakpoint deviation. Run that review before making the portfolio public.

## Future service verification

The backend is a contract and architecture only. OIDC/CSRF, PostgreSQL transactions, R2 signing/processing, publication outbox, cache invalidation, real API latency, backup restore and end-to-end publishing cannot be validated until those components exist. The plan defines required integration tests and release gates. No assertion of production readiness is made.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
python scripts/export-source.py
```

Generated route files are metadata-bearing SPA entry points, not full prerendered article content. Feed generation operates on approved non-demo JSON entries in JSON mode; API mode requires future publication infrastructure.

## Writing loading fix

The earlier JSON adapter fetched `/content/posts.json` at runtime. A regression test reproduced the error when that request failed. Writing now imports `src/data/posts.json` into the application bundle. The same test loads the five recent entries, all eight archive entries, and every article body while fetch is set to fail; it asserts zero fetch calls. The HTTP adapter remains available for the later API. This verifies the data and render path in automated tests; it is not a live browser verification.

## CRT chat verification

Twelve additional focused tests cover the local no-network demo and backend-compatible events, public-data answers/private-data refusal, cancellation, byte-split UTF-8 SSE and heartbeat frames, missing terminal events, event ordering and mismatched IDs, stream errors, unsafe source URLs, session-scoped request payloads, API failure without demo fallback and mismatched request acknowledgements. An additional chat-example/auth-scheme contract test brings the combined suite to27 tests. Backend OpenAPI is v1.1.0 with29 paths,36 operations and58 schemas.

Visual viewport handling, focus trap/restoration, long-transcript scrolling and touch keyboard behavior were implemented but still require real browser verification. No provider has been connected, so live AI answer quality, server-side quotas, retrieval isolation, deletion and provider cancellation remain future integration gates. See C01–C10 in the chat addendum.


## 8 October update
Original Koboyo CRT assets, Ask about Sai / AI Agent naming, corrected Tailwind translate positioning, responsive chat spacing, generated OG artwork and S monogram favicon. Frontend TypeScript and 27 tests pass. Backend checks run separately in its repository. Managed preview browser unavailable: layout, focus, keyboard and mobile visual checks remain unverified. No remote Neon/R2/identity/AI service was provisioned.

## Mobile chat containment fix · 8 October 2026
The screenshot showed the chat outside the left/top screen edges. The chat now opts out of the shared centered dialog classes entirely (`positioning="custom"`); there are no inherited negative translations or entry/exit zoom animations on its positioning container. A layout effect calculates explicit left/top/width/height inside the visual viewport and updates for resize, keyboard and viewport pan events. The calculation never forces a minimum height greater than the available screen. Eight regression cases cover narrow phones, keyboard-reduced heights, landscape, zoom/pan and desktop bounds. Other dialogs retain their original centered layout. Browser visual QA remains unavailable in this environment.
