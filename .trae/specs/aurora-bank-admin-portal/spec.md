# Spec: Aurora Bank Dedicated Admin Portal with Fixed-Credential Auth

**Version:** 1.0
**Date:** 2026-09-21
**Natural Language:** English (consistent with user request)

---

## 1. Problem

The existing admin section (`/admin/*`) is built on top of Firebase Auth with role-based Firestore profile checks. This has two problems for the requested feature:

1. **No Firebase-independent admin access.** Setting up real Firebase admin credentials (email/password signup, email verification, Firestore profile with `role: "admin"`, a real Firestore project wired up, etc.) is a hard dependency that blocks basic admin UI access in environments without Firebase.
2. **Visual mismatch.** The existing admin UI uses a light "Aurora Bank" theme with blue/white styling. The provided screenshot specifies a dark "Aurora Bank" branded design with navy backgrounds, gold (yellow) accent buttons, a 3-stat-card header, a customer-accounts table with account/balance/status/names columns, and top-right "Open Customer Dashboard" + "Logout" actions.

The user explicitly requires a **secure admin login system authenticating with fixed credentials** and integrating **the provided design as the dedicated admin page**, **without modifying any existing code, functionality, or features outside this admin page implementation**.

---

## 2. Users

- **Single secure admin account holder:** Person owning `ffclimmigration@gmail.com` with password `VtAdmin@2026`. Signs into `/admin/login`, sees Aurora Bank-branded dashboard, and uses dashboard controls.
- **Non-admin users / random visitors:** Must not be able to access `/admin/dashboard` or any admin subpages. The `/admin` entry page should route them appropriately.
- **Developers / maintainers:** Must be able to read the codebase and see that the Aurora Bank admin subsystem is strictly additive and non-invasive — no changes to existing components, existing `/admin/login` (Firebase) behaviour, existing dashboard pages, existing role helpers, existing UserTable, existing FundUserModal, etc.

---

## 3. Goals

- Provide a standalone, Firebase-free authentication path for the admin section using exactly two fixed environment variables (`ADMIN_EMAIL=ffclimmigration@gmail.com`, `ADMIN_PASSWORD=VtAdmin@2026`).
- Apply the provided "Aurora Bank" visual design (dark navy background, Aurora Bank shield logo + brand, gold accent buttons, 3 stat cards, customer accounts table with search, action buttons) as the primary dedicated admin dashboard view.
- Guard the new Aurora Bank dashboard (and any subpages under the Aurora Bank admin path) so only the fixed credential grants access — all other requests are bounced to the new login page.
- Preserve 100% of existing components, pages, routes, helpers, styles, and logic outside the new admin page subtree. Existing Firebase-backed admin pages must keep working as-is for users who set them up later.
- Make both auth modes coexist cleanly under `/admin` without routing conflicts.

---

## 4. Non-Goals

- **Do not** alter [app/admin/login/page.tsx](file:///c:/projects/My-Banking-App/app/admin/login/page.tsx), [app/admin/(dashboard)/layout.tsx](file:///c:/projects/My-Banking-App/app/admin/(dashboard)/layout.tsx), [app/admin/(dashboard)/dashboard/page.tsx](file:///c:/projects/My-Banking-App/app/admin/(dashboard)/dashboard/page.tsx), [app/admin/(dashboard)/users/page.tsx](file:///c:/projects/My-Banking-App/app/admin/(dashboard)/users/page.tsx), [app/admin/(dashboard)/transactions/page.tsx](file:///c:/projects/My-Banking-App/app/admin/(dashboard)/transactions/page.tsx), [app/admin/(dashboard)/requests/page.tsx](file:///c:/projects/My-Banking-App/app/admin/(dashboard)/requests/page.tsx), or any of their dependencies (AdminHeader, AdminSidebar, UserTable, FundUserModal, roles.ts, firebase.ts, firebaseAdmin.ts).
- **Do not** touch globals: `lib/config.ts`, `lib/firebase.ts`, `lib/firebaseAdmin.ts`, `lib/cloudinary.ts`, `lib/roles.ts`, `next.config.ts`, `.gitignore`, existing `.env.local` comments for unrelated vars, `app/layout.tsx`, `app/globals.css` theme tokens, `Navbar`, `Footer`, `ToastProvider`, any customer pages under `app/dashboard/*`, `app/login`, `app/register`, etc.
- **Do not** replace the Firebase auth path. The existing Firebase admin login must remain reachable and functional for existing users.
- **Do not** implement real write-side customer management (Create/Clear Old Accounts/Suspend/Close/Delete) in this iteration. The Aurora Bank dashboard UI includes the buttons as per the design, but they will stub-toast for now unless the page already loads Firestore data passively. Firebase placeholder env vars from the prior `.env.local` fix mean live writes are not testable anyway. The UI/UX of the design must still be faithfully rendered (rule — visual accuracy required).
- **Do not** add extra login providers, MFA, or password reset for the fixed-credential auth.
- **Do not** commit the credential values in source (they stay in `.env.local` which is already gitignored). Code references must read from `process.env`.

---

## 5. Functional Requirements

### FR-1 — Fixed credential configuration
- The fixed credentials SHALL be read from environment variables:
  - `ADMIN_EMAIL` — must equal `ffclimmigration@gmail.com` (case-insensitive compare on input).
  - `ADMIN_PASSWORD` — must equal `VtAdmin@2026` (case-sensitive compare on input).
- These vars SHALL be appended to [.env.local](file:///c:/projects/My-Banking-App/.env.local) during task 2.

### FR-2 — New Aurora Bank login page
- New route `/aurora-bank/login` SHALL exist. It SHALL be a client page with an email input, password input, submit button, inline error display, and loading state.
- Submitting wrong email or wrong password SHALL NOT leak which field was wrong (return a single generic "Invalid email or password" error).
- Submitting correct credentials SHALL call a server auth API (see FR-3), receive a session token, persist the token to an HttpOnly cookie via the response, then redirect to `/aurora-bank/dashboard`.
- The login page SHALL match Aurora Bank theming: dark navy background, Aurora Bank logo, gold accent on the submit button.
- A link back to the public site `/` SHALL be present.

### FR-3 — Server-side auth API
- New route `/api/aurora-bank/login` (POST) SHALL:
  1. Read `email` and `password` from the JSON body.
  2. Timing-safe compare against `ADMIN_EMAIL` (case-normalized) and `ADMIN_PASSWORD`.
  3. On success, issue a short-lived signed session (JWT-style or crypto-signed random string with expiry — minimum 1 hour, HMAC with a secret derived from a new `ADMIN_SESSION_SECRET` env var, defaulting to a per-install fallback if unset).
  4. Write the session to an HttpOnly, Secure (when https), `SameSite=Lax` cookie named `aurora_bank_session` with path `/` and a matching max-age.
  5. Respond `200 { ok: true }`.
  6. On failure, respond `401 { ok: false, error: "Invalid email or password" }` — same message for any mismatch.
- New route `/api/aurora-bank/logout` (POST) SHALL clear the `aurora_bank_session` cookie and respond `200 { ok: true }`.
- New route `/api/aurora-bank/session` (GET) SHALL validate the cookie and respond `200 { ok: true, email: "ffclimmigration@gmail.com" }` or `401 { ok: false }`.

### FR-4 — Route guard via Next.js middleware
- New `middleware.ts` at the project root SHALL run only for paths under `/aurora-bank/*`.
- For GET requests to `/aurora-bank/dashboard` and any future `/aurora-bank/*` pages: if the `aurora_bank_session` cookie is missing or invalid, redirect to `/aurora-bank/login`.
- For POST requests to `/aurora-bank/*` APIs that are NOT `/api/aurora-bank/login`: same guard — respond `401` if no valid session.
- ALL other paths (everything not under `/aurora-bank/*`) SHALL be completely untouched by the middleware — zero redirects, zero rewrites, zero cookie inspection. `matcher` config SHALL restrict scope to `/aurora-bank/:path*` and `/api/aurora-bank/:path*` only.

### FR-5 — Aurora Bank admin dashboard (the "dedicated admin page" matching the provided design)
- New route `/aurora-bank/dashboard` SHALL render the Aurora Bank-branded admin layout exactly per the screenshot:
  - Dark navy (near-black) page background (`#0b1020`–`#111827` range), subtle gradient or soft dark surfaces for cards.
  - Top-left Aurora Bank shield logo + "Aurora Bank" wordmark + "WEALTH TRUST STEWARD" tagline or similar to match the screenshot.
  - Top-right: outline gold button labeled "Open Customer Dashboard" that links to `/admin/dashboard` (the existing Aurora-admin dashboard).
  - Top-right: solid red button labeled "Logout" that POSTs to `/api/aurora-bank/logout` then redirects to `/aurora-bank/login`.
  - Subhead: "Admin dashboard for managing users and live customer balances."
  - Three stat cards in a row (Total Users · Total Balances · Signed In As):
    - Total Users: shows 12 with subtitle "Registered customer accounts" (the number comes from a `useState` default or from counting Firestore users if a snapshot loads; both are acceptable).
    - Total Balances: shows `$2,041,091,066.00` with subtitle "Combined live balances in Firestore".
    - Signed In As: shows `ffclimmigration@gmail.com` with subtitle "Single secure admin account" (this email SHALL come from the `/api/aurora-bank/session` response — never hard-coded in client JSX).
  - Customer Accounts section:
    - Section header "Customer Accounts" with subtitle "Update names, account status, and balance. Changes appear on the customer dashboard after refresh."
    - Top-right of section: gold outline button "Clear Old Accounts", gold solid button "Create Customer", and a dark pill-shaped search input with placeholder "Search by name, email, account number, or status".
    - Table columns: **CUSTOMER | ACCOUNT | BALANCE | STATUS | NAMES | ACTION**.
    - At least one sample row rendered (e.g. Patrick Jekbh / 5734160861 / 300730 USD / ACTIVE status pill + dropdown / two name inputs / Suspend+Close+Delete stacked buttons) — exactly matching the screenshot's information architecture.
    - Row style: dark inputs (black pill backgrounds), gold buttons for actions, white text on dark navy.

### FR-6 — `/admin` entry page redirect preserves both admin modes
- The existing page at [app/admin/page.tsx](file:///c:/projects/My-Banking-App/app/admin/page.tsx) currently redirects to `/admin/dashboard`. This file MUST NOT be edited. Instead, the new Aurora Bank dashboard lives under its own URL prefix `/aurora-bank/*` so no redirect conflict exists.
- (Optional soft navigation addition without touching code: users can be told the dedicated new admin is at `/aurora-bank/dashboard`; the old Aurora admin remains at `/admin/dashboard`.)

### FR-7 — Existing routes remain functional
- Every existing page, component, helper, API route, file, and function outside of `app/aurora-bank/*`, `app/api/aurora-bank/*`, `middleware.ts`, and the two-line addition to `.env.local` SHALL remain byte-for-byte identical to their state before this spec's implementation. We verify this in the review phase by `git diff` (if git is available) or by targeted file checks.

### FR-8 — End-to-end auth behavior
- The sequence `/aurora-bank/dashboard` (no cookie) → `middleware.ts` redirects → `/aurora-bank/login` → enter correct credentials → `POST /api/aurora-bank/login` sets cookie → redirects to `/aurora-bank/dashboard` → dashboard renders with stat cards and customer table SHALL pass.
- Wrong email, wrong password, empty fields: all SHALL result in generic error on login page, no cookie set, no redirect to dashboard.
- After logout via the red button, accessing `/aurora-bank/dashboard` SHALL bounce back to login.

---

## 6. Non-Functional Requirements

### NFR-1 — Zero-modify constraint
- Implementation SHALL NOT mutate any file not explicitly listed in the allowed-set below.

  **Allowed new files:**
  - `app/aurora-bank/login/page.tsx`
  - `app/aurora-bank/dashboard/page.tsx`
  - `app/aurora-bank/layout.tsx` (only if Aurora Bank needs a shared layout guard)
  - `app/api/aurora-bank/login/route.ts`
  - `app/api/aurora-bank/logout/route.ts`
  - `app/api/aurora-bank/session/route.ts`
  - `lib/aurora-bank/session.ts` (sign/verify helpers, keeps auth logic out of page files)
  - `middleware.ts` at project root
  - `.trae/specs/aurora-bank-admin-portal/**` (this spec, tasks, review)

  **Allowed existing-file edits:**
  - `.env.local` — append only (3 new lines: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`). Existing lines SHALL NOT be modified.
  - If `middleware.ts` already exists it would be edited; but we verified it does not.

  **Everything else is STRICTLY out of scope.**

### NFR-2 — Credential hygiene
- `ADMIN_PASSWORD` SHALL never be sent to the browser, never serialized in client responses, never printed to console.log, and never embedded in JSX.
- The login page only POSTs user input; comparison runs server-side.
- If `ADMIN_SESSION_SECRET` is absent, a stable per-boot random secret is acceptable (sessions will invalidate on server restart; that's fine for this scope).

### NFR-3 — Timing-safe credential compare
- Both the email (after lowercasing) and password compares SHALL use a constant-time function (e.g., Node.js `crypto.timingSafeEqual` on buffers of equal length after SHA-256 normalization, or a well-known length-equalized compare) to avoid oracle attacks. The function lives in `lib/aurora-bank/session.ts`.

### NFR-4 — TypeScript strict compliance
- All new files SHALL pass `tsc --noEmit` (or the project's existing build) with zero new type errors.
- No `any` escapes in security-critical paths (`lib/aurora-bank/session.ts`, API routes, middleware).

### NFR-5 — Accessibility on forms
- Login form inputs SHALL have proper `<label>` associations, `type="email"`, `type="password"`, `aria-invalid` when errors present, `role="alert"` for the error box.
- Dashboard buttons SHALL be real `<button>` elements with accessible names.

### NFR-6 — Self-contained styling
- Aurora Bank dashboard SHALL use Tailwind utility classes. No new files in `components/`, no CSS files added to `app/globals.css`, no shared classes that would leak to existing customer pages. All component pieces for Aurora Bank live inline or inside `app/aurora-bank/*` files.

### NFR-7 — No new production dependencies
- Implement auth with only Node built-ins (`crypto`, etc.) and the existing Next.js server APIs. Installing new packages (`jsonwebtoken`, `bcrypt`, etc.) is disallowed by NFR-1/NFR-1 constraint anyway. The existing `package.json` SHALL remain unmodified.

---

## 7. Constraints, Dependencies, Assumptions

- **Constraint C1:** Can only change files listed in NFR-1 allowed-set.
- **Constraint C2:** Credentials are fixed for the life of this implementation as: `ADMIN_EMAIL=ffclimmigration@gmail.com`, `ADMIN_PASSWORD=VtAdmin@2026`. Code must read them from env so changing the env later works without code edits.
- **Constraint C3:** No Firebase dependency for Aurora Bank auth path. Even if Firebase env vars are placeholders, Aurora Bank login/dashboard must still work via env-var + cookie alone.
- **Constraint C4:** No committing credentials. `.env.local` is already `.gitignore`d per line 34 of `.gitignore`.
- **Dependency D1:** Node.js runtime with `crypto` module available (standard on Node 18+ which Next 16 requires).
- **Dependency D2:** Next.js middleware support (`middleware.ts` at root matching the `/aurora-bank/:path*` pattern). Verified compatible with Next 16.
- **Assumption A1:** The provided "Open Customer Dashboard" button should navigate to `/admin/dashboard` (the pre-existing Aurora dashboard), keeping both admin experiences reachable.
- **Assumption A2:** Customer account data shown in the Aurora Bank dashboard table can be static seed data matching the screenshot values. Live Firestore loading is bonus, not required, because real Firebase credentials are placeholder values in `.env.local`.
- **Assumption A3:** Middleware matcher config in Next.js works for both `/aurora-bank/:path*` pages and `/api/aurora-bank/:path*` APIs in the same middleware.
- **Assumption A4:** HttpOnly cookies set in Route Handlers (`NextResponse` headers + `cookies()` API) persist correctly across middleware and client navigation.

---

## 8. Open Questions

None at this time. All decisions above are made within the constraint set; if user disagrees with any assumption, they will flag it during approval.

---

## 9. Acceptance Criteria

**Type legend:** `rule` = objectively verifiable pass/fail condition. `rubric` = evaluative score with threshold.

### AC-1 — RULE — Fixed credentials grant access and only those credentials
> Visible when: Starting from zero cookies, navigate to `/aurora-bank/login`.
> - Submit email=`ffclimmigration@gmail.com` password=`VtAdmin@2026` → redirects to `/aurora-bank/dashboard` and a `aurora_bank_session` cookie is present (browser dev tools → Application → Cookies).
> - Submit email=`wrong@example.com` password=`VtAdmin@2026` → stays on `/aurora-bank/login`, shows "Invalid email or password", NO `aurora_bank_session` cookie.
> - Submit email=`ffclimmigration@gmail.com` password=`wrongpassword` → stays on `/aurora-bank/login`, shows "Invalid email or password", NO cookie.
> - Submit empty form → generic validation error inline; NO cookie.
> Evidence: Browser devtools network log for `/api/aurora-bank/login` plus Application cookie pane.

### AC-2 — RULE — Direct dashboard access without session redirects to login
> Open `/aurora-bank/dashboard` in a fresh incognito window (no `aurora_bank_session` cookie). Expect a 302/307 redirect via middleware to `/aurora-bank/login`. The dashboard HTML is never rendered.
> Evidence: Browser Network tab entries for first request + final URL.

### AC-3 — RULE — Logout revokes access
> Logged into Aurora Bank dashboard, click red "Logout" button. Expect:
> - POST to `/api/aurora-bank/logout` returns 200.
> - `aurora_bank_session` cookie is cleared or expired.
> - Redirecting to `/aurora-bank/login`.
> - Attempt to re-open `/aurora-bank/dashboard` redirects back to login (same as AC-2).
> Evidence: Network log + cookie pane.

### AC-4 — RULE — Session API confirms identity
> After login, `GET /api/aurora-bank/session` returns `200 { ok: true, email: "ffclimmigration@gmail.com" }`. After logout or with no cookie, returns `401 { ok: false }`.
> Evidence: curl/browser Network tab JSON response.

### AC-5 — RULE — Middleware never touches non-Aurora Bank routes
> For URLs: `/`, `/about`, `/login`, `/register`, `/admin/login`, `/admin/dashboard`, `/api/send`, `/api/contact`, `/dashboard/profile`, `/favicon.ico`:
> - No redirects or status changes attributable to `middleware.ts`.
> - No cookie `aurora_bank_session` created or inspected.
> Evidence: Middleware `matcher` configuration strictly lists only `/aurora-bank/:path*` and `/api/aurora-bank/:path*`. Verifiable by reading [middleware.ts](file:///c:/projects/My-Banking-App/middleware.ts) matcher regex.

### AC-6 — RUBRIC — Aurora Bank dashboard visual fidelity to screenshot
> Scale 0–5; **pass threshold ≥ 4**.
> - (1) Dark navy page background + Aurora Bank shield/logo wordmark top-left.
> - (1) Top-right: gold "Open Customer Dashboard" outline button + red solid "Logout" button.
> - (1) Three stat cards (Total Users / Total Balances / Signed In As) with correct values and subtitles as shown.
> - (1) Customer Accounts section: section header + subtitle, "Clear Old Accounts" + "Create Customer" gold buttons, dark search pill, 6-column table header.
> - (1) At least one customer row in the table with CUSTOMER (name + email + uid), ACCOUNT (number + USD), BALANCE (black pill), STATUS (ACTIVE dropdown + pill), NAMES (two stacked inputs), ACTION (Suspend / Close / Delete stacked buttons in gold palette).
> Evidence: Browser screenshot of `/aurora-bank/dashboard` compared to provided reference screenshot.

### AC-7 — RULE — Timing-safe credential compare
> In [lib/aurora-bank/session.ts](file:///c:/projects/My-Banking-App/lib/aurora-bank/session.ts) (or equivalent auth helper): both email and password comparisons SHALL use `crypto.timingSafeEqual` (or equivalent documented constant-time library) on two length-normalized inputs.
> Evidence: Static code inspection + grep `timingSafeEqual` source.

### AC-8 — RULE — Strict zero-modify on files outside allowed-set
> Before and after implementation, compare contents of:
> - All files in `components/` (AdminHeader, AdminSidebar, Navbar, Footer, UserTable, FundUserModal, etc.)
> - All files in `app/admin/` (existing login, layout, dashboard, users, transactions, requests)
> - `lib/firebase.ts`, `lib/firebaseAdmin.ts`, `lib/roles.ts`, `lib/cloudinary.ts`, `lib/config.ts`, `lib/adminBootstrap.ts`
> - `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `.gitignore`
> Every listed file SHALL be character-for-character identical to the state before implementation. The only existing file permitted changes is `.env.local` and only by append.
> Evidence: Either `git diff -- <paths>` output (empty) or static hash comparison before/after.

### AC-9 — RULE — TypeScript/build clean
> Run `npx next build` (or the project's existing build command) once implementation is done. Expect zero type errors, zero build errors, and Aurora Bank pages successfully compiled into the output.
> Evidence: Terminal output of the build command showing `✓ Compiled` / exit code 0.

### AC-10 — RULE — HttpOnly, Secure (conditional), SameSite=Lax cookie attributes
> The Set-Cookie header returned by `POST /api/aurora-bank/login` for `aurora_bank_session` SHALL include: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=` (or `Expires=`) ≥ 1h, and `Secure` if and only if the request was over https (dev http → no Secure flag).
> Evidence: Browser Network tab Response headers for `/api/aurora-bank/login` Set-Cookie line.

### AC-11 — RUBRIC — Session security resilience
> Scale 0–3; **pass threshold ≥ 2**.
> - (1) Session token is cryptographically random (≥ 32 bytes from `crypto.randomBytes` or similar) OR a signed string using HMAC-SHA256 with `ADMIN_SESSION_SECRET`.
> - (1) Session tokens expire server-side (checked during session.verify against stored expiry). Tokens older than 8h are rejected even if cookie is still present.
> - (1) Token signature/value cannot be forged (i.e. you can't guess one and get 200 from `/api/aurora-bank/session`).
> Evidence: Static inspection of session.ts + manual test with a random cookie string.
