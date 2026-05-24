# PaidUp — Full Audit Findings

**Audit date:** 2026-05-24  
**Auditor:** Claude Sonnet 4.6 (autonomous audit)  
**Branch:** master  
**Live URL:** https://tradie-invoice-tracker.vercel.app  

---

## Executive Summary

1. **Stripe is completely non-functional** — checkout returns 503, webhook does nothing. No user can upgrade to Pro. Revenue is completely blocked until wired up.
2. **RESEND_FROM_EMAIL is not set** — all reminder emails fall back to `onboarding@resend.dev`, which can only deliver to the account owner. Real clients will never receive reminders. Requires a verified Resend domain.
3. **All critical code bugs were fixed in this audit** — race condition in invoice numbering, missing input validation, N+1 in send-reminders, paid-invoice editing guard, HTML injection in emails.
4. **Platform configuration was fixed** — all Supabase env vars added to Vercel Preview environment (they were missing), devDependency versions pinned.
5. **The codebase is architecturally sound** — RLS is correctly applied on all tables, auth is enforced on every server action and API route, no secrets in git history.

---

## Critical Issues Fixed

### 1. Race condition in invoice number generation (FIXED)
**File:** `src/app/actions/invoices.ts`, `supabase/migrations/20260524110639_atomic-invoice-number.sql`

The original code read `next_invoice_number` from the profile, used it, then updated it in two separate operations. Two concurrent `createInvoice` requests would both read the same number, producing duplicate invoice numbers (caught by the DB unique constraint, but as an opaque error).

**Fix:** Created a `claim_invoice_number(user_id uuid)` Postgres function that uses a single `UPDATE ... RETURNING next_invoice_number - 1` statement. This serializes concurrent requests on the row lock, making it truly atomic.

### 2. No server-side validation of line_items (FIXED)
**File:** `src/app/actions/invoices.ts`

`JSON.parse()` was called directly on user-supplied JSON with no validation. A malicious actor could submit `NaN`, `Infinity`, or negative values for quantities/prices, which would propagate into the database and be shown as corrupted invoice totals.

**Fix:** `parseLineItems()` validates that all entries are finite, non-negative numbers; clamps to reasonable precision; truncates description length.

### 3. No server-side tax_rate clamping (FIXED)
**File:** `src/app/actions/invoices.ts`, `src/app/actions/profile.ts`

`parseFloat(tax_rate) / 100` was used without bounds checking. A user could set tax_rate to 1000% by crafting a direct POST.

**Fix:** `clampTaxRate()` constrains to `[0, 1]` and rejects non-finite values.

### 4. No server-side validation of reminder_schedule (FIXED)
**File:** `src/app/actions/profile.ts`

`JSON.parse()` was called directly. An arbitrary JSON value (object, null, string) would be stored in the `reminder_schedule` JSONB column and silently fail or break the send-reminders cron.

**Fix:** `parseReminderSchedule()` validates an array of positive integers (1–365), max 10 entries, deduplicates, and falls back to `[1,7,14,21]` on any invalid input.

### 5. updateInvoiceStatus accepted any status string (FIXED)
**File:** `src/app/actions/invoices.ts`

The status string was passed directly to the DB without an allowlist check. The DB constraint catches invalid values, but the error message leaked DB internals.

**Fix:** Added `VALID_STATUSES` allowlist check before any DB access.

### 6. N+1 query in send-reminders cron (FIXED)
**File:** `src/app/api/cron/send-reminders/route.ts`

For each of N overdue invoices, a separate query to `reminders_log` checked whether a reminder was sent today. With 50 overdue invoices, this made 50 sequential DB round-trips.

**Fix:** Batch-fetched all today's reminder log entries for all invoice IDs in a single query before the loop, using a `Set` for O(1) lookup.

### 7. Per-invoice cron failures would abort the run (FIXED)
**File:** `src/app/api/cron/send-reminders/route.ts`

An unhandled exception in any invoice's processing (e.g., Resend SDK throws on network timeout) would crash the entire cron, leaving remaining invoices unprocessed.

**Fix:** Wrapped per-invoice processing in try/catch; logs the error and continues to the next invoice.

### 8. HTML injection in reminder emails (FIXED)
**File:** `src/app/api/cron/send-reminders/route.ts`

Template variables like `{client_first_name}` were interpolated directly into the HTML email body. A client named `<script>alert(1)</script>` would inject that HTML into emails sent by the cron.

**Fix:** Added `escapeHtml()` + `interpolateHtml()` to HTML-escape all variable values before substitution. Plain text logs still use the unescaped version.

### 9. Notifications PATCH had no input validation (FIXED)
**File:** `src/app/api/notifications/route.ts`

The `ids` field from the request body was used directly with `.in('id', ids)` with no type check or size limit.

**Fix:** Validates `ids` is an array; caps at 50 entries.

### 10. updateInvoice had no paid-invoice guard at server level (FIXED)
**File:** `src/app/actions/invoices.ts`

The edit page redirects paid invoices away, but the server action itself accepted edits to paid invoices. A crafted POST could modify a paid invoice.

**Fix:** Reads the current invoice status before updating; returns an error if status is `paid`.

### 11. Vercel Preview environment had no env vars (FIXED)
**Platform:** Vercel

All 5 env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`) were only in Production and Development. Preview deployments would fail completely.

**Fix:** Added all 5 vars to the Preview environment via the Vercel REST API.

### 12. DevDependency versions had `^` prefix (FIXED)
**File:** `package.json`

`^` versions in devDependencies allow minor/patch updates on fresh installs, which can break builds non-deterministically. Pinned all 8 devDependencies to exact versions.

### 13. invoice_number_prefix not sanitised (FIXED)
**File:** `src/app/actions/profile.ts`

Any characters could be stored in `invoice_number_prefix`, potentially breaking the `INV-001` format.

**Fix:** Strips non-alphanumeric/hyphen characters; enforces max 10 chars.

### 14. country/currency not validated against allowlist (FIXED)
**File:** `src/app/actions/profile.ts`

The DB `CHECK` constraint would catch invalid values, but the error would surface as a generic DB error. Added explicit allowlist validation.

---

## Schema Changes Applied

- `20260524110639_atomic-invoice-number.sql` — adds `claim_invoice_number(p_user_id uuid) returns integer` function; pushed to production via `supabase db push`

---

## Platform Config Changes Applied

- Added 5 env vars to Vercel Preview environment
- Confirmed `vercel.json` cron schedules were already in place:
  - `mark-overdue`: 20:00 UTC daily (8:00 NZT)
  - `send-reminders`: 20:05 UTC daily (8:05 NZT — runs 5 min after mark-overdue)

---

## Dashboard-Only Items (Action Required)

### A. Set RESEND_FROM_EMAIL [HIGH PRIORITY]
**Service:** Resend  
**Impact:** Without this, all reminder emails come from `onboarding@resend.dev`, which only delivers to your own Resend account email. Real clients receive nothing.

Steps:
1. Log in to resend.com → Domains → Add your domain (e.g., `paidup.app` or whatever you own)
2. Add the required DNS records (SPF, DKIM, DMARC) to your domain registrar
3. Wait for verification (usually < 15 minutes)
4. Run: `vercel env add RESEND_FROM_EMAIL production` → enter `noreply@yourdomain.com`
5. Run: `vercel env add RESEND_FROM_EMAIL development` → same value
6. Run: `vercel env add RESEND_FROM_EMAIL preview` → same value

### B. Implement Stripe [HIGH PRIORITY]
**File:** `src/app/api/stripe/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`  
**Impact:** Pro upgrades are completely non-functional. The checkout route returns 503.

The code stubs are already in place with clear comments on what to implement:
1. Create a Stripe product and price at $19/month, note the `price_id`
2. Add env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
3. Implement the checkout route to create a Stripe Checkout Session
4. Implement the webhook handler to set `subscription_tier = 'pro'` on `checkout.session.completed`, and `subscription_tier = 'free'` on `customer.subscription.deleted`
5. Create a Stripe webhook endpoint in the Stripe dashboard pointing to `https://tradie-invoice-tracker.vercel.app/api/webhooks/stripe`
6. Subscribe to events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

### C. Set Supabase Storage MIME type restriction [LOW]
**Service:** Supabase Storage Dashboard  
**Impact:** Users can upload any file type to the `business-logos` bucket (only extension/size are checked client-side).

Steps:
1. Supabase Dashboard → Storage → business-logos → Bucket Settings
2. Set Allowed MIME Types: `image/png, image/jpeg, image/webp`

### D. Configure Supabase Auth email templates [LOW]
**Service:** Supabase Dashboard → Authentication → Email Templates  
**Impact:** Default Supabase confirmation/magic link emails have generic branding.

Update the confirmation email template to reference "PaidUp" and have the correct redirect URL.

---

## Catastrophic Findings

None. No active data corruption, no secrets leaked in git history, no service role key exposed to client.

---

## Ranked QOL Recommendations

| # | Description | Impact | Effort | Risk |
|---|-------------|--------|--------|------|
| 1 | **Wire Stripe** — Pro plan completely non-functional | High | Multi-day | Moderate |
| 2 | **Set RESEND_FROM_EMAIL** — reminder emails non-functional | High | Hours | Safe |
| 3 | **Add password reset** — no "forgot password" link on login page | High | Hours | Safe |
| 4 | **Send invoice email** — pricing page promises "email invoice to client" but there's no send button | High | Half-day | Safe |
| 5 | **Server-side dashboard data** — DashboardClient makes 6 parallel client-side queries causing loading skeleton flash; move to server component | Medium | Half-day | Safe |
| 6 | **Invoice list pagination** — loads all invoices for the user in one query; will slow as data grows | Medium | Half-day | Safe |
| 7 | **Forgot password flow** — critical for any production app | Medium | Hours | Safe |
| 8 | **Locale-aware date formatting** — `formatDate` hardcodes `'en-NZ'` locale regardless of user's country | Medium | Hours | Safe |
| 9 | **Invoice status transition rules** — currently any status→any status is allowed at the server level; should enforce: draft→sent/paid, sent→paid/overdue, overdue→paid | Medium | Hours | Safe |
| 10 | **OG tags** — missing Open Graph meta tags on landing page and key app pages | Low | Hours | Safe |
| 11 | **Error monitoring (Sentry)** — no error tracking; production errors are invisible unless you check Vercel logs | Medium | Hours | Safe |
| 12 | **Currency mismatch on dashboard** — stat card totals are in the profile's default currency but individual invoices may have different currencies; totals are mixed without conversion | Medium | Half-day | Moderate |
| 13 | **Auto-focus in client modal** — add client modal doesn't focus the Name input on open | Low | Hours | Safe |
| 14 | **Browser-native confirm dialogs** — delete confirmations use `window.confirm()`; replace with a modal for better UX and consistency | Low | Hours | Safe |
| 15 | **No "email sent" feedback** — after using "Mark as sent" there's no way to email the invoice to the client from within the app | Medium | Half-day | Safe |

---

## Tech Debt Log

- `EditInvoiceForm.tsx:10` — `invoice: any` type; should be typed from the Supabase generated types
- `send-reminders/route.ts` — `inv.profiles as any`, `inv.clients as any`; Supabase's nested relation types aren't threaded through properly. Consider using explicit type assertions from `types.ts`.
- `DashboardClient.tsx` — entire dashboard is client-side; the architecture should be server-side with a smaller client component just for interactivity
- `proxy.ts` uses `getSession()` which reads JWT from cookie without server-side validation; acceptable for middleware redirects (documented Supabase pattern) but document the reason
- `package.json` — `lucide-react` at `1.16.0`; this is an unusually high version number; verify this is the correct package
- No test coverage anywhere — critical paths (invoice creation, status transitions, cron auth) have zero automated tests

---

## Open Questions

1. **Custom domain?** The app is at `tradie-invoice-tracker.vercel.app` — do you have a custom domain (e.g., `paidup.app`)? If so, set it up in Vercel and update Supabase Auth's `site_url` and `additional_redirect_urls`.
2. **Pro trial logic?** The `profiles` table has `trial_ends_at` and `subscription_status` columns but no code reads `trial_ends_at` to grant Pro access during trial. Is the "14-day free trial" on the landing page currently functional?
3. **Multi-currency totals** on the dashboard are summed as if they're all the same currency. Intentional simplification or a bug?
4. **The Hobby Vercel plan** supports max 2 cron jobs (currently using 2, at the limit). If you add another cron job later, you'll need to upgrade to Pro Vercel.
