# Tasks: Aurora Bank Admin Portal

**Spec:** `.trae/specs/aurora-bank-admin-portal/spec.md`
**Date:** 2026-09-21

Task AC Coverage Legend: `AC-1` → links tasks to their parent Acceptance Criteria.
Every task-local Test Requirement (TR) is typed `rule` or `rubric` per Spec Mode vocabulary.

Tasks are executed in order. Later tasks may depend on earlier ones (Dependencies: listed).

---

## Task 1: Session crypto library (`lib/aurora-bank/session.ts`)

**Dependencies:** None (creates new file)
**Priority:** high

Creates the single source of truth for:
- Timing-safe credential comparison (`verifyCredentials`).
- Session token issuance (`issueSession`) with expiry + HMAC signature.
- Session token validation (`verifySession`) — checks signature + expiry.

### Scope (allowed changes)
- NEW: `lib/aurora-bank/session.ts`

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T1-TR1 | rule | `verifyCredentials({email:"FFCLIMMIGRATION@Gmail.com", password:"VtAdmin@2026"})` returns `{ok:true}`. | Node REPL / test import. |
| T1-TR2 | rule | `verifyCredentials({email:"ffclimmigration@gmail.com", password:"wrong"})` returns `{ok:false}` AND the same `verifyCredentials({email:"other@x.com", password:"VtAdmin@2026"})` also returns `{ok:false}`. | REPL assertions. |
| T1-TR3 | rule | Both email and password comparisons use `crypto.timingSafeEqual` on length-normalized buffers (verified by grep of source). | `grep -n timingSafeEqual lib/aurora-bank/session.ts`. |
| T1-TR4 | rule | `issueSession` returns a string token that includes a payload (`exp` timestamp ≥ 1h in the future) and an HMAC-SHA256 signature using `ADMIN_SESSION_SECRET`. | Decode returned token payload in test. |
| T1-TR5 | rule | `verifySession(token)` on freshly issued token returns `{ok:true, email:"ffclimmigration@gmail.com"}`. On a random string it returns `{ok:false}`. On a tampered signature it returns `{ok:false}`. On an expired token (mock clock or mock expiry payload) returns `{ok:false}`. | REPL assertions. |
| T1-TR6 | rule | If `ADMIN_SESSION_SECRET` env var is empty, a stable fallback is generated (per-boot random ≥ 32 bytes), so `issueSession/verifySession` still work within a single process lifetime. | REPL test with env var unset. |
| T1-TR7 | rule | File passes `tsc --noEmit`; no `any` in exported function signatures. | TypeScript compiler output. |

---

## Task 2: Append admin credentials to `.env.local`

**Dependencies:** None
**Priority:** high

Appends three new lines to the **bottom** of [.env.local](file:///c:/projects/My-Banking-App/.env.local) without touching existing content. This satisfies FR-1 and session-secret requirements.

New lines to append:
```
ADMIN_EMAIL=ffclimmigration@gmail.com
ADMIN_PASSWORD=VtAdmin@2026
ADMIN_SESSION_SECRET=replace_with_a_long_random_string_before_prod
```

### Scope (allowed changes)
- EDIT: `.env.local` — append only; no existing line changed.

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T2-TR1 | rule | File contains exactly the three new env vars at the end, in addition to the prior content (no existing var deleted). | `Get-Content .env.local | Select-Object -Last 10` shows three new lines and retains previous last lines (e.g. `NEXT_PUBLIC_CONTACT_PHONE_PRIMARY` is still present). |
| T2-TR2 | rule | `ADMIN_EMAIL` equals the exact string `ffclimmigration@gmail.com` (no surrounding whitespace beyond the `=`). | grep/diff. |
| T2-TR3 | rule | `ADMIN_PASSWORD` equals the exact string `VtAdmin@2026`. | grep/diff. |

---

## Task 3: Login API (`app/api/aurora-bank/login/route.ts`)

**Dependencies:** Task 1, Task 2
**Priority:** high

Implements FR-3 login endpoint. Reads JSON body; verifies credentials via Task 1 lib; issues session via Task 1 lib; writes HttpOnly cookie; appropriate status codes.

### Scope (allowed changes)
- NEW: `app/api/aurora-bank/login/route.ts` (only)

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T3-TR1 | rule | `POST /api/aurora-bank/login` with `{"email":"ffclimmigration@gmail.com","password":"VtAdmin@2026"}` → 200 JSON `{ok:true}` AND `Set-Cookie` header present containing `aurora_bank_session=`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=` ≥ 3600, NO `Secure` on a dev (http) request. | curl or browser Network tab. |
| T3-TR2 | rule | Any wrong payload (email typo / wrong password / missing fields) → 401 JSON `{ok:false, error:"Invalid email or password"}` AND NO Set-Cookie header. | curl variants. |
| T3-TR3 | rule | Invalid JSON body → 400 error without crashing or leaking stack trace to response. | curl with garbled body. |
| T3-TR4 | rule | AC-7 satisfied: all credential comparison routes through `verifyCredentials` from task 1 (so timing-safe compare is applied). | Source grep: `verifyCredentials` in route. |
| T3-TR5 | rule | Password string from request body is never written to `console.*` or response body anywhere in the route. | Static code scan. |

---

## Task 4: Session-check and Logout APIs (`/api/aurora-bank/session`, `/api/aurora-bank/logout`)

**Dependencies:** Task 1, Task 3
**Priority:** high

- `GET /api/aurora-bank/session`: read `aurora_bank_session` cookie, call `verifySession`; respond 200 with identity or 401.
- `POST /api/aurora-bank/logout`: clear cookie, respond 200.

### Scope (allowed changes)
- NEW: `app/api/aurora-bank/session/route.ts`
- NEW: `app/api/aurora-bank/logout/route.ts`

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T4-TR1 | rule | After login from Task 3, `GET /api/aurora-bank/session` returns 200 body `{"ok":true,"email":"ffclimmigration@gmail.com"}`. | curl with cookie jar. |
| T4-TR2 | rule | No `aurora_bank_session` cookie (or random cookie value): `GET /api/aurora-bank/session` returns 401 body `{"ok":false}`. | curl without cookie. |
| T4-TR3 | rule | `POST /api/aurora-bank/logout` (any body allowed, no session required) always responds 200 `{ok:true}` AND response header `Set-Cookie` includes `aurora_bank_session=;` with `Max-Age=0` (or `Expires` in the past) AND `Path=/; HttpOnly; SameSite=Lax`. | curl test + inspect Set-Cookie. |
| T4-TR4 | rule | After logout, the prior session cookie value sent again to `/api/aurora-bank/session` returns 401 (cookie was cleared client-side by Set-Cookie, so browser won't send; verify server still rejects stale ones too — for sessions validated server-side, even if client still sends old, verify should still pass until expiry; the test for T4-TR2 covers the new state). | curl test. |

---

## Task 5: Middleware route guard (`middleware.ts`)

**Dependencies:** Task 1 (reuses verifySession), Tasks 3–4 (routes created first)
**Priority:** high

Implements FR-4 and AC-5. **Strictly scoped matcher** so NO existing routes see the middleware at all.

### Scope (allowed changes)
- NEW: `middleware.ts` at project root (`c:\projects\My-Banking-App\middleware.ts`)

### Matcher contract (required)
```
export const config = {
  matcher: ["/aurora-bank/:path*", "/api/aurora-bank/:path*"],
};
```

### Behavior
1. For `/aurora-bank/login` — always pass through (no redirect if no session).
2. For `/aurora-bank/dashboard` and any other page under `/aurora-bank/*` except login:
   - If `aurora_bank_session` cookie is absent → redirect 307 to `/aurora-bank/login`.
   - If `aurora_bank_session` cookie is present but `verifySession` returns ok=false → redirect 307 to `/aurora-bank/login`.
   - Otherwise → pass through.
3. For `/api/aurora-bank/login` and `/api/aurora-bank/logout` — always pass through.
4. For `/api/aurora-bank/session` and any other `/api/aurora-bank/*`: if no valid session → respond 401 JSON.
5. For anything not matching the two patterns → middleware is never even invoked (guaranteed by matcher).

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T5-TR1 | rule | Middleware `config.matcher` value is exactly `["/aurora-bank/:path*", "/api/aurora-bank/:path*"]`. | Static code read. |
| T5-TR2 | rule | `curl -I http://localhost:3000/aurora-bank/dashboard` (no cookie) → response is 307 with `Location: /aurora-bank/login`. | curl verbose headers. |
| T5-TR3 | rule | Same curl WITH a valid `aurora_bank_session` cookie → 200 (dashboard page rendered), no redirect. | curl with cookie. |
| T5-TR4 | rule | `curl -I http://localhost:3000/` → 200, and the response headers contain NO trace of middleware action (no `x-middleware-*` injected custom headers from our code). | curl verbose + source scan: middleware injects no custom headers for pass-through. |
| T5-TR5 | rule | `curl -I http://localhost:3000/admin/dashboard` → passes through without redirect to `/aurora-bank/login`. (This is a key separation requirement.) | curl test. |
| T5-TR6 | rule | `curl http://localhost:3000/api/aurora-bank/session` (no cookie) → 401 JSON. | curl. |

---

## Task 6: AuroraBank Login Page (`app/aurora-bank/login/page.tsx`)

**Dependencies:** Task 3 (login endpoint exists)
**Priority:** high

Implements FR-2. Client component with email/password form, Aurora Bank dark navy theming, error display, loading state. Calls the Task 3 API on submit.

### Scope (allowed changes)
- NEW: `app/aurora-bank/login/page.tsx` — `"use client";`

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T6-TR1 | rule | Renders a dark navy background page with Aurora Bank logo/wordmark, email input, password input, gold submit button ("Sign In"), "Back to site" link to `/`, and a footer tagline. | Snapshot / DOM check. |
| T6-TR2 | rule | Submitting wrong creds → inline error box shows exactly text "Invalid email or password." (matches Task 3 server message) and user stays on the page. | Manual browser test + DOM text check. |
| T6-TR3 | rule | Submitting correct creds → redirects to `/aurora-bank/dashboard` and cookie `aurora_bank_session` now exists in Application → Cookies. | Browser test. |
| T6-TR4 | rule | Inputs have proper `<label>` + `for` association; password field has `type="password"`; error box uses `role="alert"`. | DOM inspector. |
| T6-TR5 | rule | No credentials hard-coded in the page source. Password/email are only in the POST body at submission time. | Source code inspection. |

---

## Task 7: AuroraBank Layout (route group guard) and Dashboard Page (`app/aurora-bank/dashboard/page.tsx`, `app/aurora-bank/layout.tsx`)

**Dependencies:** Tasks 1–6 (session API, middleware, login all exist)
**Priority:** high

This is the heart of FR-5 and AC-6. Implements the Aurora Bank dedicated admin dashboard per the screenshot.

### Layout
- NEW: `app/aurora-bank/layout.tsx` — wraps children, optional: fetches session on mount and re-redirects to login if session ever invalidates (redundant with middleware but client-side defense in depth is fine; not required).

### Dashboard Page
- NEW: `app/aurora-bank/dashboard/page.tsx` — `"use client";` (needs session fetch, logout button, stateful interactions like search).

Dashboard MUST render (see AC-6 rubric):

1. **Page chrome:**
   - Background: dark navy (`bg-[#0b1020]` or equivalent Tailwind dark via class).
   - Top-left: Aurora Bank shield logo (SVG, shield shape with letter "A" in navy-on-gold or gold-on-navy) + "Aurora Bank" wordmark + "WEALTH TRUST STEWARD" tagline.
   - Top-right:
     - Gold outlined button "Open Customer Dashboard" → link to `/admin/dashboard`.
     - Red solid button "Logout" → calls `POST /api/aurora-bank/logout`, clears state, redirects to `/aurora-bank/login`.
   - Subtitle row: "Admin dashboard for managing users and live customer balances."

2. **Stat cards row (3 cards):**
   - Total Users → big number `12`, subtitle "Registered customer accounts".
   - Total Balances → big `$2,041,091,066.00`, subtitle "Combined live balances in Firestore".
   - Signed In As → email from `/api/aurora-bank/session` response (`ffclimmigration@gmail.com`), subtitle "Single secure admin account".

3. **Customer Accounts section:**
   - Header: "Customer Accounts" with subtitle "Update names, account status, and balance. Changes appear on the customer dashboard after refresh."
   - Section toolbar right side:
     - Gold outline button: "Clear Old Accounts"
     - Gold solid button: "Create Customer"
     - Dark pill-shaped search input with placeholder "Search by name, email, account number, or status"
   - 6-column table header: **CUSTOMER | ACCOUNT | BALANCE | STATUS | NAMES | ACTION**
   - At minimum one sample customer row that mirrors the screenshot row:
     - **CUSTOMER:** "Patrick Jekbh" (bold blue link) + email line + UID line beneath
     - **ACCOUNT:** `5734160861` in black pill + "USD" subtitle
     - **BALANCE:** `3007300` in black pill (we'll show `3007300` matching the screenshot's integer)
     - **STATUS:** ACTIVE pill + ACTIVE dropdown select
     - **NAMES:** Two stacked inputs ("Patrick", "Jekbh") on black background
     - **ACTION:** Stacked gold buttons — "Suspend", "Close", "Delete" (Delete slightly darker gold per design)
   - Button clicks: stub — just trigger a toast-or-alert-or-console stub ("Feature stub" message). We deliberately do NOT implement write logic for now per the spec non-goals.

### Scope (allowed changes)
- NEW: `app/aurora-bank/layout.tsx`
- NEW: `app/aurora-bank/dashboard/page.tsx`
- If Aurora Bank needs a reusable AuroraBankHeader subcomponent inside a AuroraBank-only subfolder that's OK, but NO files in `components/` (that would modify shared dir). Keep dashboard layout components in-page or in `app/aurora-bank/_components/` (Next 16 convention — underscored folders inside `app/` are private and not routable).

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T7-TR1 | rule | AC-6 rubric: Score ≥ 4 on the 5-dimension visual fidelity rubric defined in spec (each dimension: logo/background chrome, top-right buttons pair, 3 stat cards with exact content, customer accounts section with 4 toolbar items, 6-column header + 1 full row). | Visual diff + checklist. |
| T7-TR2 | rule | The signed-in email in the third stat card is populated from `GET /api/aurora-bank/session`, NOT hard-coded. Manually changing the session lib to return a different email must change the dashboard text. | Code inspection + mock test. |
| T7-TR3 | rule | Logout button: on click → POST to `/api/aurora-bank/logout`, then redirects to `/aurora-bank/login`. Afterwards, navigating to `/aurora-bank/dashboard` bounces back to login (end-to-end of AC-3). | Browser manual test. |
| T7-TR4 | rule | "Open Customer Dashboard" button navigates to `/admin/dashboard` (href or router.push), target path matches exactly. | DOM click test or attribute check. |
| T7-TR5 | rule | No `components/` directory was written to and no shared utility files were edited by this task. | `git status` check on `components/`, `lib/` subdirs except `lib/aurora-bank`. |
| T7-TR6 | rule | Dashboard passes React rendering without runtime errors in browser console (no undefined accesses, no missing imports). | Browser console clean of Aurora Bank stack errors. |

---

## Task 8: End-to-end manual test + build/typecheck

**Dependencies:** Tasks 1–7 all completed.
**Priority:** high

Runs through every AC with explicit evidence gathering, and runs `npm run build` + TypeScript check.

### Scope (allowed changes)
- No file changes permitted unless tests reveal bugs (then return to the relevant task, fix, then re-run Task 8 from the top).
- Produces the completion evidence block that will be filled in under each task below.

### Test Requirements

| TR | Type | Pass Condition | Evidence |
|---|---|---|---|
| T8-TR1 | rule | Full E2E happy path: clean cookies → `/aurora-bank/dashboard` redirect to `/aurora-bank/login` → submit correct creds → land on `/aurora-bank/dashboard` with all chrome visible → session API returns 200 identity → logout → bounce back to login on next dashboard access. | Browser test with screenshots + network log. |
| T8-TR2 | rule | Negative auth tests (wrong email, wrong password, empty, random session cookie) ALL end on `/aurora-bank/login` with appropriate errors and no cookie issuance. | Browser + curl tests. |
| T8-TR3 | rule | AC-8: zero-modify constraint audit — list every touched file; all must be within the NFR-1 allowed-set plus `.env.local` append. | `git diff --name-only` or manual file list. |
| T8-TR4 | rule | AC-9: `npm run build` exits with code 0 and no new TypeScript or build errors compared to pre-implementation. | Build terminal output. |
| T8-TR5 | rule | AC-10: the login response Set-Cookie attributes match contract (HttpOnly SameSite=Lax Path=/ Max-Age≥3600, Secure iff https). | Network tab screenshot or curl verbose. |
| T8-TR6 | rubric | AC-11 session security resilience. Scale 0–3, threshold ≥ 2: (a) random or signed token (1pt), (b) expiry enforced (1pt), (c) random forgery rejected (1pt). | Source + manual test. |

---

## Task Status

(Updated as tasks are executed.)

### Task 1
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 2
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 3
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 4
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 5
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 6
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 7
- **Status:** pending
- **Completion Evidence:** (to be filled)

### Task 8 (Verification)
- **Status:** pending
- **Completion Evidence:** (to be filled)
