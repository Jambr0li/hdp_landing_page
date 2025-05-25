import stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const StripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client (server-side)
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
  console.error(
    'Supabase URL or Service Role Key is missing in create-checkout-session. ' +
    'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabase) {
    console.error('Supabase client not initialized in create-checkout-session.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const { lookup_key } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Error getting user from token:', userError?.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token or user not found' });
    }

    // Fetch user's profile to check for an existing stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 'single' row not found (expected if no profile yet or no stripe_customer_id)
      console.error(`Error fetching profile for user ${user.id}:`, profileError.message);
      // Not necessarily a fatal error for checkout, but good to log
    }

    const prices = await StripeInstance.prices.list({
      lookup_keys: [lookup_key],
      expand: ['data.product'],
    });

    if (!prices.data.length) {
      return res.status(400).json({
        error: 'Invalid price. Please try again or contact support.',
      });
    }

    const sessionParams = {
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
      client_reference_id: user.id, // Pass Supabase user.id to Stripe
    };

    if (profile && profile.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id; // Use existing Stripe customer
    } else {
      // If no existing stripe_customer_id, we might want to pre-create the Stripe customer
      // or pass customer_email to prefill. For simplicity, Stripe will create one if not provided.
      // sessionParams.customer_email = user.email; // Optional: prefill email
    }

    const session = await StripeInstance.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    // Check for Stripe-specific errors if needed
    // if (error.type === 'StripeCardError') { ... }
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}