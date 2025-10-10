# Stripe Setup and Customer Portal Guide

This document explains the current Stripe integration in this project with a focus on the Customer Billing Portal. It covers environment setup, data model assumptions, API endpoints, and step-by-step flows.

## Overview
- **Core library**: `src/lib/stipeService.ts`
- **Portal endpoint**: `src/app/api/portal/route.ts`
- **Webhook endpoint**: `src/app/api/webhook/route.ts`
- **Data store**: Prisma (`@/lib/db`) with `user` and `subscription` tables (assumed)

The setup supports:
- Creating Stripe Customers for app users
- Checkout for subscriptions
- Role-aware Stripe Billing Portal access
- Webhooks to keep subscription state in sync

## Environment Variables
Add these secrets to your environment (e.g. `.env.local`):

- `STRIPE_SECRET_KEY`: Stripe secret key used by the server SDK
- `STRIPE_WEBHOOK_SECRET`: Secret used to verify webhook signatures
- `DOMAIN`: Public domain used for redirect URLs (e.g. `https://example.com`)

## Data Model Assumptions
- `user` table includes `id`, `email`, `role`, `stripeCustomerId` (nullable initially)
- `subscription` table includes `id`, `userId`, `priceId`, `stripeSubscriptionId`, `status`

Adjust field names as needed to match your schema.

## Library: src/lib/stipeService.ts
Key exported helpers:

- `getStripe()`: Returns a singleton Stripe client.
- `getProducts()`: Demo helper to list products and attach first active price.
- `ensureCustomerForUser(userId)`: Creates a Stripe Customer for the user if missing and saves `stripeCustomerId` to DB.
- `createCheckoutSession(priceId, customerId?)`: Creates a Checkout Session for a subscription.
- `ensurePortalConfigurationForRole(role)`: Builds a Billing Portal Configuration with features based on `role`.
  - For role `user`: view invoices, update payment method, cancel subscription; cannot change plan.
  - For other roles: can also update subscriptions (switch price/quantity where allowed) across active products/prices.
- `createPortalSessionForUser(userId)`: Creates a role-aware Billing Portal session URL for the user’s Stripe customer.

Notes:
- The file name is `stipeService.ts` (typo preserved to avoid breaking imports). Consider a future refactor to `stripeService.ts` and update imports accordingly.
- `ensurePortalConfigurationForRole()` currently creates a new configuration on each call. For production, consider reusing configurations per role (e.g., cache in DB by role) to avoid config sprawl in Stripe.

## Customer Portal Flow
1. User authenticates in the app.
2. Frontend calls `POST /api/portal`.
3. API resolves the app user, loads `stripeCustomerId`, and calls `createPortalSessionForUser(user.id)`.
4. Backend uses `ensurePortalConfigurationForRole(user.role)` to build role-specific portal features.
5. Backend creates a portal session via Stripe: `stripe.billingPortal.sessions.create(...)`.
6. API returns a portal URL for the frontend to redirect the user.

## Endpoint: POST /api/portal
- Path: `src/app/api/portal/route.ts`
- Requires authentication via `getAuthUserFromRequest(req)`.
- Looks up the user in DB to get `stripeCustomerId` and `role`.
- Calls `createPortalSessionForUser(user.id)` and returns `{ url }`.

Example response:
```json
{ "url": "https://billing.stripe.com/p/session/test_123" }
```

## Endpoint: POST /api/webhook
- Path: `src/app/api/webhook/route.ts`
- Verifies Stripe signature using `STRIPE_WEBHOOK_SECRET` and raw body.
- Handles events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- On create/update: upserts local `subscription` record with `status` and `priceId`.
- On delete: removes related local `subscription` records.

Important: Make sure your Next.js API endpoint receives the raw request body. The provided implementation reads `req.text()` to capture raw body for signature verification.

## Checkout (Subscriptions)
- Use `createCheckoutSession(priceId, customerId?)` from `stipeService.ts` to generate a session URL.
- Redirect the user to the returned URL.
- After successful checkout, Stripe triggers subscription webhook events to sync DB state.

## Setting up Stripe Dashboard
1. Create your Products and Prices (recurring) in Stripe.
2. Get your API keys from Stripe and set `STRIPE_SECRET_KEY`.
3. Create a Webhook endpoint in Stripe pointing to `/api/webhook`:
   - Events to listen to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Set `DOMAIN` to your deployed domain for redirect URLs (or `http://localhost:3000` for local testing).

## Local Testing Tips
- Use Stripe CLI to forward webhooks to your local server:
  - `stripe listen --forward-to localhost:3000/api/webhook`
  - Export the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
- Create test customers and subscriptions using the Dashboard or Checkout.
- Test the portal by calling `POST /api/portal` after authenticating.

## Security Considerations
- Always verify webhook signatures with the raw request body.
- Do not expose secret keys to the client; keep all Stripe SDK calls on the server.
- Authorize the `/api/portal` route; only signed-in users should access their own portal URL.
- Validate role-based access before enabling plan changes in the portal.

## Operational Notes and Improvements
- Cache or persist Billing Portal configurations per role to avoid many configurations.
- Consider mapping roles to specific products/prices if you need stricter plan switching rules.

## Configure Customer Portal in Stripe Dashboard
Follow these steps in the Stripe Dashboard to enable and control the Billing Portal:

1. Go to Dashboard → Settings → Billing → Customer portal.
2. Branding: set logo, brand color, and business information.
3. Features:
   - Enable Invoice history, Update payment methods, and Cancellation as needed.
   - To allow plan changes, enable "Customers can update subscriptions" and select which Products/Prices customers may switch between.
4. URLs:
   - Set the default Return URL to your app (match `DOMAIN`), e.g., `https://yourapp.com`.
   - Optionally set Terms of Service and Privacy Policy URLs.
5. Test mode:
   - Use Test mode to validate the portal with test customers before going live.
6. Save changes.

Note: This UI configuration complements server-side constraints set in `ensurePortalConfigurationForRole(role)` in `src/lib/stipeService.ts`. Keep both aligned.

## Initial Stripe Setup Checklist (including Webhooks)
Use this checklist when setting up from scratch:

1. Account & Mode
   - Create/Log in to Stripe. Switch to Test mode for development.
2. Products & Prices
   - Create recurring Products and Prices (monthly/yearly) in the Dashboard.
3. API Keys
   - Copy your Secret key (Test or Live) and set `STRIPE_SECRET_KEY` in your env.
4. Install SDK (if not already)
   - Server: `npm i stripe`
5. Environment Variables
   - Set `STRIPE_SECRET_KEY`, `DOMAIN` (e.g., `http://localhost:3000`).
6. Webhook Endpoint
   - Local dev via Stripe CLI:
     - `stripe listen --forward-to localhost:3000/api/webhook`
     - Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
   - Hosted prod/staging:
     - Dashboard → Developers → Webhooks → Add endpoint → `https://yourapp.com/api/webhook`
     - Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
     - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` for that environment.
7. Customer Portal
   - Configure portal in Dashboard (see section above) and ensure Return URL matches `DOMAIN`.
8. App Integration
   - Ensure users get a `stripeCustomerId` (`ensureCustomerForUser(userId)`).
   - Optionally implement Checkout via `createCheckoutSession(priceId)`.
   - Expose `POST /api/portal` and verify it returns a portal URL.
9. Verify E2E
   - Create test customers/subscriptions, trigger updates, confirm webhooks sync the `subscription` table.
   - Open portal via `POST /api/portal` and test allowed actions per role.

## Troubleshooting
- Webhook signature errors: ensure the endpoint reads the raw body (`req.text()`) and the correct `STRIPE_WEBHOOK_SECRET` is set.
- Portal return issues: confirm the portal Return URL in Dashboard matches `DOMAIN` used by the server.
- Plan switching missing: verify both Dashboard portal settings and server `ensurePortalConfigurationForRole()` include the intended products/prices.
