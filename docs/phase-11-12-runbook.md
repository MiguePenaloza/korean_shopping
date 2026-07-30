# Phase 11 and 12 runbook

## Execution boundary

Phase 11 deploys the reviewed application and production infrastructure. Phase 12 is
a separate launch gate using real phones, real provider flows, and controlled test
orders. Phase 12 must not start until Phase 11 is completed and explicitly approved.

## Ownership and responsibilities

| Item                 | Business owner action                                                                                  | Codex action after access exists                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| GitHub               | Keep ownership of `MiguePenaloza/korean_shopping` and approve provider connections                     | Prepare, validate, commit, and push the reviewed release                                                |
| Supabase             | Create the organization/project, choose billing, keep the database password and recovery access        | Link the CLI, dry-run and apply migrations, verify RLS, Storage, Cron, Auth, and production smoke tests |
| Cloudflare           | Create the account, connect GitHub, choose the Pages project name/domain, keep account recovery access | Provide exact build settings and validate the resulting deployment and headers                          |
| Google Cloud         | Create the OAuth project and consent-screen identity, keep the client secret                           | Provide exact origins/callbacks and verify the complete OAuth round trip                                |
| SMTP provider/domain | Own the domain, DNS, sender identity, billing, and SMTP/API credential                                 | Provide exact Supabase fields and verify confirmation and recovery delivery                             |
| Administrator        | Choose the permanent administrator email and retain its recovery methods                               | Promote that confirmed profile through the trusted database function and verify `/admin`                |

Provider accounts, billing profiles, domains, and recovery methods must belong to the
business owner. They must never be created under a developer or automation account.

## Information that may be shared

These values are public and may be copied into the deployment configuration:

- Production site URL.
- Supabase project URL.
- Supabase publishable key.
- Supabase project reference.
- Turnstile site key.
- Intended administrator email.

Do not paste any of these into chat, source control, or `NEXT_PUBLIC_*` variables:

- Supabase database password, secret key, or service-role key.
- Supabase personal access token.
- Turnstile secret key.
- Google OAuth client secret.
- SMTP password or API key.
- GitHub or Cloudflare access token.

Provider secrets should be entered directly into the provider dashboard. CLI login
should happen interactively on the business owner's computer.

## Recommended production profile

- Supabase region: South America (São Paulo), because the customers and business
  rules are Bolivia-centered.
- Cloudflare Pages: Git integration with the existing GitHub repository and `main`
  as the production branch.
- Turnstile: a production widget restricted to the final `pages.dev` hostname and
  custom domain, if one is used.
- Google OAuth: Web application with only `openid`, email, and profile scopes.
- SMTP: use a free Brevo pilot sender verified through
  `micky.ale7@gmail.com` while no owned domain exists. Brevo may replace the
  visible free-address sender with a compliant Brevo address. A verified
  business-owned domain remains the recommended upgrade for deliverability.
- Hosting initially uses the free `pages.dev` address. A custom website domain is
  optional for Pages; an owned sending domain is still the recommended future
  email-deliverability upgrade.
- Supabase Free can be used for a controlled pilot, but it pauses after inactivity
  and has no automatic backups. Because this application handles real orders and
  payment evidence, Pro or an explicit daily export procedure is recommended for
  the active campaign.

## Selected production values

```text
Supabase project: Belle Perle Production
Supabase reference: byxwkwzvtxogjljrmwvd
Cloudflare Pages project: belle-perle-korean-shopping
Production URL: https://belle-perle-korean-shopping.pages.dev
Administrator email: micky.ale7@gmail.com
Custom website domain: none
```

The initial Pages deployment uses a direct, versioned Wrangler upload from the
validated `out/` artifact. The existing GitHub `main` branch remains the source of
truth and must contain the exact commit used for the upload. Git integration can be
enabled later without changing the public hostname.

## Phase 11 sequence

### 1. Freeze the release candidate

1. Finish all Phase 11 source changes.
2. Run formatting, lint, strict TypeScript, frontend tests, database structural
   checks, clean local migrations, pgTAP, database lint, dependency audit, static
   quality checks, and production build.
3. Commit the exact validated source and push it to `main`.
4. Do not deploy from a dirty or different source state.

### 2. Create the production Supabase project

Business owner:

1. Create or sign in to Supabase.
2. Create `Belle Perle Production`.
3. Choose South America (São Paulo).
4. Generate a strong database password and store it in a password manager.
5. Record the project reference, project URL, and publishable key.

On the business owner's computer:

```text
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

The production push must not include `--include-seed`. Development seed data contains
simulated products and exchange rates. The migration chain includes only the four
baseline categories required by the real administrator UI.

After the push, verify:

- All migrations are present in the remote history.
- RLS is enabled on all 14 public tables.
- `product-images` is public and `payment-evidence` is private.
- The expiration Cron job exists.
- Security and performance advisors contain no unexplained critical finding.

### 3. Create the Cloudflare Pages project

Business owner:

1. Create or sign in to Cloudflare.
2. Open Workers & Pages and create a Pages project through Git integration.
3. Connect the GitHub repository `MiguePenaloza/korean_shopping`.
4. Select `main` as the production branch.
5. Choose and record the permanent Pages project name.

Build settings:

```text
Framework preset: Next.js (Static HTML Export)
Build command: npm run build:production
Build output directory: out
Root directory: /
Node version: 24 (also pinned by .nvmrc)
```

Production build variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SITE_URL=https://<pages-project>.pages.dev
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site-key>
```

Only these public values belong in Cloudflare's build environment. A change to any
`NEXT_PUBLIC_*` value requires a new build because Next.js embeds it in the static
JavaScript.

### 4. Configure Turnstile and Supabase CAPTCHA

1. Create a managed Turnstile widget for the final production hostname.
2. Add both the `pages.dev` hostname and the custom hostname if applicable.
3. Put the site key in the Cloudflare Pages build variable.
4. Put the secret key only in Supabase:
   Authentication → Bot and Abuse Protection → CAPTCHA → Cloudflare Turnstile.
5. Redeploy after the public site key is set.

The application sends the Turnstile token for anonymous checkout, email/password
sign-in, registration, and password recovery. Google OAuth does not use the
email/password CAPTCHA field.

### 5. Configure Auth URLs

In Supabase Auth URL configuration:

```text
Site URL: https://<pages-project>.pages.dev
Redirect URL: https://<pages-project>.pages.dev/auth/callback
```

If a custom domain is added, make it the Site URL and add its callback. Keep the
`pages.dev` callback only while it is an intended public entry point. Do not use a
broad production wildcard.

### 6. Configure Google OAuth

Business owner creates a Google Auth Platform project with the Belle Perle name and
support contact.

Google Web OAuth client:

```text
Authorized JavaScript origin:
https://<production-site>

Authorized redirect URI:
https://<project-ref>.supabase.co/auth/v1/callback
```

Copy the Google Client ID and Client Secret directly into the Supabase Google
provider settings. Do not add Google secrets to Cloudflare or the repository.

Verify one new Google account and one returning Google account. The consent screen
must identify Belle Perle and request only basic identity scopes.

### 7. Configure production email

Selected no-domain Brevo pilot path:

1. Create a free Brevo account owned by the business owner.
2. Add `micky.ale7@gmail.com` as an individual sender and enter the verification
   code received at that address.
3. Create an SMTP credential for transactional sending.
4. Configure Supabase custom SMTP with sender name
   `Belle Perle, Korean Shopping`.
5. Store the SMTP password only in Supabase.
6. Set conservative Auth email rate limits.
7. Record that Brevo can replace a free Gmail sender with its own compliant sender
   domain. Do not describe this as equivalent to an authenticated business domain.

Test delivery to at least Gmail and one other provider:

- Account confirmation.
- Password recovery.
- Reused/expired-link message.
- Reply and support address visibility.

The built-in Supabase email service is not accepted for launch because it is
restricted to authorized team addresses and is heavily rate-limited.

### 8. Create the first administrator and initial business data

1. Register the intended administrator through the production site.
2. Confirm the email and sign in once.
3. In the trusted Supabase SQL editor run:

```sql
select public.promote_admin_by_email(
  'micky.ale7@gmail.com',
  'Initial Belle Perle production administrator'
);
```

4. Sign out and back in.
5. Confirm `/admin` opens and a normal customer receives an access-denied state.
6. In Admin → Price configuration, enter the first reviewed BCB/KRW inputs.
7. Verify the fixed 3% contingency and next 08:15 Bolivia expiration.
8. Keep ordering closed until Phase 12 launch approval.

### 9. Production verification

- Run production-safe Auth, catalogue, checkout, administrator, tracking, and
  hardening smoke tests without deleting real records.
- Verify direct URLs, security headers, CSP, Storage privacy, Cron execution, and
  production logs.
- Confirm no service-role key or provider secret exists in static JavaScript.
- Create a rollback point by retaining the previous Pages deployment and a database
  export or paid backup according to the selected Supabase plan.

## Phase 11 completion gate

Phase 11 is complete only when:

- The exact validated commit is deployed.
- The production Supabase migration history matches the repository.
- OAuth, SMTP, Turnstile, redirects, Storage, Cron, and administrator access work.
- A reviewed initial exchange rate exists.
- Ordering remains closed.
- The production URL and rollback procedure are documented.

## Phase 12 sequence

Phase 12 is a human launch rehearsal and go/no-go gate, not another silent feature
phase.

### Devices and networks

- Administrator Android phone in Korea if possible.
- At least one customer Android phone in Bolivia.
- One iPhone/Safari check if available.
- Wi-Fi and throttled/real mobile data.
- Keyboard-only desktop and one screen-reader pass.

### Controlled end-to-end rehearsal

1. Keep ordering closed and create test-only product stock.
2. Create a product from the administrator phone with three real photographs.
3. Enter and confirm the real exchange inputs; inspect KRW → BOB and margin.
4. Open ordering for the controlled test window.
5. Complete one guest order using only name and Bolivian phone.
6. Complete one account order with Google.
7. Complete one email/password order and verify account history.
8. Open `Solicitar QR por WhatsApp` and review the exact order number and total.
9. Make a controlled payment and use `Avisar pago realizado`.
10. Confirm payment as administrator and attach a private screenshot.
11. Verify customer tracking and advance the paid order through every fulfillment
    state.
12. Test reservation expiration at minutes 15 and 25.
13. Test an expired product and the next reviewed price update.
14. Test late-payment rejection, refund pending, refunded, and one justified
    exceptional acceptance.
15. Confirm two buyers cannot purchase the last unit.
16. Confirm a customer cannot access `/admin`, exact stock, or payment evidence.
17. Close ordering and verify history remains readable.

### Launch approval

Record for every check:

- Device/browser and network.
- Tester.
- Expected and actual result.
- Screenshot or order number when safe.
- Pass/fail.
- Severity and owner for any issue.

Launch only if there are no open critical or high-severity issues, the legal text
has been reviewed, a rollback path exists, the administrator can operate from a
phone, and ordering starts closed until the announced campaign window.

If a defect changes source or database behavior, stop Phase 12, fix it under a
reviewed maintenance change, rerun Phase 11 validation/deployment, and restart the
affected launch checks.
