// lib/stripeService.ts - unified Stripe singleton + helpers (Customer Portal focused)
import Stripe from "stripe";
import { prisma } from "@/lib/db";

let stripeSingleton: Stripe | null = null;

/**
 * Get a singleton Stripe client.
 * Relies on STRIPE_SECRET_KEY being set in env.
 */
export function getStripe() {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeSingleton;
}

/**
 * Fetch all Stripe products and attach first active price (demo helper).
 */
export const getProducts = async () => {
  const stripe = getStripe();
  const products = await stripe.products.list();

  const mapped = await Promise.all(
    products.data.map(async (p) => {
      const prices = await stripe.prices.list({
        product: p.id,
        active: true,
        limit: 1,
      });
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceId: prices.data[0]?.id,
        price: (prices.data[0]?.unit_amount ?? 0) / 100,
      };
    })
  );

  return mapped;
};

/**
 * Ensure a Stripe customer exists for an app user and persist its id.
 */
export const ensureCustomerForUser = async (userId: number) => {
  const stripe = getStripe();
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email });
    user = await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
  }
  return user;
};

/**
 * Create a subscription Checkout Session for given price.
 */
export const createCheckoutSession = async (
  priceId: string,
  customerId?: string
) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    customer: customerId,
    success_url: `${process.env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/cancel`,
  });
  return session.url;
};

/**
 * Build a Stripe Billing Portal Configuration based on user's role.
 * - role === "user": can view invoices, update payment method, cancel; cannot change plan
 * - otherwise: can also update subscriptions across allowed products/prices
 */
export const ensurePortalConfigurationForRole = async (role: string) => {
  const stripe = getStripe();

  let features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true },
    customer_update: {
      enabled: true,
      allowed_updates: ["email"],
    },
  };

  if (role !== "user") {
    // Build product constraints so users can switch between allowed plans in portal
    const productsList = await stripe.products.list({ active: true });
    const products = await Promise.all(
      productsList.data.map(async (prod) => {
        const pricesList = await stripe.prices.list({
          product: prod.id,
          active: true,
        });
        return {
          product: prod.id,
          prices: pricesList.data.map((price) => price.id),
        };
      })
    );

    features.subscription_update = {
      enabled: true,
      products,
      default_allowed_updates: ["price", "quantity", "promotion_code"],
      proration_behavior: "none",
    };
  } else {
    features = {
      ...features,
      subscription_update: { enabled: false },
    };
  }

  const conf = await stripe.billingPortal.configurations.create({ features });
  if (!conf?.id) throw new Error("Failed to create a valid configuration");
  return conf.id;
};

/**
 * Create a Billing Portal session for the user's Stripe customer using a role-aware configuration.
 */
export const createPortalSessionForUser = async (userId: number) => {
  const stripe = getStripe();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) throw new Error("No Stripe customer linked");

  const configurationId = await ensurePortalConfigurationForRole(user.role);
  if (!configurationId) throw new Error("Invalid configuration for role: " + user.role);

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: process.env.DOMAIN || "http://localhost:3000",
    configuration: configurationId,
  });

  return session.url;
};
