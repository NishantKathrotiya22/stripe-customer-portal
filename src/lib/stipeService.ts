// lib/stipeService.ts - unified Stripe singleton + helpers
import Stripe from "stripe";
import { prisma } from "@/lib/db";

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeSingleton;
}

// Fetch products (demo: fetch all, attach first price per product)
export const getProducts = async () => {
  const stripe = getStripe();
  const products = await stripe.products.list();

  // For demo: fetch price for the first matched product; otherwise attach first price per product
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

// Ensure Stripe customer exists for a given user; persist customer id
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

// Create checkout session for subscription
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

// Build or reuse a Billing Portal configuration per role
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

  // If the role is not 'user', enable subscription_update with products
  if (role !== "user") {
    // Fetch all active products and their active prices
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
      default_allowed_updates: ["price", "quantity", "promotion_code"], // Move allowed updates here
      proration_behavior: "none", // Optional, adjust as needed
    };
  } else {
    // For 'user' role, disable subscription_update
    features = {
      ...features,
      subscription_update: {
        enabled: false,
      },
    };
  }

  // Ensure that configuration is created and return its ID
  const conf = await stripe.billingPortal.configurations.create({
    features,
  });

  // Check if configuration was created successfully
  if (!conf || !conf.id) {
    throw new Error("Failed to create a valid configuration");
  }

  return conf.id;
};
// Create a portal session for a user with role-aware configuration
export const createPortalSessionForUser = async (userId: number) => {
  const stripe = getStripe();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) throw new Error("No Stripe customer linked");

  const configurationId = await ensurePortalConfigurationForRole(user.role);

  // Check if the configuration ID is valid
  if (!configurationId) {
    throw new Error("Invalid configuration ID for user role: " + user.role);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: process.env.DOMAIN || "http://localhost:3000",
    configuration: configurationId,
  });

  // Return the session URL
  return session.url;
};
