import { buffer } from 'micro';
import stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const StripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
// IMPORTANT: Use environment variables for Supabase URL and Service Role Key.
// These should be set in your Vercel/hosting environment (e.g., SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
// The user mentioned VITE_SUPABASE_URL and VITE_SUPABASE_KEY. If these are indeed available server-side
// and are the correct ones (especially the key, which should be the service_role key for admin operations),
// you can use process.env.VITE_SUPABASE_URL and process.env.VITE_SUPABASE_KEY instead.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
  console.error(
    'Supabase URL or Service Role Key is missing. ' +
    'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or your chosen env variables) are set. ' +
    'Supabase operations will be skipped.'
  );
}

// Helper function to get user_id from stripe_customer_id
// Assumes you have a 'profiles' table linking Supabase auth.users.id to Stripe customer IDs
async function getUserIdFromStripeCustomerId(stripeCustomerId) {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot fetch user_id.');
    return null;
  }
  const { data, error } = await supabase
    .from('profiles') // YOUR_TABLE_NAME_HERE, e.g., 'profiles'
    .select('user_id') // YOUR_USER_ID_COLUMN_HERE, e.g., 'user_id' or 'id'
    .eq('stripe_customer_id', stripeCustomerId) // YOUR_STRIPE_CUSTOMER_ID_COLUMN_HERE
    .single();

  if (error) {
    console.error(`Error fetching user_id for stripe_customer_id ${stripeCustomerId}:`, error.message);
    return null;
  }
  return data ? data.user_id : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (!endpointSecret) {
    console.error('Stripe webhook secret is not set. Ensure STRIPE_WEBHOOK_SECRET is in environment variables.');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  try {
    const rawBody = await buffer(req);
    event = StripeInstance.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (!supabase) {
    console.warn('Supabase client not initialized. Database operations will be skipped for event:', event.type);
    // Still acknowledge the event to Stripe if Supabase isn't set up, to prevent retries for this reason.
    return res.status(200).json({ received: true, warning: 'Supabase client not initialized, DB operations skipped.' });
  }

  const dataObject = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = dataObject;
      console.log(`Processing checkout.session.completed: ${session.id}`);

      const userId = session.client_reference_id;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription; // This is the ID of the subscription created

      if (!userId) {
        console.error(`checkout.session.completed: Missing client_reference_id (user_id) in session ${session.id}.`);
        return res.status(200).json({ received: true, error: 'Missing client_reference_id in session.' });
      }
      if (!stripeCustomerId) {
        console.error(`checkout.session.completed: Missing customer_id in session ${session.id} for user ${userId}.`);
        return res.status(200).json({ received: true, error: 'Missing customer_id in session.' });
      }

      // Update profiles table with stripe_customer_id
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error(`Error updating profile for user ${userId} with stripe_customer_id ${stripeCustomerId}:`, profileUpdateError.message);
      } else {
        console.log(`Profile updated for user ${userId} with stripe_customer_id ${stripeCustomerId}.`);
      }

      if (stripeSubscriptionId) {
        try {
          const fullSubscription = await StripeInstance.subscriptions.retrieve(
            stripeSubscriptionId,
            { expand: ['items.data.plan', 'items.data.price'] }
          );

          const planNickname = fullSubscription.items.data.length > 0 
            ? (fullSubscription.items.data[0].plan?.nickname || fullSubscription.items.data[0].price?.id) 
            : null;

          const { error: subCreateError } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: fullSubscription.id,
              status: fullSubscription.status,
              plan: planNickname,
            }, {
              onConflict: 'stripe_subscription_id',
            });

          if (subCreateError) {
            console.error(`Error creating/updating subscription ${fullSubscription.id} from checkout session ${session.id} in Supabase:`, subCreateError.message);
          } else {
            console.log(`Subscription ${fullSubscription.id} created/updated in Supabase from checkout session ${session.id}.`);
          }
        } catch (stripeError) {
          console.error(`Error retrieving subscription ${stripeSubscriptionId} from Stripe:`, stripeError.message);
        }
      } else {
        console.warn(`checkout.session.completed: No subscription ID found in session ${session.id}. This might be a one-time payment session.`);
      }
      break;
    }

    case 'customer.subscription.created': {
      const subscription = dataObject;
      console.log(`Processing customer.subscription.created: ${subscription.id}, Status: ${subscription.status}`);
      const stripeCustomerId = subscription.customer;
      const userId = await getUserIdFromStripeCustomerId(stripeCustomerId);

      if (!userId) {
        console.error(`User ID not found for Stripe customer ${stripeCustomerId}. Cannot create subscription record for ${subscription.id}.`);
        return res.status(200).json({ received: true, error: `User ID not found for customer ${stripeCustomerId}` });
      }

      const planNickname = subscription.items.data.length > 0 ? (subscription.items.data[0].plan.nickname || subscription.items.data[0].price.id) : null;

      const { error: createError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan: planNickname,
        }, {
          onConflict: 'stripe_subscription_id',
        });

      if (createError) {
        console.error(`Error creating/updating subscription ${subscription.id} in Supabase:`, createError.message);
        return res.status(500).json({ error: `Supabase error: ${createError.message}` });
      } else {
        console.log(`Subscription ${subscription.id} created/updated in Supabase.`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = dataObject;
      console.log(`Processing customer.subscription.updated: ${subscription.id}, Status: ${subscription.status}`);
      const planNickname = subscription.items.data.length > 0 ? (subscription.items.data[0].plan.nickname || subscription.items.data[0].price.id) : null;
      
      const updatePayload = {
        status: subscription.status,
      };
      if (planNickname) {
        updatePayload.plan = planNickname;
      }

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updatePayload)
        .eq('stripe_subscription_id', subscription.id);

      if (updateError) {
        console.error(`Error updating subscription ${subscription.id} in Supabase:`, updateError.message);
        return res.status(500).json({ error: `Supabase error: ${updateError.message}` });
      } else {
        console.log(`Subscription ${subscription.id} updated in Supabase.`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = dataObject;
      console.log(`Processing customer.subscription.deleted: ${subscription.id}, Status: ${subscription.status}`);
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status, 
        })
        .eq('stripe_subscription_id', subscription.id);

      if (deleteError) {
        console.error(`Error marking subscription ${subscription.id} as deleted in Supabase:`, deleteError.message);
        return res.status(500).json({ error: `Supabase error: ${deleteError.message}` });
      } else {
        console.log(`Subscription ${subscription.id} status updated to '${subscription.status}' in Supabase.`);
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = dataObject;
      console.log(`Subscription ${subscription.id} trial will end soon. Status: ${subscription.status}.`);
      break;
    }

    case 'entitlements.active_entitlement_summary.updated': {
      console.log(`Active entitlement summary updated. Data: ${JSON.stringify(dataObject, null, 2)}`);
      break;
    }

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