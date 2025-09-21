# 🚀 Stripe Billing Integration Setup Guide

This guide will help you set up Stripe billing integration with Apple Pay support for your FlairSocial app.

## 📋 Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **Test Mode**: Start with Stripe's test mode for development
3. **Domain**: Your app's domain for Apple Pay configuration

## 🔧 Step 1: Install Dependencies

The Stripe packages have already been installed:
```bash
npm install stripe @stripe/stripe-js
```

## 🔑 Step 2: Get Your Stripe Keys

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API Keys**
3. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` for test mode)
   - **Secret Key** (starts with `sk_test_` for test mode)

## 💰 Step 3: Create Subscription Products

1. In Stripe Dashboard, go to **Products**
2. Create two products:
   - **Plus Plan**: $2.99/month, $29.99/year
   - **Pro Plan**: $9.99/month, $99.99/year

3. For each product, create prices and note the **Price IDs** (they start with `price_`)

## 🌐 Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs from Step 3
STRIPE_PRICE_PLUS_MONTHLY=price_your_plus_monthly_price_id
STRIPE_PRICE_PLUS_YEARLY=price_your_plus_yearly_price_id
STRIPE_PRICE_PRO_MONTHLY=price_your_pro_monthly_price_id
STRIPE_PRICE_PRO_YEARLY=price_your_pro_yearly_price_id

# Your app's URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔗 Step 5: Set Up Webhooks

### **For Development Testing:**
Since Stripe webhooks can't reach `localhost`, you have several options:

#### **Option 1: Stripe CLI (Recommended for Development)**
```bash
# Install Stripe CLI
# Download from: https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Create a temporary webhook endpoint
- Forward events to your local server
- Provide a webhook signing secret for testing

#### **Option 2: ngrok (Alternative)**
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL in Stripe Dashboard
# Example: https://abc123.ngrok.io/api/stripe/webhook
```

#### **Option 3: LocalTunnel**
```bash
# Install localtunnel
npm install -g localtunnel

# Expose your local server
lt --port 3000

# Use the localtunnel URL in Stripe Dashboard
```

### **For Production:**
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret** to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

### **Testing Webhooks Locally:**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Use Stripe CLI to forward webhooks:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Copy the webhook signing secret** from the CLI output to your `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Test a payment flow:**
   - Go to your app and try to purchase a plan
   - Complete the checkout with a test card
   - Check your server logs for webhook events
   - Verify the user's subscription status updates

### **Testing Without Webhooks:**
If you want to test the checkout flow without setting up webhooks initially:

1. **Complete a test purchase** using the test card `4242 4242 4242 4242`
2. **Check Stripe Dashboard** → **Payments** to see the successful payment
3. **Manually update the user's subscription** in your database for testing
4. **Test the UI changes** (verified badges, credit increases, etc.)

**Note:** Webhooks are crucial for production to automatically handle subscription updates, but you can test the basic checkout flow without them.

### **Development vs Production Webhooks:**

- **Development**: Use Stripe CLI or ngrok to forward webhooks to localhost
- **Production**: Set up a real webhook endpoint on your production domain
- **No Conflicts**: You can have multiple webhook endpoints in Stripe (one for dev, one for prod)
- **Test Mode**: All webhook testing should be done in Stripe's test mode first

## 🍎 Step 6: Configure Apple Pay (Optional but Recommended)

### Register Merchant ID
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a new **Merchant ID** (e.g., `merchant.com.flairsocial`)

### Domain Verification
1. In Stripe Dashboard, go to **Settings** → **Payment methods**
2. Find **Apple Pay** and click **Configure**
3. Add your domain for verification
4. Download the verification file and upload it to your domain's `.well-known/` directory

### Create Apple Pay Certificate
1. In Stripe Dashboard → **Apple Pay** settings
2. Generate a new certificate
3. Download the Certificate Signing Request (CSR)
4. Upload it to Apple Developer Portal to get your certificate
5. Upload the certificate back to Stripe

## 🧪 Step 7: Test the Integration

### Test Cards
Use these test cards in Stripe Checkout:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Apple Pay**: Use a real card from participating banks

### Test Webhooks
1. Use Stripe CLI for local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
2. Copy the webhook signing secret from CLI output

## 🚀 Step 8: Go Live

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update Environment Variables** with live keys:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
3. **Update Webhook URL** to your production domain
4. **Test with Real Cards** (small amounts)
5. **Verify Apple Pay** works with real devices

## 📊 Monitoring & Analytics

### Stripe Dashboard Features
- **Revenue Analytics**: Track subscription revenue
- **Customer Insights**: Monitor churn and retention
- **Failed Payments**: Handle payment failures
- **Subscription Lifecycle**: Manage upgrades/downgrades

### Key Metrics to Monitor
- **Conversion Rate**: Free → Paid users
- **Churn Rate**: Subscription cancellations
- **MRR (Monthly Recurring Revenue)**
- **LTV (Lifetime Value)**

## 🛠️ Troubleshooting

### Common Issues

**Webhook not firing:**
- Check webhook URL is correct
- Verify webhook secret is set
- Ensure events are selected

**Apple Pay not showing:**
- Verify domain is registered with Apple
- Check Apple Pay certificate is uploaded
- Ensure user has compatible device/browser

**Checkout session errors:**
- Verify price IDs are correct
- Check environment variables are set
- Ensure user is authenticated

### Debug Mode
Add this to your `.env.local` for detailed logging:
```env
STRIPE_DEBUG=true
```

## 📞 Support

- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available in your dashboard
- **Apple Pay Setup**: [stripe.com/docs/apple-pay](https://stripe.com/docs/apple-pay)

## 🎯 Next Steps

After setup is complete:
1. Test all payment flows
2. Monitor webhook events
3. Set up email notifications for failed payments
4. Configure tax collection if needed
5. Set up customer portal for subscription management

---

**🎉 Your Stripe billing integration is now ready! Users can subscribe to Plus/Pro plans with full Apple Pay support.**
