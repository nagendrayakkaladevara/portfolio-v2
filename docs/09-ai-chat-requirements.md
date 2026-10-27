# Portfolio AI chat — UI and backend requirements

> **Backend implementation update · 8 October 2026:** Express 5 + TypeScript, Neon PostgreSQL, Cloudflare R2 and Zod replace the earlier ASP.NET proposal. See [current implementation and contracts](10-backend-implementation.md)
Version 1.1 · 8 October 2026. The CRT launcher, responsive chat UI, deterministic demo and HTTP/SSE client are implemented. The actual AI service, provider connection and knowledge pipeline are **specified for later implementation**. No messages are sent to an AI provider in the current demo.

## Product behavior

A small friendly CRT monitor stays in the bottom-right corner on the home, Writing archive and article pages. It has a keyboard-accessible “Ask about Sai” button and opens a restrained shadcn Dialog. The design uses the portfolio’s Geist font, light/dark tokens, fine borders and generous spacing. The original Koboyo CRT sprite sheets follow the cursor and blink when clicked. Reduced-motion disables cursor tracking; no perpetual floating animation is used. Sounds use the existing opt-in UI SFX preference.

The chat introduces itself as an AI Agent, not Nagendra personally. It offers starter questions, accepts free text, displays progressive replies with source links, and supports Stop, Retry, New chat, close/Escape and keyboard focus restoration. Closing stops a pending reply and preserves the visible conversation until refresh or New chat. On desktop Enter sends and Shift+Enter inserts a line break; touch devices use the send button so Enter can insert a newline. IME composition must not submit prematurely. The scroll position follows replies only when the reader is already near the bottom. Screen readers receive a completed-answer announcement rather than every streamed token.

The current demo is explicitly labeled “Demo chat · answers from this portfolio.” It uses only `src/data/portfolio.ts` and `src/data/chat.json`. It answers common questions deterministically and admits when it does not have an answer. It does not claim current hiring availability, expose private details, or treat sample articles as Nagendra’s published writing. Personal information outside the public portfolio must never be imported from conversation memory or the old resume into chat without owner approval.

## Frontend boundaries

| File | Responsibility |
| --- | --- |
| `src/features/chat/mascot.tsx` | Original Koboyo CRT sheets with accessible trigger and reduced-motion behavior |
| `src/features/chat/chat-widget.tsx` | Launcher, shadcn dialog, transcript, sources and composer |
| `src/features/chat/use-portfolio-chat.ts` | Session lifetime, concurrency guard, cancellation, retry and reset |
| `src/features/chat/contracts.ts` | Runtime Zod schemas and transport interface |
| `src/features/chat/client.ts` | HTTP transport, bounded SSE decoder and typed errors |
| `src/features/chat/demo.ts` | Local facts, deterministic demo replies and matching stream events |
| `src/data/chat.json` | Editable demo labels, welcome text and suggested questions |

`VITE_CHAT_SOURCE=demo` is the default. Set it to `api` only after the backend endpoints below are implemented. `VITE_API_BASE_URL` defaults to `/api/v1`. UI components do not choose a provider, build a system prompt or receive provider API keys. API mode obtains display settings from the backend and never falls back to demo answers on failure. Public portfolio access on the current private Site still uses the host’s existing authentication; the frontend uses same-origin credentials for that boundary.

Messages and the anonymous chat token stay in memory. Refresh intentionally starts a new conversation; no chat token or transcript is written to localStorage or a URL. Configuration loads when the window first opens; a session is created only on the first actual question. The existing Writing JSON remains a separate feature and is not changed by enabling chat API mode.

## Endpoint catalogue

All paths below are relative to `/api/v1`. Full schemas are in `openapi.json`; ready-to-use payloads are in `examples/chat-*`.

| Method + path | Authentication | Request | Response |
| --- | --- | --- | --- |
| GET `/chat/config` | Public | None | 200 `{data: ChatConfig}` |
| POST `/chat/sessions` | Public, origin/rate checked | `{}` | 201 `{data: {id,token,expiresAt}}`; Location |
| GET `/chat/sessions/{id}` | Matching ChatSessionToken | None | 200 `{data: {id,expiresAt,messages,activeClientMessageId}}` |
| POST `/chat/sessions/{id}/messages` | Matching ChatSessionToken | `{clientMessageId,content,pagePath}` | 200 `text/event-stream`; JSON Problem before stream starts |
| DELETE `/chat/sessions/{id}` | Matching ChatSessionToken | None | 204; cancel generation, revoke token and delete transcript |
| GET `/admin/chat/settings` | Owner session | None | 200 versioned settings; ETag |
| PUT `/admin/chat/settings` | Owner + CSRF + If-Match | `{publicConfig,knowledgePolicy}` | 200 updated settings; ETag |
| GET `/admin/chat/knowledge` | Owner session | None | 200 index status/version/counts |
| POST `/admin/chat/knowledge/rebuild` | Owner + CSRF + Idempotency-Key | No body | 202 existing OperationResponse; Location + Retry-After |

No provider endpoint is exposed to the browser. The API does not accept arbitrary system prompts, role arrays, user-supplied conversation history, source URLs, model IDs, tool names, database queries or R2 object keys. Unknown fields are rejected rather than silently trusted. `pagePath` is a local pathname used only as a retrieval hint, never an instruction to fetch a URL. Source citations link only to server-verified public portfolio pages or an approved public resume route.

### Configuration

```json
{
  "data": {
    "enabled": true,
    "title": "Ask about Sai",
    "welcomeMessage": "Ask about Sai’s work, projects, and skills.",
    "suggestedQuestions": ["What does Nagendra work on?", "Show me his projects"],
    "maxMessageLength": 2000,
    "disclaimer": "AI answers can be imperfect. Check the sources."
  }
}
```

The full shape is required. Limits: title80, welcome500, up to6 questions of120 characters, input1–2000 characters, disclaimer250. `enabled:false` disables new generations immediately and displays an unavailable state. Server enforcement is authoritative even if the browser cached an enabled configuration. Admin settings separate public display configuration from the knowledge policy: `includePublishedWriting`, allowlisted `profileSectionIds`, and `excludedPostIds`. Do not put hidden prompts or provider credentials in public configuration. Admin ETag format is `"chat-settings-v{version}"`; stale412, absent428, invalid source references422.

### Anonymous sessions and isolation

POST creates a UUID session and returns a cryptographically random token with at least256 bits of entropy. Store only a token hash. Return the token once; it authorizes only that exact anonymous session, not portfolio editing or another conversation. Transport it in `Authorization: Bearer <token>` over HTTPS. Use a fixed60-minute absolute expiry, checked on every route and while streaming. Do not identify a session merely by its UUID. A valid token for a different session gets404; missing/invalid token401; an expired previously valid session410. Never reveal whether a stranger’s session exists.

GET history returns at most40 messages (20 user turns plus their replies), with UUID message IDs, clientMessageId, role (`user` or `assistant`), text, verified sources, status (`complete`, `stopped`, `failed`) and createdAt. It never returns the token, system prompt, retrieved private document text or provider internals. The current frontend does not restore history after refresh; this endpoint supports future recovery and retry reconciliation. It requires the original in-memory token.

DELETE cancels any active provider request before deleting session/history, revokes the token, and is idempotent in effect. A repeated request with the just-revoked token may return404; the frontend treats404/410 as already cleared. Require proof of the old valid token before accessing any tombstone; never accept a session ID alone. If deletion fails, show a recoverable error and do not falsely claim the conversation was cleared.

Anonymous create requests have no session token yet, so require an exact approved Origin, JSON content type, request-size limits and public abuse controls. Same-origin CORS is the default; tokens never appear in query strings. Origin checks are browser protections, not protection from scripted clients. Owner cookie authentication remains independent and retains CSRF requirements.

### Message submission and retry

```json
{
  "clientMessageId": "00000000-0000-4000-8000-000000000022",
  "content": "What does Nagendra work on?",
  "pagePath": "/"
}
```

Trim content; require1–2000 characters and a valid UUID. Reject control characters except tab/newline. Limit JSON body to16KiB. `pagePath` maximum240 characters, local path, no query string or fragment. The server reconstructs conversation history from its own session records. It includes only completed previous assistant turns in model context whose cited sources remain approved/public; partial, failed and stopped replies must not become authoritative context.

Use `(sessionId,clientMessageId)` as an idempotency key with a canonical hash of the request. The same ID and same input:

- While still generating:409 `generation_in_progress`; never start a second provider call.
- After completion: replay a fresh `start` followed by authoritative `done` for the stored answer, with no additional model charge.
- After failure/cancellation: permit at most one controlled retry for that ID if the failure is retryable; preserve the user message and replace the incomplete assistant attempt. Further attempts require a new user turn or new session, subject to quotas.
- Same ID with different content/pagePath:409 `idempotency_conflict`.

Serialize the check, turn reservation and quota charge in one database transaction. Only one active generation per session. Different concurrent request IDs receive409. Store an attempt record and an expiring lease so a crashed worker cannot permanently block the conversation. The UI also guards against double submits synchronously, but the server must enforce this invariant independently.

## Streaming protocol

Use POST `fetch` with `Accept: text/event-stream`; native EventSource does not support this request body/authorization pattern. Set UTF-8 SSE, `Cache-Control: private, no-store, no-transform`, disable proxy buffering (including `X-Accel-Buffering: no` where supported), and flush each event. Do not cache chat responses. Send comment heartbeats every10s while waiting. The event name and the JSON `type` must match.

```text
event: start
data: {"type":"start","messageId":"00000000-0000-4000-8000-000000000023","clientMessageId":"00000000-0000-4000-8000-000000000022"}

event: delta
data: {"type":"delta","text":"Nagendra is a Senior Software Developer at GE Vernova."}

event: done
data: {"type":"done","messageId":"00000000-0000-4000-8000-000000000023","text":"Nagendra is a Senior Software Developer at GE Vernova.","sources":[{"id":"profile-public-v1","title":"About Nagendra","url":"/"}],"finishReason":"stop","knowledgeVersion":"public-2026-10-08-v1"}

```

Exactly one start, then zero or more delta/source events, then one terminal done or error. Each frame ends with a blank line; support LF or CRLF. Delta text maximum2048 characters; complete reply maximum8000 characters; at most5 sources. A `sources` event is optional and contains `{type:"sources",sources:[...]}`. `done.text` and `done.sources` are authoritative and replace the accumulated preview. `finishReason` is `stop` or `length`. Do not send tokens, hidden reasoning, provider traces or system instructions. Empty/truncated streams without a terminal event are errors, never successful answers.

After200 headers have been sent, failure uses an error event rather than an impossible HTTP status change:

```text
event: error
data: {"type":"error","code":"generation_failed","retryable":true}

```

Allowed stream error codes: generation_failed, rate_limited, content_unavailable, cancelled. Send generic safe messages in the UI, not provider stack traces. The frontend validates event ordering, IDs, content types, sizes and citation URLs, including chunked UTF-8 boundaries. It does not automatically reconnect/replay a paid generation; Retry is explicit and reuses clientMessageId.

Stop or closing the dialog aborts the fetch. Propagate HTTP disconnect/RequestAborted through retrieval and provider cancellation, persist a stopped attempt, release the session lease and stop emitting. The server has a45-second provider deadline and the client a60-second complete-request deadline; configuration/session requests have a15-second client deadline. Cancellation is best effort at the provider boundary, so enforce server-side output/spend caps even if a disconnected provider continues briefly. A new question during cancellation may receive409 until the lease is released.

## Grounded answer generation

Implement a Chat module inside the existing ASP.NET Core10 backend. Use `Microsoft.Extensions.AI` / `IChatClient` as the provider boundary and the chosen provider’s compatible adapter. Configure provider/model/credentials on the server; choose and pin the actual supported model when implementation starts. No AI SDK or provider key is added to the public React bundle. ASP.NET Core10 supports streamed SSE results; the contract is application-owned, not tied to a proprietary frontend SDK.

Recommended request flow:

1. Authenticate the anonymous session; validate origin/input, enabled state, expiry, quota and single active turn.
2. Reserve the turn/attempt atomically and capture the current knowledge version.
3. Retrieve relevant approved facts and public source IDs. Load bounded completed conversation history.
4. Build a fixed server-owned instruction: explain Nagendra’s public professional profile, answer from supplied facts, identify uncertainty, cite sources, and redirect unknown/private questions to contact. User text and retrieved content are untrusted data, never higher-priority instructions.
5. Call the model without browsing, arbitrary URL fetching, database tools, email sending or other action tools. This AI Agent is scoped to public portfolio questions; action-taking tools are outside its current scope.
6. Stream bounded plain text. Resolve citation IDs from the retrieved allowlist, never model-invented URLs; verify the current source is still public before finalizing.
7. Persist the completed answer/source revision IDs and usage totals, send done and release the generation lease. On failure, preserve the user turn plus failed/stopped status and release the lease.

Do not infer salary, home address, private phone numbers, internal company conversations, colleague details, confidential projects, job availability, intentions or personality traits from missing data. The public resume may be stale; state its date when using a historical fact and prefer current approved profile data. Do not inflate metrics or fabricate publications. The bot should speak about Nagendra in third person and identify itself as an assistant when asked.

## Knowledge and publication integration

The authoritative knowledge sources are the approved public profile/selected sections, public project summaries, and actual published post revisions with `isDemo:false`. Optionally ingest a resume only after the owner has explicitly approved its extracted public facts and date. Do not automatically ingest the raw uploaded resume, all database rows, private drafts, R2 originals, arbitrary websites, or this ChatGPT conversation.

For this small corpus, start with normalized relational documents and PostgreSQL full-text retrieval, plus a small always-included approved profile summary. A vector database and external embedding service are not required. Add embeddings only if measured retrieval quality justifies them. Retrieved excerpts carry stable source IDs, public paths and revision IDs.

Public profile updates, article publish/unpublish/archive and chat policy changes enqueue a knowledge refresh in the existing outbox. Rebuild normalizes text, excludes demos/drafts, applies the allowlist/exclusions and atomically swaps the knowledge snapshot pointer only after success. `POST /admin/chat/knowledge/rebuild` returns an operation of kind `rebuild_chat_knowledge` and follows existing retry/dead-letter rules. Admin status reports source count, excluded demo count, indexedAt and active operation. Initial empty knowledge returns a polite unavailable answer rather than an ungrounded model response.

A stale index must not reveal an unpublished/deleted source. Check source visibility and allowed revision against authoritative DB state at retrieval and before returning citations; discard revoked sources immediately even before background rebuild completes. Never retain inaccessible source text in a reusable answer cache. Current v1 does not cache generated responses across sessions.

## Additional persistence

| Table / fields | Behavior |
| --- | --- |
| `chat_settings`: singleton id, version, public_config jsonb, knowledge_policy jsonb, updated_at | Owner-approved configuration; optimistic concurrency |
| `chat_knowledge_snapshots`: version, state, created_at, indexed_at, source_count, operation_id | Atomic active pointer; immutable snapshots |
| `chat_knowledge_documents`: snapshot_version, source_id, source_kind, source_revision_id, public_path, title, text, search_vector, published_at | Only allowlisted public facts; FK/visibility checks |
| `chat_sessions`: UUID id, token_hash, created_at, expires_at, revoked_at, active_request_id, lease_until, turn_count | Fixed60-minute token lifetime; one active generation |
| `chat_turns`: UUID id, session_id, client_message_id, request_hash, user_text, page_path, assistant_text, sources jsonb, knowledge_version, status, created_at, completed_at | Unique(session_id,client_message_id); max20 turns |
| `chat_generation_attempts`: id, turn_id, attempt_number, state, provider_request_id nullable, input_tokens, output_tokens, elapsed_ms, error_code, lease_until | Bounded retries, cost accounting and crash recovery |

Session tokens and full prompts are not logged. Messages are deleted on successful DELETE; expired transcripts are purged within24h. Define backup retention (initial target7days) and provider data-retention policy before launch; deletion from the application is not a claim of instant erasure from provider systems/backups. Explain the selected policy in a public privacy page before enabling live chat. No transcript analytics or owner transcript inbox is included in v1.

## Errors, budgets and operations

Pre-stream errors use the existing RFC9457 Problem shape. Add codes chat_disabled503, knowledge_unavailable503, session_invalid401, session_expired410, chat_session_not_found404, generation_in_progress409, idempotency_conflict409, message_too_long422, session_turn_limit429, rate_limited429, dependency_unavailable503. Unknown fields/invalid JSON400; oversized body413; wrong content type415. Return Retry-After on429 and transient503. A disabled chat never starts a provider request.

Initial configurable limits:5 session creations per IP per10min,10 messages per session per10min,20 total turns per session,30 messages per IP per hour, one active generation/session, input budget12,000 tokens including instructions/history/retrieval, output800 tokens and8000 characters maximum. Use a daily provider spend cap and global concurrency limit (initial10). Trusted reverse-proxy IP handling is required. Apply distributed counters/DB limits rather than per-instance memory alone. Keep limits configurable and review them against actual traffic; add a challenge only if abuse evidence warrants it.

Record traceId, hashed session/actor identifier, turn ID, timing, token counts, knowledge version and safe failure code. Never log bearer tokens, raw visitor text, full prompts or retrieved sensitive material. Metrics: time to first token, total latency, cancellation rate, provider errors, quota rejects, unknown-answer rate, stale-knowledge lag and daily spend. Target p95 first token≤5s and completed short response≤15s, to be measured against the chosen provider. Alert on repeated generation failures, refresh lag>5min or spend threshold80%; cap at100% and display temporary unavailability.

Server secrets/configuration: provider credentials, configured model ID, max tokens, request deadlines, origin allowlist, spend/concurrency limits and token-hash secret/pepper if used. Never expose these as `VITE_*`. Frontend configuration is limited to source mode and API base path.

## Acceptance and verification

| ID | Gate |
| --- | --- |
| C01 | CRT remains bottom-right; opens/closes with pointer, keyboard and Escape; matches both themes |
| C02 | Mobile keyboard/viewport keeps composer usable; long messages scroll; focus restores to launcher |
| C03 | Demo works without network or AI keys; label remains visible and sources target real portfolio sections |
| C04 | API configuration/session/message/delete contracts match Zod and OpenAPI; no mock fallback |
| C05 | UTF-8/chunked SSE, heartbeats, interrupted streams, duplicate/mismatched IDs and terminal errors handled |
| C06 | Stop/close cancels generation; concurrent sends and retries cannot duplicate paid calls |
| C07 | Session isolation, expiry, deletion, owner authorization and CSRF tested against actual backend |
| C08 | Drafts/demos/private facts never enter knowledge; prompt-injection and unknown questions fail safely |
| C09 | Publish/unpublish refresh and authoritative visibility checks prevent stale private answers |
| C10 | Rate/spend caps, timeout, provider outage, worker crash, retention and rollback drills pass |

Automated frontend tests cover C03, contract/parser portions of C04–C05, cancellation transport and selected grounding rules. Visual browser checks for C01–C02 and real backend/provider checks for C06–C10 remain required. The managed Sites browser QA capability is unavailable here; no browser conformance claim is made.

## Primary implementation references

- ASP.NET Core10 SSE: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.typedresults.serversentevents?view=aspnetcore-10.0
- Microsoft.Extensions.AI / IChatClient: https://learn.microsoft.com/en-us/dotnet/ai/ichatclient

Provider/version selection and account-specific deployment are intentionally deferred until the backend phase. Do not add a paid provider dependency to make the current local demo appear live.
