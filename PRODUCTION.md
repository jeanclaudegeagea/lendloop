# Running LendLoop in production

This take-home runs locally with mocked notifications. What I'd change before real users
touch it, roughly in priority order:

## Delivery

- **A real email provider** (Resend, Postmark or SES) in place of the mock node, with
  `eventId` as the provider's idempotency key, so at-least-once webhook delivery never means a
  duplicate email. Add SPF/DKIM/DMARC, bounce handling and an unsubscribe link for reminders.
- **Notification preferences** per user, and quiet hours for reminders.

## Secrets and configuration

- **Secret manager** (Doppler, Vault, AWS Secrets Manager or 1Password) as the single source.
  Use n8n **external secrets** instead of `$env`, so `N8N_BLOCK_ENV_ACCESS_IN_NODE` can go
  back to `true`.
- **Rotation without downtime.** Have the verifiers accept a current and a previous secret
  (`*_SECRET` and `*_SECRET_PREVIOUS`) during a rotation window, then drop the old one.
  Rotate on a schedule and immediately if one leaks.
- **Separate Clerk, Convex and n8n instances** for dev, staging and prod, each with its own
  secrets.

## Abuse and access control

- **Rate limiting:**
  - per user on loan requests and listing creation (e.g. the `@convex-dev/rate-limiter`
    component)
  - per IP on the `/n8n/*` endpoints
  - at the edge (Vercel or Cloudflare)
- **Network restrictions for the integration:** n8n reachable only on a private network or
  behind an IP allowlist, with Convex endpoints accepting only n8n's egress IPs on top of
  HMAC. A nonce cache would also shut the 5-minute replay window completely.
- **Admin hardening:** require MFA for admins (Clerk), and record every admin action
  (removals, Trusted Lender changes, role changes) in an audit log.
- **Bot protection** on sign-up (Clerk), plus content moderation or reporting for listings.

## Observability

- **Error tracking:** Sentry for Next.js and Convex (Convex has a Sentry log stream).
- **Logs and metrics:** stream Convex logs to Datadog or Axiom. Alert on:
  - `automationEvents` failures above a threshold
  - error-workflow events
  - 401 spikes on `/n8n/*`, which could mean an attack or a misconfigured secret
  - the overdue workflow not running in 25 hours (a dead-man's switch, e.g. Healthchecks.io
    pinged at the end of each run)
- An **admin automation dashboard**: failed events with a "retry" action, which re-enqueues
  via the same idempotent outbox.
- **Audit log table** for loan state changes and admin actions (who, what, when), retained
  per policy.

## Data and compliance

- **Backups:** scheduled Convex exports (snapshot export to S3) plus n8n's Postgres backups,
  with a tested restore procedure.
- **Retention:** prune old `automationEvents` (e.g. after 90 days) with a Convex cron. Delete
  or anonymize a user's data on account deletion via a Clerk `user.deleted` webhook (signed
  with Svix).
- **Privacy:** a DPA with every processor, data residency choices, and a privacy page listing
  what each workflow receives (already documented in the README). For Fluence's healthcare
  context, the same discipline extends to PHI: minimum necessary data, BAAs, and access logs.

## n8n hosting

- **Postgres instead of SQLite**, and **queue mode** (`EXECUTIONS_MODE=queue`) with Redis and
  separate worker and webhook processors, so long runs don't block webhooks and workers can
  scale.
- **HTTPS** behind a reverse proxy (Caddy or Traefik) with a stable domain instead of the
  temporary tunnel. Restore `N8N_SECURE_COOKIE=true`, use SSO and MFA for editors, and
  disable public sign-up.
- **Workflows in Git:** promote the exported JSON from staging to prod via CI
  (`n8n import:workflow`) instead of editing in production. Pin image versions, as the
  compose file already does, and upgrade deliberately.
- Managed n8n Cloud is a reasonable alternative if the team doesn't want to run it.

## Scale and correctness

- **Paginate** the list queries (Convex `.paginate()`) instead of the 200-item cap. Add a
  search index for tool names.
- **Batch the overdue run** (cursor-based pages) if it ever returns thousands of loans.
- **Timezones:** store each user's timezone and send reminders in their morning. Currently
  everything is in UTC days.
- **Borrower cancellation** and **lender-proposed alternative dates** are the next product
  features; both fit the existing transition table.

## Delivery pipeline

- **CI on every PR** (GitHub Actions): `npm ci`, `lint`, `typecheck`, `test`, `build`, plus
  `convex deploy --dry-run` and secret scanning (gitleaks).
- **Preview deployments** (Vercel + Convex preview deployments) per PR, and a **staging**
  environment with its own n8n.
- **E2E tests** (Playwright with Clerk testing tokens) for the request → approve → return flow.
- **Deploys:** `npx convex deploy` with the frontend build. Schema changes stay
  backward-compatible (widen, migrate, narrow).
- Dependabot or Renovate for dependency updates.
