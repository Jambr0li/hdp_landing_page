import { buffer } from 'micro';
import stripe from 'stripe';
const Stripe = stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const rawBody = await buffer(req);
    event = Stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'customer.subscription.trial_will_end':
      console.log(`Subscription status is ${event.data.object.status}.`);
      // Add logic (e.g., notify user)
      break;
    case 'customer.subscription.deleted':
      console.log(`Subscription status is ${event.data.object.status}.`);
      // Add logic (e.g., update database)
      break;
    case 'customer.subscription.created':
      console.log(`Subscription status is ${event.data.object.status}.`);
      // Add logic (e.g., save to database)
      break;
    case 'customer.subscription.updated':
      console.log(`Subscription status is ${event.data.object.status}.`);
      // Add logic (e.g., update subscription status)
      break;
    case 'entitlements.active_entitlement_summary.updated':
      console.log(`Active entitlement summary updated: ${event.data.object}.`);
      // Add logic
      break;
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  res.status(200).json({ received: true });
}

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook raw body
  },
};