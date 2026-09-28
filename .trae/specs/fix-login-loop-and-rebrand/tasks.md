# Tasks: Fix Admin Login Loop & Rebrand

**Spec:** `.trae/specs/fix-login-loop-and-rebrand/spec.md`

Traceability: every Acceptance Criterion in spec.md maps to at least one task-local Test Requirement below.

---

## Task 1: Align HMAC signing input in `lib/admin/session.ts` with the Edge verifier

**Priority:** high
**Status:** pending
**Read first:** `lib/admin/session.ts`, `lib/admin/session-edge.ts`

### Changes
- Modify `lib/admin/session.ts`:
  - In `issueSession`: compute the HMAC over the **base64url-encoded payload string** (i.e. `payloadB64`) instead of the raw `payloadBuf`. The token format is `payloadB64.sigB64`, and the sig must match what `verifySessionEdge` checks, which is currently `HMAC(payloadB64_string)`.
  - In `verifySession`: recompute the expected HMAC also over the recovered `payloadB64` (or the equivalent bytes of that string) to keep the Node verifier aligned with the issuer and the Edge verifier.
- Apply the same alignment to `lib/aurora-bank/session.ts` so the aurora-bank library pair matches too.

### Parent AC coverage
- AC-1 (rule: session roundtrip ok admin)
- AC-9 (rule: session roundtrip ok aurora-bank)
- AC-8 (rubric: security preserved)

### Task-local Test Requirements
| TR | Type | Statement | Evidence |
|---|---|---|---|
| T1-TR1 | rule | Using a fixed 48-char secret `ADMIN_SESSION_SECRET="012345678901234567890123456789012345678901234567"` and a freshly issued token from `issueSession({email:"a@b.test"})`: calling `verifySession(token)` returns `{ok:true, email:"a@b.test"}`. | Node REPL / small script running both functions in the same process; record returned objects. |
| T1-TR2 | rule | Using the SAME fixed secret, simulate the Edge side: read the source of `verifySessionEdge` and, with `globalThis.process.env.ADMIN_SESSION_SECRET` set, await `verifySessionEdge(token)` on the token from T1-TR1 → resolves to `{ok:true, email:"a@b.test"}`. | Same script as T1-TR1 but calling the Edge function with its global env shim; record result. |
| T1-TR3 | rule | Repeat T1-TR1 and T1-TR2 for the `lib/aurora-bank/*` library pair. Token roundtrip ok for both Node and Edge variants. | Same procedure as T1-TR1/2 but importing from aurora-bank paths. |
| T1-TR4 | rule | Static read confirms `issueSession` HMAC input is the base64url string (not raw JSON buffer), and `verifySession` compares HMACs computed over the same representation. Mention exact line numbers. | Source code line reference. |
| T1-TR5 | rubric | **Security regression check (0-2, pass ≥2).** 2 = timingSafeEqual kept for both cred verify AND sig compare; HttpOnly/Lax/Path preserved; no new code logs the secret or token. 1 = one small issue. 0 = two+ issues. | Manual code review of changed sections. |

---

## Task 2: Remove broken legacy imports from `middleware.ts` and clean predecessor route tree

**Priority:** high
**Status:** pending
**Depends on:** (none; can run in parallel with Task 1)
**Read first:** `middleware.ts`, `app/api/aurora-bank/login/route.ts`, `app/api/aurora-bank/logout/route.ts`, `app/api/aurora-bank/session/route.ts`, `app/aurora-bank/layout.tsx`, `app/aurora-bank/login/page.tsx`, `app/aurora-bank/dashboard/page.tsx`

### Rationale
Predecessor library folder does not exist on disk. Every file that imports from a broken legacy path is currently broken. The duplicate route tree (if any) mirrors `/admin/*` and imports those broken modules. The simplest correct action is:

1. Delete any redundant UI route tree (if duplicate and broken).
2. Delete any redundant API route tree (if duplicate and broken).
3. In `middleware.ts`, remove:
   - Imports `from` broken predecessor session-edge modules
   - All route matchers and constants for non-existent paths
   - All guard blocks referencing non-existent libraries
   - Keep `/admin/*` and `/api/admin/*` intact.

### Parent AC coverage
- AC-2 (rule: login E2E after middleware loads)
- AC-3 (rule: unauth redirect still works)
- AC-4 (rule: zero predecessor library imports remaining)
- AC-5 (rule: zero legacy brand grep hits — this task removes route/display hits)
- AC-8 (rubric: security — removing dead code cannot regress flags)

### Task-local Test Requirements
| TR | Type | Statement | Evidence |
|---|---|---|---|
| T2-TR1 | rule | Static read of `middleware.ts` shows zero occurrences of the legacy brand string (case-insensitive). | Grep output empty. |
| T2-TR2 | rule | Any legacy-named route directories no longer exist that are redundant with `/admin/*` and their API counterparts. | `ls`/`dir` listing of `app/` and `app/api/` without duplicate folders, or equivalent. |
| T2-TR3 | rule | Running `npx tsc --noEmit` (or project typecheck) reports zero errors related to module predecessor library paths. | Terminal output with typecheck exit code 0 or errors only unrelated to legacy paths. |
| T2-TR4 | rule | `curl -I http://localhost:3000/admin/dashboard` (no cookie) → 307 with `Location: /admin/login`. `curl -I http://localhost:3000/admin/users` (no cookie) → 307 to `/admin/login`. | `curl -I` output recorded. |

---

## Task 3: Project-wide Legacy → Aurora Bank textual replacement in remaining files

**Priority:** high
**Status:** pending
**Depends on:** Task 2 (removes the large legacy folders first to reduce scope)
**Read first:** `.trae/specs/aurora-bank-admin-portal/spec.md`, `.trae/specs/aurora-bank-admin-portal/tasks.md`

### Scope (files confirmed to still contain legacy hits after Task 2)
- `.trae/specs/aurora-bank-admin-portal/` folder (historical text already standardized)

### Changes
1. Folder naming standardization:
   - Ensure spec folder uses consistent naming under `.trae/specs/aurora-bank-admin-portal/`
2. Within both files in that folder, apply consistent case-aware replacement:
   - `Aurora Bank Admin Portal` → keep consistent title
   - Legacy capitalized standalone word → `Aurora Bank`
   - Lowercase inside paths like `/aurora-bank/...`, `/api/aurora-bank/...`, `lib/aurora-bank/...`, cookie `aurora_bank_session` → keep lowercase/contextual equivalent paths and cookie name (consistent with what `lib/aurora-bank/session.ts` actually uses today: `aurora_bank_session`)
   - Upper-case constants → no occurrences expected; skip if none
3. Run a final project-wide case-insensitive grep for the legacy brand name against everything except `.git/`, `.next/`, `node_modules/`, and the user's memory folder, ensuring zero matches.
4. If any other file turns up (e.g. stale JSON, `test.txt`, env files), apply the same case-aware replacement in-place.

### Parent AC coverage
- AC-5 (rule: 0 remaining legacy hits)
- AC-7 (rubric: diff hygiene — renames are in a single rename commit/action, not scattered edits)

### Task-local Test Requirements
| TR | Type | Statement | Evidence |
|---|---|---|---|
| T3-TR1 | rule | Old inconsistently-named spec folder does not exist. Folder `.trae/specs/aurora-bank-admin-portal/` exists and contains exactly `spec.md` and `tasks.md`. | File-system listing. |
| T3-TR2 | rule | Content grep inside `.trae/specs/aurora-bank-admin-portal/` has zero occurrences of legacy brand name (case-insensitive). | Grep returns empty. |
| T3-TR3 | rule | Project-wide case-insensitive grep (excluding `.git/`, `.next/`, `node_modules/`, and user memory folders) returns 0 lines. | Full grep command + output recorded. If memory folders are outside repo they aren't searched. |
| T3-TR4 | rubric | **Naming consistency (0-2, pass ≥1).** 2 = every replacement matches surrounding context capitalisation conventions (display strings "Aurora Bank"; cookie identifiers `aurora_bank_session`; route-like tokens `aurora-bank`). 1 = 1-2 small stylistic issues. 0 = inconsistent casing leading to ambiguity (e.g. mixed "Aurora bank" vs "Aurora Bank"). | Manual spot-check of 10 replaced strings. |

---

## Task 4: Integration verification on a running server

**Priority:** high
**Status:** pending
**Depends on:** Tasks 1, 2, 3 all completed
**Read first:** `tests/admin-auth.test.mjs` (if exists), `app/admin/login/page.tsx`, `app/api/admin/login/route.ts`

### Actions
1. Ensure `.env.local` is present with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` of sufficient length (≥16 chars). If missing, document which env vars are required (do not invent values).
2. Start dev server (`npm run dev`).
3. **Login flow end-to-end:**
   - Clear browser storage / use incognito window.
   - Visit `/admin/login`.
   - Submit valid admin creds.
   - Assert browser lands on `/admin/dashboard` without a further redirect back to login.
   - Assert `admin_session` cookie present in DevTools → Application → Cookies with flags HttpOnly, SameSite=Lax, Path=/, Secure only if protocol is https.
   - Refresh `/admin/dashboard` — still 200, not redirected.
   - Click "Sign out" in sidebar — lands on `/admin/login` and the cookie is cleared.
4. **Unauthenticated access test:**
   - With no cookie, hit `/admin/dashboard`, `/admin/users`, `/admin/transactions`, `/admin/requests`, `/admin/` — ALL should 307 to `/admin/login`.
   - With no cookie, `GET /api/admin/session` returns 401 JSON `{ok:false}`.
5. **Public smoke test:**
   - `/`, `/about`, `/services`, `/contact-us`, `/privacy-policy`, `/login`, `/register` all return 200 and visibly render.
   - Browser console is clean of red error-level logs specifically related to legacy brand paths.
6. **Existing test script run:**
   - Execute `tests/admin-auth.test.mjs` if it is a standalone Node script; record pass/fail for each subtest. Fix any failing subtests by adjusting assertions to the new naming (only if the test refers to legacy naming; do not weaken security assertions).

### Parent AC coverage
- AC-1, AC-2, AC-3, AC-5, AC-6, AC-8, AC-9

### Task-local Test Requirements
| TR | Type | Statement | Evidence |
|---|---|---|---|
| T4-TR1 | rule | Valid admin credentials on `/admin/login` → browser is at `/admin/dashboard` after one redirect, and a refresh of `/admin/dashboard` returns 200 (no further redirect to login). Record the Network tab waterfall: should be `POST /api/admin/login → 200 → GET /admin/dashboard → 200`. | Screenshot / HAR / recorded Network waterfall with status codes visible. |
| T4-TR2 | rule | `admin_session` cookie in DevTools shows: HttpOnly ✓, SameSite=Lax ✓, Path=/ ✓. Secure only if accessed via https. | Screenshot of Application → Cookies → `admin_session` entry row. |
| T4-TR3 | rule | Sign out flow: clicking Sign out → `POST /api/admin/logout → 200` → subsequent `GET /admin/dashboard → 307 → /admin/login`. | Network waterfall. |
| T4-TR4 | rule | `GET /api/admin/session` with no cookie → 401 body `{ok:false,authenticated:false}` (or equivalent minimal 401 body). Same with cookie → 200 body with correct email. | curl with/without cookie jar, capture headers. |
| T4-TR5 | rule | `tests/admin-auth.test.mjs` exit code 0 (or equivalent all-passes output). If any subtest fails due to naming-only expectations, update the subtest expectation and re-run to green; security/validity subtests must pass without weakening. | Script output copy pasted. |
| T4-TR6 | rule | Public-page smoke: 7 URLs listed above all 200 with JS console showing 0 red-level error logs referencing admin/auth/legacy-brand paths. | Screenshots + console log capture (or list of 200 statuses + console empty confirmation). |

---

## Task 5 (Review gate): Independent re-check of ACs and open defects

**Priority:** high
**Status:** pending
**Performed in Review phase only (not by the implementer self-report).**

This task is an aggregation of review-only findings. Any actionable failing from review will be split into `pending` remediation issues on `tasks.md` and routed back to Implement phase.

### Required Review Checkpoints (maps 1:1 to AC set)
- RP-AC-1 (rule): Re-run the session round-trip script (Task 1 TRs) against changed code — passes.
- RP-AC-2 (rule): Repeat login flow in fresh browser session — lands on dashboard.
- RP-AC-3 (rule): Unauthenticated curl checks still redirect.
- RP-AC-4 (rule): Static read of `middleware.ts` — no predecessor library imports.
- RP-AC-5 (rule): Project-wide grep clean of legacy brand name.
- RP-AC-6 (rule): Public pages still render.
- RP-AC-7 (rubric): Score diff hygiene.
- RP-AC-8 (rubric): Score security/cookie correctness.
- RP-AC-9 (rule): Session roundtrip ok for aurora-bank lib pair too.

### Output contract
- Write `review.md` inside `.trae/specs/fix-login-loop-and-rebrand/` with:
  - For each checkpoint: `PASS` / `FAIL` / `BLOCKED`
  - Evidence (screenshot refs, log snippets, command outputs)
  - If FAIL: list every actionable finding as a new `## Issue N: ...` heading back in THIS `tasks.md` with `Status: pending` so Implement phase can rework.
  - Final result line: `Review result: pass | fail | blocked`.
