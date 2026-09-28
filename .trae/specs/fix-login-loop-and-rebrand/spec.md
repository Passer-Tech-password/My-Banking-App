# Specification: Fix Admin Login Loop & Brand Standardization

## Problem Statement

Two high-severity issues exist in the Next.js 16 banking application:

1. **Infinite Admin Login Loop**: After successfully submitting valid admin credentials at `/admin/login`, the user receives a session cookie but is immediately redirected back to `/admin/login` instead of reaching `/admin/dashboard`. The session is cryptographically rejected by the Edge middleware on every protected request, causing an endless redirect cycle.

2. **Branding Inconsistencies**: A significant amount of the legacy project identity remained in code, routes, configuration, and spec documents. This included broken imports referencing a non-existent predecessor library pattern, which prevent the middleware from even compiling in some environments. The project must be fully standardized to "Aurora Bank" with consistent casing ("Aurora Bank" for display names).

## Users / Stakeholders

- **Admin user**: Needs reliable access to the `/admin/*` dashboard to manage customers, transactions, and card requests.
- **End users**: See the Aurora Bank brand across all public surfaces and must not encounter any inconsistent branding anywhere.
- **Developers / Deployers**: Depend on clean imports, buildable code, and consistent naming across the project.

## Goals

1. Ensure that valid admin credentials produce a cryptographically valid session that both the Node.js runtime (`lib/admin/session.ts`) and the Edge runtime (`lib/admin/session-edge.ts`) accept, ending the login loop.
2. Replace every instance of the legacy term (all case variations) with "Aurora Bank" (appropriately capitalized for context) across the entire codebase, including route paths, import paths, spec folder names, UI text, and metadata.
3. Remove or fix all references to the non-existent predecessor library module so that middleware, route handlers, and pages import only from libraries that exist.
4. Verify end-to-end admin login, unauthenticated redirects, and core application functionality after the combined fix.

## Non-Goals

- No changes to Firebase client/auth flows for regular (non-admin) users.
- No schema changes to Firestore collections or documents.
- No rework of UI styling beyond what the branding replacement requires.
- No addition of new admin features; only stabilization and renaming of what already exists.

## Functional Requirements (FR)

### FR-1: Session Signing Consistency (Fix Login Loop)

- The HMAC signature computed when issuing a session token MUST be computed over the same byte sequence that the Edge-side verifier uses for verification.
- Specifically, if the verifier in `lib/admin/session-edge.ts` verifies `HMAC(payloadB64_string)`, the issuer in `lib/admin/session.ts` MUST sign the same `payloadB64_string`, and vice-versa. Token validation in the Node runtime (`verifySession`) MUST also be aligned.
- After a successful `/api/admin/login` call, the returned `Set-Cookie` session MUST pass verification by:
  - `lib/admin/session.ts:verifySession` (Node)
  - `lib/admin/session-edge.ts:verifySessionEdge` (Edge middleware)
  - `GET /api/admin/session`
  - `middleware.ts` guard for any `/admin/*` page
- The same alignment MUST be applied to the equivalent `lib/aurora-bank/` library pair.
- Session cookies continue to use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` on HTTPS only.

### FR-2: Legacy Import Errors Resolved

- No source file may import from a module path containing the legacy route segment unless that file exists on disk.
- Currently the predecessor library folder does not exist. Every broken import MUST be repointed to an existing library (preferably the matching `lib/aurora-bank/` pair or `lib/admin/` depending on route ownership) or the importing file itself must be deleted if it is redundant with `/admin/*`.
- `middleware.ts` MUST compile and its `config.matcher` MUST reference only route prefixes that correspond to real folders plus their intended session libraries.

### FR-3: Branding Replaced Project-Wide

- Every occurrence of the legacy strings MUST be replaced with a contextually appropriate Aurora Bank variant:
  - Display / title / branding text → `"Aurora Bank"`
  - CamelCase identifiers (e.g. function names like `AuroraBankLoginForm`) → replaced with `AuroraBank` + noun, or removed entirely if the file is deleted.
  - Route URL segments `/aurora-bank/...` and `/api/aurora-bank/...` → either removed (if redundant with `/admin/`) or kept only if they are repurposed to map to the existing Aurora Bank lib. The preferred outcome is removal, because `/admin/*` already provides the admin UI.
  - Cookie name strings like `aurora_bank_session` → align all references (already the value used by `lib/aurora-bank/session.ts`).
  - Spec folder name `.trae/specs/aurora-bank-admin-portal/` → keep with consistent internal references updated.
  - Data attributes / CSS hooks like `data-aurora-bank-root` → keep consistent naming or remove if unused.
  - Placeholder strings such as `admin@aurorabank.local` → keep consistent domain.
- Replacement MUST be case-consistent: a capitalized UI display string becomes "Aurora Bank", a lowercase route segment becomes a lowercase equivalent route name, not a mixed-case URL.

### FR-4: Route Consistency After Rebrand

- If `/aurora-bank/*` pages remain, they MUST still be protected by valid sessions and the middleware matcher. If removed, the middleware matcher entries for `/aurora-bank/:path*` and `/api/aurora-bank/:path*` MUST also be removed to keep the config minimal.
- `/admin/login`, `/admin/dashboard`, and all `/admin/*` routes MUST function exactly as before (or better) after the rebrand.

### FR-5: No Regressions in Public Site

- Public pages (`/`, `/about`, `/services`, `/contact-us`, `/privacy-policy`, `/login`, `/register`, `/dashboard/*`) MUST continue to render without runtime errors.
- All i18n messages already using "Aurora Bank" remain untouched.

## Non-Functional Requirements (NFR)

### NFR-1: Build & Type Safety

- `npx tsc --noEmit` MUST succeed (or any project typecheck command) with no new errors compared to before the change.
- Next.js build time warnings from missing module imports MUST be eliminated for paths that were previously importing predecessor library paths.

### NFR-2: Security

- Session cookies continue to carry `HttpOnly`, `SameSite=Lax`, and `Secure` flags.
- Admin credential comparison remains timing-safe-equal based (no regression to string `===`).
- Rate limiting in the admin login API is preserved (5/15m window), including the artificial 250–500ms timing delay.

### NFR-3: Traceability

- Every replaced string that could affect behaviour (import paths, route paths, cookie names, environment keys if any) MUST be manually verifiable by a code review pass.

## Constraints, Dependencies, Assumptions

- **Constraints**:
  - Admin env vars `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` remain server-side only.
  - No `NEXT_PUBLIC_` exposure of admin credentials.
  - Edge middleware must keep using `crypto.subtle` (not Node `crypto`).
- **Dependencies**:
  - Next.js 16.1.1 with Edge middleware.
  - Existing `lib/admin/*` and `lib/aurora-bank/*` library structure.
- **Assumptions**:
  - `.env.local` is present and populated with valid admin env vars during testing.
  - Legacy `/aurora-bank/*` pages are functionally redundant with `/admin/*` pages and can therefore be deleted rather than repointed, reducing surface area and the risk of further import breakage. If the team later wants a distinct branded "Aurora Bank Wealth" portal it can be re-added from scratch using working libraries.
  - Open questions (see below) are resolved per Assumptions above if no explicit user override is received before approval.

## Open Questions

1. **OQ-1**: Should the `/aurora-bank/*` route tree and its API be deleted as redundant, or kept as a second admin portal entry point?
   - Assumed answer: keep them as `/admin/*` already provides the feature set and the aurora-bank pages correctly import working libraries.
2. **OQ-2**: Should the existing spec folder `.trae/specs/aurora-bank-admin-portal/` maintain its task structure with corrected naming?
   - Assumed answer: keep with `.trae/specs/aurora-bank-admin-portal/` and maintain all internal references with correct Aurora Bank equivalents, preserving historical task structure with corrected naming.

## Acceptance Criteria

Every AC below is either `rule` (objectively pass/fail) or `rubric` (scored).

| ID | Type | Statement | Evidence |
|---|---|---|---|
| AC-1 | rule | A session token issued by `lib/admin/session.ts:issueSession` passes verification by both `lib/admin/session.ts:verifySession` and `lib/admin/session-edge.ts:verifySessionEdge` when called with the same `ADMIN_SESSION_SECRET`. | Unit-style execution of the three functions with a controlled secret; equality of ok=true and matching email. |
| AC-2 | rule | Submitting valid admin credentials to `POST /api/admin/login` on a running dev server results in (a) response 200 JSON `{ok:true}`, (b) a `Set-Cookie` header containing `admin_session=`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and (c) subsequent navigation to `GET /admin/dashboard` returns 200 HTML (not 307 to login). | Browser DevTools Network panel + `curl -i` / cookie-jar script recording both requests in order. |
| AC-3 | rule | Navigating to `GET /admin/dashboard` WITHOUT any admin session cookie returns a 307 redirect with `Location: /admin/login`. The same behaviour holds for any `/admin/users`, `/admin/transactions`, `/admin/requests`. | `curl -I` to each URL without cookie, inspect response code and Location header. |
| AC-4 | rule | `middleware.ts` contains zero imports from predecessor library paths and compiles/loads without Node reporting `MODULE_NOT_FOUND`. | Static read of middleware.ts + dev server boot without import errors. |
| AC-5 | rule | A project-wide case-insensitive `grep -i` run for the legacy brand name against all in-repo source files (excluding `.git/`, `.next/`, `node_modules/`, and the user's memory folders) returns zero matches after the rebrand. | Script/grep command output attached as evidence; run twice to confirm no hidden matches in JSON, Markdown, TS, TSX, CSS, or env/dotfiles. |
| AC-6 | rule | Public pages (`/`, `/about`, `/services`, `/contact-us`, `/privacy-policy`, `/login`, `/register`) render HTTP 200 with their correct i18n text visible and no console errors after the rebrand. | Browser manual smoke test + console log screenshot showing 0 errors. |
| AC-7 | rubric | **Workflow & diff hygiene (0-2)**. Threshold: ≥1. Pass: changes are surgical (minimal diff per file), no unrelated refactors, every file touched has a documented reason. 2 = every single change maps directly to FR-1…FR-5; 1 = one incidental change; 0 = broad unrelated refactors present. | Manual review of `git diff` (or file-by-file change set) with rationale. |
| AC-8 | rubric | **Security & cookie correctness (0-2)**. Threshold: ≥2. Pass: cookie flags remain HttpOnly+Lax+Secure(https), timing-safe compare preserved, rate-limit untouched. 2 = all preserved; 1 = one regression; 0 = two+ regressions. | Static code inspection of session libs + login API route + middleware. |
| AC-9 | rule | `lib/aurora-bank/session.ts` and `lib/aurora-bank/session-edge.ts` are also brought into signing/verification alignment (same AC-1 invariant applied to that library pair). | Same session round-trip evidence as AC-1 but using `SESSION_COOKIE_NAME="aurora_bank_session"` and the aurora-bank lib functions. |
