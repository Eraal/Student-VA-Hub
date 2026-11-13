# VAwise — Production Deployment Guide

This guide details the steps, verification gates, and environment requirements for deploying VAwise to production environments.

---

## 1. Pre-Deployment Verification Checklist

Before deploying any build to staging or production, execute the following commands in sequence:

```bash
# 1. Typecheck the entire codebase (zero errors required)
npx tsc --noEmit

# 2. Run the full unit/integration test suite (all tests must pass)
npm run test

# 3. Create an optimized production build
npm run build

# 4. Mandatory Security Gate: Verify no demo credentials leaked into client bundles
npm run check:no-demo-creds
```

> [!IMPORTANT]
> **Mandatory Security Gate:**  
> `npm run check:no-demo-creds` scans the entire `.next/static` output directory to guarantee that developer demo emails (`maria@example.com`, `juan@example.com`) and seed passwords (`demo1234`) are completely absent from all client JavaScript bundles.  
> If this script fails, do NOT deploy the build.

---

## 2. Environment Variables

The following environment variables must be configured in your production hosting provider:

| Variable | Description | Required | Example / Notes |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `AUTH_SECRET` | NextAuth secret key for signing JWTs / sessions | Yes | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical URL of the production deployment | Yes | `https://vawise.com` |
| `NODE_ENV` | Application environment | Yes | Must be `production` |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | Dev demo credentials toggle | Optional | **NEVER** set to `"true"` in production. Defaults to false. |

---

## 3. Database Migrations

Run database migrations against the production database:

```bash
npx prisma migrate deploy
```

> [!CAUTION]
> **Never seed production databases:**  
> Never run `npm run db:seed` or `tsx prisma/seed.ts` against a production database. All seed scripts enforce Seed Safety Guards that abort if executed against non-local hostnames or without explicit `ALLOW_SEED=1` override.

---

## 4. Verification in Production

1. Visit the `/login` route:
   - Ensure the "Dev Demo Credentials" box is **not** rendered.
   - Confirm password toggle works without submitting the form.
   - Test login with valid production credentials.
2. Visit `/forgot-password`:
   - Confirm honest message is displayed ("If an account exists for that email, a reset link will be sent when email sending is enabled.").

