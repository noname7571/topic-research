# Discourse Intelligence Engine

Signal-first SaaS for understanding what the internet actually thinks.

This product is intentionally not a chatbot and not a generic AI summary tool.

## Product Positioning

- Extracts discourse signal, not broad summaries.
- Surfaces trends, opportunities, contrarian views, and actions.
- Uses plan-based output depth so free tier is a preview and paid tiers deliver full value.

## What Is Implemented

1. Authentication
- Supabase email/password signup and login.
- Email verification callback flow via [app/auth/callback/route.ts](app/auth/callback/route.ts).
- Forgot-password and reset-password UX via [app/forgot-password/page.tsx](app/forgot-password/page.tsx) and [app/reset-password/page.tsx](app/reset-password/page.tsx).
- Session-aware middleware protection for dashboard routes.

2. Database (Supabase)
- `users` table with plan and credits metadata.
- `usage_logs` table for search tracking.
- `subscriptions` table for Stripe subscription state.
- SQL schema in [supabase/schema.sql](supabase/schema.sql).

3. Stripe Billing
- Checkout session route: [app/api/stripe/checkout/route.ts](app/api/stripe/checkout/route.ts).
- Webhook route: [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts).
- Billing portal route: [app/api/stripe/portal/route.ts](app/api/stripe/portal/route.ts).
- Cancel-at-period-end route: [app/api/stripe/cancel/route.ts](app/api/stripe/cancel/route.ts).
- Webhook updates `subscriptions` and user plan.
- Checkout enforces monthly recurring Stripe prices only.
- Cancelation is scheduled at period end, so users keep access for current cycle and are not billed next month.

4. Feature Gating
- API plan enforcement in [app/api/analyze/route.ts](app/api/analyze/route.ts).
- Free plan output is limited:
  - 3-4 executive bullets
  - 2-3 themes with reduced depth
  - locked opportunities, contrarian insights, trend analysis, content ideas, and deep evidence
- Paid plans unlock full output.

5. Differentiation Features
- Narrative detection labels in themes: `hype`, `fear`, `opportunity`, `confusion`.
- Signal score in trend analysis cards.
- Action layer guidance per theme.
- Content Engine section (YouTube, Twitter, TikTok hooks).

6. SaaS Pages
- Landing page: [app/page.tsx](app/page.tsx)
- Dashboard: [app/dashboard/page.tsx](app/dashboard/page.tsx)
- Pricing: [app/pricing/page.tsx](app/pricing/page.tsx)
- About: [app/about/page.tsx](app/about/page.tsx)
- Login: [app/login/page.tsx](app/login/page.tsx)
- Signup: [app/signup/page.tsx](app/signup/page.tsx)
- Forgot password: [app/forgot-password/page.tsx](app/forgot-password/page.tsx)
- Reset password: [app/reset-password/page.tsx](app/reset-password/page.tsx)

## Environment Variables

Copy [.env.example](.env.example) to `.env.local`.

Required for core app:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Required for billing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_PREMIUM_PRICE_ID`

Optional data connectors:
- `YOUTUBE_API_KEY`
- `TAVILY_API_KEY`
- `NEWS_API_KEY`

Plan and volume tuning:
- `FREE_TIER_DAILY_LIMIT`
- `PRO_TIER_DAILY_LIMIT`
- `PREMIUM_TIER_DAILY_LIMIT`
- `MAX_SIGNALS_PER_RUN`
- `RELEVANCE_MIN_SCORE`
- `RELEVANCE_MIN_KEPT`
- `RELEVANCE_MAX_KEPT`
- `RELEVANCE_PLATFORM_CAP_RATIO`
- `WEAK_DATA_MIN_RELEVANT_ROWS`
- `CONFIDENCE_MIN`
- `CONFIDENCE_MAX`
- `FREE_SOURCES_VISIBLE_LIMIT`
- `PRO_SOURCES_VISIBLE_LIMIT`
- `PREMIUM_SOURCES_VISIBLE_LIMIT`

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Configure Supabase:
- Create a Supabase project.
- Run [supabase/schema.sql](supabase/schema.sql) in SQL editor.
- Enable Email auth provider.
- To enable social sign-in, configure Google provider in Supabase Authentication.
- Add callback URL in Google provider settings:
  - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
- Add your app callback URL in Supabase redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_DOMAIN/auth/callback` (production)

3. Configure Stripe:
- Create `pro` and `premium` recurring monthly prices.
- Add price IDs to env.
- Set webhook endpoint to `/api/stripe/webhook`.
- In Stripe Billing Portal settings, enable subscription cancellation and plan management.

4. Start development server.

```bash
npm run dev
```

## Vercel Deployment

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add all `.env.example` variables in Vercel settings.
4. In Stripe dashboard, set webhook endpoint to:
- `https://YOUR_DOMAIN/api/stripe/webhook`
5. Deploy.

## Plan Enforcement Logic

- Analysis route checks authenticated user plan and usage from Supabase.
- If daily plan limit is exceeded, API returns HTTP `429`.
- Free plan receives `limited_result` shape.
- Pro and Premium receive `full_result` shape.

## Core Files

- SaaS account logic: [lib/account.ts](lib/account.ts)
- Plan limits and lock rules: [lib/billing/plans.ts](lib/billing/plans.ts)
- Supabase clients: [lib/supabase/server.ts](lib/supabase/server.ts), [lib/supabase/browser.ts](lib/supabase/browser.ts), [lib/supabase/admin.ts](lib/supabase/admin.ts)
- Supabase database types: [lib/supabase/database.types.ts](lib/supabase/database.types.ts)
- Stripe client: [lib/stripe.ts](lib/stripe.ts)
- Route protection: [proxy.ts](proxy.ts)
- Analysis gating: [app/api/analyze/route.ts](app/api/analyze/route.ts)
