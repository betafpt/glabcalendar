# G.Lab Calendar — Go-Live Deployment Checklist

This document outlines the external owner, provider, domain, and deployment procedures required to deploy G.Lab Calendar to Staging and Production once release gate verification passes. This checklist is strictly limited to external operations that require owner credentials, cloud infrastructure, domain management, or third-party provider access.

---

## 1. Production PostgreSQL Database Provisioning

- [ ] **Provision PostgreSQL Database**:
  - Deploy a managed PostgreSQL 15+ database (e.g., Neon, Supabase, AWS RDS, or Render).
  - Enable SSL connection requirement (`sslmode=require`).
  - Configure automated daily backups and point-in-time recovery.
- [ ] **Obtain Connection String**:
  - Format: `postgresql://<user>:<password>@<host>:5432/<dbname>?sslmode=require`.
  - Securely store as `DATABASE_URL`.
- [ ] **Apply Migrations**:
  - Run `npm run db:migrate` against the target database to execute migrations `0000` through `0007` sequentially.
  - Verify that all core tables (`organizations`, `projects`, `shoots`, `crew_members`, `equipment_items`, `shoot_crew_assignments`, `equipment_bookings`, `shoot_checklist_items`, `users`, `accounts`, `sessions`, `verification_tokens`, `google_calendar_connections`, `shoot_calendar_sync`) exist.

---

## 2. Google Cloud Console & OAuth Configuration

- [ ] **Google Cloud Project**:
  - Navigate to [Google Cloud Console](https://console.cloud.google.com/).
  - Create or select the production project: `glab-calendar-production`.
- [ ] **Enable Google APIs**:
  - Enable **Google Calendar API** in API Library.
- [ ] **OAuth Consent Screen**:
  - User Type: **External**.
  - App Name: `G.Lab Calendar`.
  - User Support Email: (Owner / Admin email).
  - Developer Contact Information: (Engineering contact email).
  - Authorized Domains: Add `glab.vn` (and staging/production domains).
  - Scopes:
    - `openid`
    - `https://www.googleapis.com/auth/userinfo.email`
    - `https://www.googleapis.com/auth/userinfo.profile`
    - `https://www.googleapis.com/auth/calendar.events` (for G.Lab shoot synchronization)
- [ ] **Create OAuth 2.0 Web Client Credentials**:
  - Authorized JavaScript Origins:
    - `https://calendar.glab.vn` (Production)
    - `https://staging-calendar.glab.vn` (Staging)
  - Authorized Redirect URIs:
    - Auth.js Login Callback:
      - `https://calendar.glab.vn/api/auth/callback/google`
      - `https://staging-calendar.glab.vn/api/auth/callback/google`
    - Google Calendar Sync Integration Callback:
      - `https://calendar.glab.vn/api/integrations/google-calendar/callback`
      - `https://staging-calendar.glab.vn/api/integrations/google-calendar/callback`
- [ ] **Collect Client Credentials**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

---

## 3. Environment Variables & Production Secrets

Set the following environment variables on your hosting platform (Vercel, AWS ECS, Railway, or Docker):

| Variable Name | Environment | Description / Recommended Value |
|---|---|---|
| `NODE_ENV` | Staging / Prod | `production` |
| `DATABASE_URL` | Staging / Prod | `postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require` |
| `APP_TIMEZONE` | Staging / Prod | `Asia/Ho_Chi_Minh` |
| `AUTH_SECRET` | Staging / Prod | Secure 32+ character random secret (`openssl rand -base64 33`) |
| `AUTH_URL` | Staging / Prod | `https://calendar.glab.vn` (or `https://staging-calendar.glab.vn`) |
| `GOOGLE_CLIENT_ID` | Staging / Prod | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Staging / Prod | `GOCSPX-xxxx` |

> [!IMPORTANT]
> `AUTH_SECRET` must not start with `glab-development-` and must be at least 32 characters long. `AUTH_URL` must use `https://`.

---

## 4. Custom Domain & DNS Setup

- [ ] **DNS Records**:
  - Create CNAME or A records pointing `calendar.glab.vn` to the production edge/load balancer.
  - Create CNAME or A records pointing `staging-calendar.glab.vn` to the staging deployment.
- [ ] **TLS/SSL Certificates**:
  - Verify automated SSL certificate issuance (Let's Encrypt / Cloudflare / Vercel SSL).
  - Enforce automatic HTTP to HTTPS redirection.

---

## 5. Staging Verification & Smoke Test

- [ ] Deploy release tag to staging environment.
- [ ] Run migration check: `npm run db:migrate`.
- [ ] Perform live smoke test with real accounts:
  1. Access `https://staging-calendar.glab.vn/login`.
  2. Sign in using Google OAuth.
  3. Verify landing on Today Dashboard (`/`).
  4. Create a test Project and Shoot.
  5. Assign crew and gear; verify conflict detection prevents overlapping bookings.
  6. Connect Google Calendar in `/integrations/google-calendar` and test bidirectional synchronization.
  7. Verify token revocation/disconnect path handles gracefully.

---

## 6. Production Cutover & Post-Deploy Validation

- [ ] Trigger deployment pipeline to Production.
- [ ] Verify production database connectivity and fresh schema initialization.
- [ ] Run production health check:
  - Visit `https://calendar.glab.vn`.
  - Sign in with workspace administrator account.
  - Confirm Today, Calendar, Shoots, Projects, Crew, Gear, and Google Calendar Sync screens render cleanly with zero errors.
- [ ] Enable monitoring / error reporting (e.g. Sentry or Datadog) for server and client runtime logs.
