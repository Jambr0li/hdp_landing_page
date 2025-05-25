import stripe from 'stripe';
const Stripe = stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { lookup_key } = req.body;

  try {
    const prices = await Stripe.prices.list({
      lookup_keys: [lookup_key],
      expand: ['data.product'],
    });

    if (!prices.data.length) {
      return res.status(400).json({
        error: 'Invalid price. Please try again or contact support.',
      });
    }

    const session = await Stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.ORIGIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.ORIGIN}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}