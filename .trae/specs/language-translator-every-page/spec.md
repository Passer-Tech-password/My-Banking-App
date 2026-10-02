# Spec: Full-Site Language Translator (Landing → Every Page → Dashboard)

## 1. Problem

Aurora Bank ships with a complete i18n "skeleton" — `lib/i18n/messages.ts` (35+ locales, complete English dictionary, fully-translated dictionaries for en/de/it/pt/ru/zh/ja/ko/ar/fr/es), `createTranslator()`, client/server locale cookie helpers, and a `LanguageSwitcher` component in `Navbar`. However:

- Only the marketing shell (`Navbar`, `Footer`, `HeroSlider`, and `/`, `/about`, `/services`, `/contact-us`, `/privacy-policy`) has been wired to use the translator.
- **19 pages and 10 components** still contain hardcoded English text, so when a visitor selects a language from the landing page switcher, all of:
  - `/login`, `/register`, `/forgot-password`, `/verify-email`, `/blocked`, `/apply-card`, `/track-card`
  - all `/dashboard/*` pages (Home, Transfer, Transactions, Profile, Settings, Cards, Contacts, Requests)
  - the Dashboard shell (Sidebar, Header)
  - all `/admin/*` pages (login, dashboard, users, [uid] detail, transactions, requests, admin header/sidebar)
  - the CreateUserModal, FundUserModal, UserTable
  continue to appear in English — making the translator appear non-functional.

Goal: when a user selects any supported locale from the LanguageSwitcher on the landing page, ALL written content across every route, site section, and dashboard is replaced by the locale-specific message (falling back to English when no translation exists for the chosen locale yet, per existing `createTranslator` semantics).

## 2. Users & Scope

| User | Outcome |
|---|---|
| Public landing visitor | Selects language → every public page text translates (navbar/footer/hero plus marketing content) |
| Logged-in user | Same language selection carries across ALL dashboard pages, actions, cards, forms, modals, settings |
| Admin | Same cookie carries across all admin portal pages, forms, tables, modals, and status labels |

### 2.1 Hard Non-Goals (Strictly Prohibited by User)

- **NO** new features, new pages, new components, new API routes.
- **NO** changes to authentication, session cookies, HMAC, encryption, rate limits.
- **NO** refactors of routes/forms/state beyond adding `useEffect` / `useState` / `t()` lookup calls or JSX text replacements.
- **NO** changes to `package.json`, `next.config.ts`, CSP headers, `middleware.ts` session logic, `firebase.ts`, `firebaseAdmin.ts`, `encryption.ts`, `session.ts`, `session-edge.ts`, transfer logic, user creation logic, transaction logic, audit logs.
- **NO** changes to message IDs that are already in use — all existing keys are contractually frozen; only new keys may be added for previously hardcoded strings.
- **NO** changes to `LanguageSwitcher` UX — it already sets cookie + reloads, which is correct.
- **NO** server-side session reading of the locale cookie beyond what `lib/i18n/server.ts` already does — the cookie is already correctly hydrated by `app/layout.tsx:25` into `<html lang>`.

## 3. Functional Requirements (FR)

### FR-1: Landing-Page Language Switcher is fully operational

- [FR-1a] The existing `LanguageSwitcher` rendered by `Navbar` on all public pages is the single source of truth for locale selection.
- [FR-1b] Selecting a locale must: (i) write the `aurora_locale` cookie via `setLocaleCookie()` (already works), (ii) reload the page (already works), (iii) subsequently render **100% of visible user-facing written strings** on the current and every later page through the `createTranslator(locale)` helper — i.e., NO English hardcoded strings anywhere on visited pages when a non-English locale is selected.

### FR-2: Every public marketing page uses the translator

Applies to pages already under `/`, `/about`, `/services`, `/contact-us`, `/privacy-policy` if any residual hardcoded strings exist. **Applies additionally and fully to:**
- `/app/login` (page, form labels, buttons, errors, banners)
- `/app/register` (page, form labels, buttons, errors, banners)
- `/app/forgot-password` (page, form labels, buttons, errors, banners)
- `/app/verify-email` (page, copy, CTAs)
- `/app/blocked` (page, copy, CTAs)
- `/app/apply-card` (page, forms, copy, CTAs)
- `/app/track-card` (page, forms, copy, CTAs)

### FR-3: All user Dashboard pages + layout translate end-to-end

- Applies to `/app/dashboard/page.tsx` (stats, quick actions, all cards, welcome message, buttons, labels, the full transfer widget section including ALL its current labels/placeholders/buttons/errors)
- Applies to `/app/dashboard/layout.tsx` (DashboardSidebar + DashboardHeader — sidebar menu items, header welcome/language, Logout button, etc.)
- Applies to `/app/dashboard/transfer/page.tsx` (header copy, form labels, recipient lookup panel, confirmation text, all server-derived error code -> human strings that are currently hardcoded, success banners)
- Applies to `/app/dashboard/transactions`, `/app/dashboard/profile`, `/app/dashboard/settings`, `/app/dashboard/cards`, `/app/dashboard/contacts`, `/app/dashboard/requests`

### FR-4: Admin portal pages + layout translate end-to-end

- Applies to `/app/admin/login`, `/app/admin/dashboard`, `/app/admin/users`, `/app/admin/users/[uid]`, `/app/admin/transactions`, `/app/admin/requests`, `/app/admin/layout.tsx` (AdminHeader + AdminSidebar)
- Applies to `components/CreateUserModal.tsx`, `components/FundUserModal.tsx`, `components/UserTable.tsx`, `components/AdminHeader.tsx`

### FR-5: Scope-Invariant: Behavior contract of every page must not change

All translated strings preserve the same UX/copy/meaning in English as before (the English `BASE_MESSAGES` layer is always the canonical reference). Forms, state, hooks, submit payloads, validations, redirects, modals are functionally byte-identical after the change — only how the user-visible rendered text is produced changes (from JSX literal string to `t(key)`).

## 4. Non-Functional Requirements (NFR)

### NFR-1: Locale Resolution (no new behavior)
- Locale resolution stack is frozen in this spec: **cookie `aurora_locale`** → fallback `defaultLocale='en'` → `<html lang>` already hydrates via `app/layout.tsx`. No `Accept-Language` header reading, no URL-based `/[locale]/...` routing, no `next-intl` plugin adoption, no Firestore-user language preference reads beyond existing patterns — all strictly outside scope.

### NFR-2: Dictionary Hygiene
- Every new `MessageKey` added for previously hardcoded strings follows the existing flat-dot convention `scope.entity.item` (e.g. `login.label.email`, `dashboard.quickAction.transfer`, `admin.table.status`).
- English value in `BASE_MESSAGES` matches the current literal in source exactly (punctuation/whitespace inclusive).
- For languages with existing full dictionaries (de, it, pt, ru, zh, ja, ko, ar, fr, es), each new key is added with a native-language translation to avoid the default fallback for these ten languages.
- For remaining 25 locales (`pl`, `uk`, `nl`, …) the default `MESSAGES[locale] = { ...BASE_MESSAGES }` fallback behavior already handles "no translation present" — we keep that and add no explicit keys to keep scope bounded.

### NFR-3: Build & Type Safety
- `npm run build` must pass with `exit code 0`.
- `GetDiagnostics` must report **0 files / 0 diagnostics**.
- No `MessageKey` TS index errors — new keys are always added to `BASE_MESSAGES` first (they are auto-included in the `keyof MESSAGES['en']` union).

### NFR-4: Isolation / No Bugs
- The entire change set must not introduce new console errors, new HTTP 4xx/5xx, new redirects, new CSP violations.
- Client-side hook order for every React component is preserved: any new `useState`/`useEffect` for translator setup is added alongside existing state hooks, never after an early return (project memory Lessons Learned: Hooks Rule Corruption).

## 5. Acceptance Criteria

| ID | Type | Criterion | Evidence |
|---|---|---|---|
| AC-1 | rule | After selecting a non-English locale (e.g., `de`) from the landing-page LanguageSwitcher, a page-visit walkthrough that exercises every route in `app/**/page.tsx` + every child component used by those routes produces **0 untranslated English hardcoded literals** — every visible string is rendered via `t(key)`. | Manual inspection of each page. Automated helper: project-wide `grep` for known literal phrases that should be translated, showing 0 matches in JSX string children and `text: "... "` props of labelled elements. |
| AC-2 | rule | All English-language content remains word-for-word identical when `locale=en` — i.e., every new `BASE_MESSAGES` key's value exactly equals the prior literal used in that file. | Diff of each edited file restricted to "literal X replaced by `t(key)\"; new MessageKey entry with value X"; diff shows no value drift. |
| AC-3 | rule | For languages with a populated dictionary (de, it, pt, ru, zh, ja, ko, ar, fr, es), every NEW message key added for this feature also exists in that language's section of `MESSAGES`. | `grep -c` count of new `en` keys equals count in each of the 10 populated dictionaries. |
| AC-4 | rule | Production build exit 0 and TS diagnostics 0/0 after changes. | Console recording of `npm run build` exit code + `GetDiagnostics` output. |
| AC-5 | rule | Zero behavior regressions: login → dashboard → transfer → submit still functions, admin create-user / fund-user modals submit identical payloads. | Smoke-test scripted browser flow with the locale set to `de`: login succeeds, dashboard renders, transfer form submits; admin console create user and fund user forms still POST to the same endpoints with the same body keys. |
| AC-6 | rubric | **Scope-locked diff hygiene (0-2)**. Threshold: ≥1. Pass: every file edit falls inside FR-2..FR-4 page/component sets, and every change is a "literal → t(key)" or "new key in dictionary" edit; no other logic mutated. 2=100% scoped changes, 1=one incidental drift, 0=broad edits elsewhere. | Git diff review. |
| AC-7 | rubric | **Dictionary quality / coverage for populated locales (0-2)**. Threshold: ≥1. Pass: for de/it/pt/ru/zh/ja/ko/ar/fr/es new message keys include correct translation, not English copy-paste. 2=all 10 languages have correct non-English translations; 1=≤ 1 language uses English for some new keys; 0=many missing or garbled. | Manual spot-check for 10 representative dashboard/admin keys across the 10. |

## 6. Constraints / Assumptions

- Frozen boundary: **`lib/i18n/messages.ts`** is the only dictionary file modified to add new keys; all other i18n files (`client.ts`, `server.ts`) are treated as immutable.
- All 35 locales defined in `locales` remain in the switcher. No new locales added, no locales removed.
- User account preferences (`languagePref`) already exist per project memory. No integration with that field in this spec; we keep cookie-only resolution per NFR-1. Integrating user-profile language preference is explicitly out of scope (to isolate the feature per the user's strict "no unrelated changes" mandate).
- Admin login page banner for admin email is preserved as-is.
