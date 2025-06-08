// This is your test secret API key.
require('dotenv').config();
const stripe = require('stripe')(process.env.VITE_STRIPE_SECRET_KEY);
const express = require('express');
const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const YOUR_DOMAIN = "http://localhost:4242";
const ORIGINAL_DOMAIN = "http://localhost:4173";

// Webhook handler must come before express.json()
app.post(
  '/webhook',
  // Use raw body parser for Stripe webhook verification
  express.raw({ type: 'application/json' }),
  (request, response) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.VITE_STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        const subscription = event.data.object;
        console.log(`Subscription status is ${subscription.status}.`);
        // Then define and call a method to handle the subscription trial ending.
        // handleSubscriptionTrialEnding(subscription);
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        console.log(`Subscription status is ${subscription.status}.`);
        // Then define and call a method to handle the subscription deleted.
        // handleSubscriptionDeleted(subscriptionDeleted);
        break;
      case 'customer.subscription.created':
        subscription = event.data.object;
        console.log(`Subscription status is ${subscription.status}.`);
        // Then define and call a method to handle the subscription created.
        // handleSubscriptionCreated(subscription);
        break;
      case 'customer.subscription.updated':
        subscription = event.data.object;
        console.log(`Subscription status is ${subscription.status}.`);
        // Then define and call a method to handle the subscription update.
        // handleSubscriptionUpdated(subscription);
        break;
      case 'entitlements.active_entitlement_summary.updated':
        subscription = event.data.object;
        console.log(`Active entitlement summary updated for ${subscription}.`);
        // Then define and call a method to handle active entitlement summary updated
        // handleEntitlementUpdated(subscription);
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    response.json({received: true});
  }
);

// Apply JSON parsing middleware after the webhook route
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [req.body.lookup_key],
      expand: ['data.product'],
    });
    console.log(prices)

    if (!prices.data.length) {
      console.error('No prices found for lookup_key:', req.body.lookup_key);
      return res.status(400).json({
        error: 'Invalid price. Please try again or contact support.'
      }); 
    }

    const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${ORIGINAL_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ORIGINAL_DOMAIN}/cancel.html`,
  });

  res.redirect(303, session.url);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/create-portal-session', async (req, res) => {
  // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
  // Typically this is stored alongside the authenticated user in your database.
  const { session_id } = req.body;
  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

  // This is the url to which the customer will be redirected when they're done
  // managing their billing with the portal.
  const returnUrl = YOUR_DOMAIN;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer,
    return_url: returnUrl,
  });

  res.redirect(303, portalSession.url);
});

// GitHub Release Download Endpoint
app.get('/api/download-latest-release', async (req, res) => {
  try {
    // GitHub repository details - set these in your environment variables
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
      return res.status(500).json({ 
        error: 'GitHub configuration missing. Please set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN environment variables.' 
      });
    }

    // Fetch the latest release from GitHub API
    const fetch = (await import('node-fetch')).default;
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HealthParse-Landing-Page'
        }
      }
    );

    if (!releaseResponse.ok) {
      console.error('GitHub API response:', releaseResponse.status, releaseResponse.statusText);
      return res.status(500).json({ 
        error: 'Failed to fetch release information from GitHub' 
      });
    }

    const releaseData = await releaseResponse.json();
    
    // Check if there are any assets
    if (!releaseData.assets || releaseData.assets.length === 0) {
      return res.status(404).json({ 
        error: 'No downloadable files found in the latest release' 
      });
    }

    // Detect the user's operating system from User-Agent
    const userAgent = req.headers['user-agent'] || '';
    let targetAsset = null;

    // Logic to select the appropriate asset based on the user's OS
    if (userAgent.includes('Mac') || userAgent.includes('Darwin')) {
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('mac') || 
        asset.name.includes('darwin') || 
        asset.name.endsWith('.dmg') || 
        asset.name.endsWith('.pkg') ||
        asset.name.includes('macos')
      );
    } else if (userAgent.includes('Windows') || userAgent.includes('Win')) {
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('win') || 
        asset.name.includes('windows') || 
        asset.name.endsWith('.exe') || 
        asset.name.endsWith('.msi')
      );
    } else if (userAgent.includes('Linux')) {
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('linux') || 
        asset.name.endsWith('.AppImage') || 
        asset.name.endsWith('.deb') || 
        asset.name.endsWith('.rpm') ||
        asset.name.endsWith('.tar.gz')
      );
    }

    // If no OS-specific asset found, use the first asset as fallback
    if (!targetAsset) {
      targetAsset = releaseData.assets[0];
    }

    // If requesting info only
    if (req.query.info === 'true') {
      return res.json({
        success: true,
        fileName: targetAsset.name,
        fileSize: targetAsset.size,
        releaseVersion: releaseData.tag_name,
        releaseName: releaseData.name,
        publishedAt: releaseData.published_at
      });
    }

    // Proxy the download
    const downloadUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/assets/${targetAsset.id}`;
    const assetResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/octet-stream',
        'User-Agent': 'HealthParse-Landing-Page'
      }
    });

    if (!assetResponse.ok) {
      return res.status(500).json({ 
        error: 'Failed to fetch download URL' 
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${targetAsset.name}"`);
    res.setHeader('Content-Length', targetAsset.size);

    // Pipe the response
    assetResponse.body.pipe(res);

  } catch (error) {
    console.error('Error in download-latest-release:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

app.listen(4242, () => console.log('Running on port 4242'));