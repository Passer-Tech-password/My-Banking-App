# Implementation Tasks — Full-Site Language Translator

## Overview

Each task below targets one file (in scope) and modifies it ONLY to:
1. Import `createTranslator`, `getLocaleFromDocument`, `Locale` from `@/lib/i18n/messages` and `@/lib/i18n/client` where needed.
2. Add `resolvedLocale` state + a `t = useMemo(() => createTranslator(resolvedLocale), [resolvedLocale])` memo (or inline pattern matching the existing Navbar/Footer convention).
3. Replace every user-visible hardcoded English string with `t("scope.x.y")`.
4. Add corresponding new message keys to `lib/i18n/messages.ts` — first under `BASE_MESSAGES` (exact English literal), then for the 10 fully-populated languages (fr, es, de, it, pt, ru, zh, ja, ko, ar) with a correct native translation.

No task modifies any behavior, form payload, state, hook order, validation, redirect, or route.

---

## Task 1: Expand BASE_MESSAGES + 10 populated-language dictionaries with ALL new keys

**Status: pending**

### Scope (only this file): `lib/i18n/messages.ts`

### Actions:
1. Add new message key groups covering every remaining literal across: login, register, forgot-password, verify-email, blocked, apply-card, track-card, dashboard (home, transfer, transactions, profile, settings, cards, contacts, requests), DashboardSidebar, DashboardHeader, admin (login, dashboard, users, users/[uid] detail, transactions, requests), AdminHeader, AdminSidebar, CreateUserModal, FundUserModal, UserTable, and the transfer page recipient-name confirmation panel added in prior work.
2. Each new key's en value = exact existing literal in source.
3. For each of fr/es/de/it/pt/ru/zh/ja/ko/ar sections, add the same set of new keys with correct native translation.
4. Keep 25 remaining locale fallback behavior (BASE_MESSAGES spread) unchanged.

### Test Requirements (TR):
- **TR-T1-rule**: Every new key used in tasks 2..12 exists in `BASE_MESSAGES` and all 10 populated dictionaries.
- **TR-T2-rule**: Each English value in BASE_MESSAGES exactly matches the pre-existing literal.

### Completion Evidence:
- File write of new sections in messages.ts, grep count equality of new keys across the 10 dictionaries.

---

## Task 2: Wire public auth pages: login, register, forgot-password, verify-email, blocked, apply-card, track-card

**Status: pending**

### Scope (files only):
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/forgot-password/page.tsx`
- `app/verify-email/page.tsx`
- `app/blocked/page.tsx`
- `app/apply-card/page.tsx`
- `app/track-card/page.tsx`

### Actions per file (surgical):
1. Add `useEffect` + `useState<Locale>` to read locale via `getLocaleFromDocument()` on mount (matches Navbar convention).
2. `t = useMemo(() => createTranslator(resolvedLocale), [resolvedLocale])`.
3. Replace every user-visible literal with `t()`.

### TR:
- **TR-T3-rule**: Login page renders 0 untranslated literals when locale=de is chosen and page is navigated to.
- **TR-T4-rule**: All seven pages build cleanly, 0 TS diagnostics.

### Completion Evidence:
Edited files, build step passes, spot screenshot of login with de locale shows German text.

---

## Task 3: Wire User Dashboard home page + layout (Sidebar + Header)

**Status: pending**

### Scope:
- `app/dashboard/page.tsx`
- `app/dashboard/layout.tsx`
- `components/DashboardHeader.tsx`
- `components/DashboardSidebar.tsx`

### Actions:
1. DashboardSidebar: translate every menu link label.
2. DashboardHeader: translate welcome, language switcher area, Logout button.
3. Dashboard layout shell: breadcrumbs, labels, any headings.
4. Dashboard home: Quick action tiles, welcome greeting, stats, all card titles/descriptions, all CTAs (including "New Transfer" + "Transfer" quick-action — keep current behavior per previous task).

### TR:
- **TR-T5-rule**: Dashboard home shows 0 English literals with locale=de; menu items in sidebar all translated.

### Completion Evidence:
Edited files, screenshot.

---

## Task 4: Wire User Dashboard sub-pages (transfer, transactions, profile, settings, cards, contacts, requests)

**Status: pending**

### Scope:
- `app/dashboard/transfer/page.tsx`
- `app/dashboard/transactions/page.tsx`
- `app/dashboard/profile/page.tsx`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/cards/page.tsx`
- `app/dashboard/contacts/page.tsx`
- `app/dashboard/requests/page.tsx`

### Actions per page:
Same Task-2-style wire-up. For the transfer page, translate:
- Header copy, all form labels/placeholders
- Recipient verification panel text ("Verifying account…", confirmation checkbox label, "No account matches this account number." etc.)
- Status banner copy/errors mapped to translated keys.

### TR:
- **TR-T6-rule**: Transfer page recipient confirmation checkbox label renders in the chosen locale; 0 English.

### Completion Evidence:
Each file edited, build passes.

---

## Task 5: Wire Admin portal pages + admin shell

**Status: pending**

### Scope:
- `app/admin/layout.tsx`
- `app/admin/login/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/users/[uid]/page.tsx`
- `app/admin/transactions/page.tsx`
- `app/admin/requests/page.tsx`
- `components/AdminHeader.tsx`
- `components/AdminSidebar.tsx`
- `components/UserTable.tsx`
- `components/CreateUserModal.tsx`
- `components/FundUserModal.tsx`

### Actions per file:
Same Task-2-style wire-up. Special care for UserTable status badges ("Active", "Suspended", "Closed"), reason modal copy, and CreateUserModal credential display ("password hidden · use Edit to set") plus the newly-added passwordPlain visibility banner.

### TR:
- **TR-T7-rule**: Admin user table status + CreateUserModal labels all translate for locale=zh.

### Completion Evidence:
All 12 files edited, build passes, admin login + dashboard spot-checked.

---

## Task 6: Build, deploy, independent review

**Status: pending**

### Actions:
1. Run `GetDiagnostics`, `npm run build`.
2. Commit + push → Vercel deploy.
3. Independent smoke-test: locale=de, route-walk every page, record 0 English literals + no console errors.
4. Write `review.md`.

### TR:
- **TR-T8-rule**: Production build exit 0. TS 0/0 diagnostics.
- **TR-T9-rule**: Route walk with locale=de, spot sample strings across every page from all buckets above; all strings non-English (German where dictionary is populated; note: 25 remaining locales fall back to English per NFR-2, so only the 10 populated languages serve as the test probe).

### Completion Evidence:
Build log, Vercel deploy SHA, review.md with route-walk checklist.
