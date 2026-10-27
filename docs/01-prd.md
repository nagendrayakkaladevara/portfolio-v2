# Product requirements

> **Backend implementation update · 8 October 2026:** Express 5 + TypeScript, Neon PostgreSQL, Cloudflare R2 and Zod replace the earlier ASP.NET proposal. See [current implementation and contracts](10-backend-implementation.md)
## Purpose and audience

Build Sai Nagendra Yakkaladevara’s portfolio with the visual language and interaction feel of https://kamran.fyi/. Recruiters and engineering peers should quickly understand his work, view selected projects, read technical writing, and contact him. The owner should later manage content through an authenticated publishing workflow without editing application code.

The supplied resume is historical source material from 2025. Existing work and profile entries must remain easy to revise. Sample articles are original illustrative text, not claims that Nagendra published those articles or completed additional work.

## Scope

**Current release:** home portfolio, supplied headshot, existing project/work dialogs, contact actions, resume download, theme preference, optional sound, homepage Writing preview, Writing archive, article route with Markdown and desktop contents navigation, responsive states, JSON content with validated schemas, a selectable HTTP adapter, specification package, source export.

**Later production release:** authenticated owner editor, structured profile editing, draft revisions, asset management on R2, preview, publish/unpublish operations, durable PostgreSQL persistence, public API, public metadata/SEO rendering, operational monitoring, backup and recovery.

**Deferred:** comments, user accounts for readers, subscriptions/newsletters, analytics requiring consent, full-text search, multilingual content, public file uploads, multi-author roles, scheduled publishing, video/visual archives, AI writing features. The reference includes other content categories; this portfolio starts with Articles because no user-owned videos or visual essays were provided.

## Key journeys

1. Visitor opens the home page, sees Nagendra’s headshot and intro, scans work/projects, opens a detail dialog, and uses email or a resume link.
2. Visitor selects a recent article or “All writing,” scans dated titles, reads a post, jumps to an H2 section on desktop, and returns to the archive.
3. A direct article link loads the same article. Unknown or unpublished slugs show a useful not-found state. Network failure offers retry; empty results show a quiet empty state.
4. Future owner signs in, creates a draft, writes Markdown, uploads images to private staging, supplies alt text, previews, and publishes one exact revision. Readers keep seeing the previous published revision while edits are saved.
5. Future owner unpublishes or archives a post. Public reads stop returning it after publication state changes; cache invalidation is tracked. Referenced images cannot be deleted accidentally.

## Functional acceptance criteria

| ID | Requirement | Acceptance |
| --- | --- | --- |
| P01 | Personal identity | Supplied headshot is displayed in the home avatar; profile data lives in one editable module. No invented resume achievements. |
| P02 | Visual fidelity | Home, archive, and article layouts follow measured widths, typography, spacing, and link treatment in the design spec. Desktop/mobile comparison must be reviewed before declaring pixel parity. |
| P03 | Writing preview | Home shows five most recent entries, sorted newest first, linked to their article; archive link remains available. |
| P04 | Writing archive | `/posts` supports loading, empty, error, retry, and cursor-based “More articles.” Title/date rows use dotted leaders. |
| P05 | Reader | Article includes title, publication date, body, image dimensions/alt text, desktop H2 navigation, back links, and reading time. Only one page H1. |
| P06 | Content boundary | JSON and HTTP repositories implement the same interface. Runtime validation rejects malformed payloads. API failure never quietly displays mock data. |
| P07 | Accessibility | Keyboard-operable controls, visible focus, semantic headings, skip link, dialog focus management, reduced-motion support, and sounds off by default. WCAG 2.2 AA is the production target; formal conformance is not claimed yet. |
| P08 | Demo honesty | All fixture articles carry `isDemo: true`, visible sample labels and noindex metadata; no sample entries in generated RSS/sitemap. |
| P09 | Draft isolation | Saving a new revision of a published article cannot change the public body, title, tags or images until publication succeeds. |
| P10 | Asset lifecycle | Original uploads remain private. Only validated, re-encoded published renditions become public. Draft previews require owner authorization. |
| P11 | Safe publishing | Publish is retry-safe, captures the chosen revision, and reports asynchronous progress. Failure preserves the last complete published article. |
| P12 | Concurrency | Stale updates are rejected with 412; missing conditional headers with 428. Editing from two tabs cannot silently overwrite content. |
| P13 | Production discovery | Server/prerendered article HTML, canonical URL, per-article social metadata, correct HTTP 404, RSS, sitemap, and invalidation are verified before public SEO launch. |
| P14 | Operability | Backup restore, failed image processing, publication retries, rate limits, secret rotation, and rollback have tested runbooks. |

## Nonfunctional targets

Targets apply to a future public production deployment; they are not measured claims for this preview.

- At the 75th percentile of real mobile visits: LCP ≤ 2.5 seconds, INP ≤ 200 ms, CLS ≤ 0.1. Reserve media geometry; keep font files local; avoid unnecessary third-party scripts.
- Public API origin p95 ≤ 250 ms excluding first-time image processing; monthly read availability target 99.9% at the service boundary. Client fetch deadline 10 seconds and at most one retry for server/network failures.
- Public list page size defaults to 20, maximum 50. Markdown body maximum 200,000 characters. Upload maximum 10 MiB and 40 megapixels after decoding. These limits are server-enforced, not browser-only.
- Owner authentication uses OIDC with a single allowlisted subject; never identify an admin solely by email domain. Public reads do not require login.
- Preserve personal data minimization: no visitor account table and no contact form database in v1. External contact uses mailto and existing social links.

## Success and release decision

Success means the core portfolio is useful, Writing feels like the reference, replacing sample data is straightforward, and the backend can be built from an explicit contract. Before public launch, Nagendra reviews current job details, article authorship, links, headshot crop, and resume currency. Real publishing is blocked until P09–P14 have been verified in the actual backend environment.

## Portfolio assistant extension

Current scope adds a fixed bottom-right CRT mascot and an accessible chat window with local demo answers, suggested questions, source links, streaming preview, Stop/Retry/New chat and dark mode. The future AI feature answers questions about Nagendra from approved public backend content. It must clearly identify itself as an assistant, admit missing knowledge, and avoid private facts or fabricated claims. No visitor login is required; a short-lived anonymous capability isolates each conversation. C01–C10 in `09-ai-chat-requirements.md` define the additional acceptance gates. Actual model inference and knowledge indexing remain future backend work.
