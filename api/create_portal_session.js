import stripe from 'stripe';
const Stripe = stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { session_id } = req.body;

  try {
    const checkoutSession = await Stripe.checkout.sessions.retrieve(session_id);
    const portalSession = await Stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: process.env.ORIGIN,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}