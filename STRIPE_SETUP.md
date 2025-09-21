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

## 🛒 Buy Now Pay Later (BNPL) & Free Trials Implementation

### **🎁 Free Trials Setup**

#### **1. Enable Trial Periods**
Free trials are automatically configured in your checkout session:

```typescript
// In your checkout session (already implemented)
subscription_data: {
  trial_period_days: 7, // 7-day free trial
  metadata: {
    trial: 'true'
  }
}
```

#### **2. Trial User Experience**
- Users get **7 days free** before being charged
- Full access to all features during trial
- Clear messaging about trial expiration
- Automatic conversion to paid subscription

#### **3. Trial Management**
- Stripe automatically handles trial → paid conversion
- Webhooks notify you of trial events
- Users can cancel during trial period
- No charges during trial (unless card fails validation)

### **💳 Buy Now Pay Later (BNPL) Setup**

#### **1. BNPL Providers Available**
Your integration supports:
- **Klarna** - Pay in 4 installments (US/UK)
- **Afterpay/Clearpay** - Pay in 4 installments
- **Affirm** - Longer-term financing (US)

#### **2. BNPL Configuration**
BNPL is automatically enabled when `paymentType: 'installments'`:

```typescript
// Payment methods for BNPL
payment_method_types: [
  'card',
  'afterpay_clearpay', // Clearpay/Afterpay
  'klarna',            // Klarna
  'affirm',            // Affirm
]

// Payment method options
payment_method_options: {
  klarna: { preferred_locale: 'en-US' },
  afterpay_clearpay: { preferred_locale: 'en-US' },
  affirm: { preferred_locale: 'en-US' }
}
```

#### **3. BNPL User Flow**
1. User selects "Pay in Installments" option
2. Stripe shows available BNPL providers
3. User completes BNPL application
4. Subscription starts immediately
5. Payments spread over time (varies by provider)

### **🎨 Frontend Implementation**

#### **Payment Type Selection**
Add buttons for different payment options:

```jsx
// Example payment type buttons
<div className="flex gap-2 mb-4">
  <button
    onClick={() => handleUpgrade(plan, 'monthly', 'full')}
    className="px-4 py-2 bg-blue-600 text-white rounded"
  >
    Pay Full Price
  </button>

  <button
    onClick={() => handleUpgrade(plan, 'monthly', 'trial')}
    className="px-4 py-2 bg-green-600 text-white rounded"
  >
    Start Free Trial
  </button>

  <button
    onClick={() => handleUpgrade(plan, 'monthly', 'installments')}
    className="px-4 py-2 bg-purple-600 text-white rounded"
  >
    Pay in Installments
  </button>
</div>
```

### **📊 Conversion Optimization**

#### **Free Trials Benefits:**
- **Higher Conversion**: 7-day trial reduces commitment fear
- **Full Feature Access**: Users experience complete value
- **Automatic Conversion**: Seamless transition to paid
- **Retention Focus**: Trial users more likely to stay

#### **BNPL Benefits:**
- **Higher AOV**: Users buy more expensive plans
- **Reduced Cart Abandonment**: No large upfront payment
- **Broader Market**: Access price-sensitive customers
- **Trust Building**: Familiar payment methods

### **🔧 Technical Implementation**

#### **1. Database Schema Updates**
Add trial tracking to your user/subscription table:

```sql
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN payment_type VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN trial_start DATE;
ALTER TABLE subscriptions ADD COLUMN bnpl_provider VARCHAR(50);
```

#### **2. Webhook Handling**
Update your webhook handler for trial and BNPL events:

```typescript
// Handle trial events
case 'customer.subscription.trial_will_end':
  // Send reminder email 3 days before trial ends
  break

case 'invoice.payment_succeeded':
  // Handle BNPL installment payments
  break
```

#### **3. User Experience**
- Show trial countdown in UI
- Display BNPL payment schedule
- Send reminder emails before trial ends
- Handle failed BNPL payments gracefully

### **📈 Analytics & Monitoring**

#### **Key Metrics to Track:**
- **Trial Conversion Rate**: Trial users → Paid users
- **BNPL Usage Rate**: % of purchases using BNPL
- **Trial Length**: Average trial duration
- **Payment Success Rate**: BNPL payment completion

#### **Stripe Dashboard Insights:**
- Monitor trial vs paid conversion
- Track BNPL provider performance
- Analyze payment failure reasons
- Measure revenue impact

### **⚖️ Legal & Compliance**

#### **Free Trials:**
- Clear trial terms in checkout
- Easy cancellation during trial
- Transparent pricing after trial
- GDPR compliance for EU users

#### **BNPL:**
- Age verification (18+ typically)
- Credit check requirements
- Transparent fee disclosure
- Consumer protection compliance

### **🚀 Advanced Features**

#### **1. Dynamic Trial Lengths**
```typescript
// Different trial lengths by plan
const trialDays = {
  plus: 7,
  pro: 14,
  business: 30
}
```

#### **2. BNPL Provider Selection**
```typescript
// Route users to best BNPL provider
const getBestBNPLProvider = (userLocation, purchaseAmount) => {
  if (userLocation === 'US' && purchaseAmount > 100) {
    return 'affirm' // Better for higher amounts
  }
  return 'klarna' // Default for most cases
}
```

#### **3. A/B Testing**
Test different trial lengths and BNPL options:
- 7-day vs 14-day trials
- BNPL vs full payment
- Different BNPL providers

### **💰 Revenue Optimization**

#### **Pricing Strategy:**
- **Trial Plans**: Same price as regular plans
- **BNPL Plans**: Same price (BNPL fees separate)
- **Discount Trials**: Optional trial discounts

#### **Conversion Tactics:**
- **Urgency**: Trial expiration reminders
- **Social Proof**: "Most popular" badges
- **Trust Signals**: Security badges, testimonials
- **Scarcity**: Limited-time offers

### **🔧 Testing BNPL & Trials**

#### **Test Cards for BNPL:**
```javascript
// Klarna test cards
'4000002500000003' // Approved
'4000002760000016' // Denied

// Afterpay test cards
'342809250000000' // Approved
'342809250000001' // Denied
```

#### **Trial Testing:**
- Use Stripe's test mode
- Set short trial periods for testing
- Test trial expiration flows
- Verify webhook events

### **📞 Support & Troubleshooting**

#### **Common Issues:**
- **BNPL Not Showing**: Check geographic availability
- **Trial Not Starting**: Verify webhook configuration
- **Payment Failures**: Check BNPL provider requirements

#### **Customer Support:**
- Clear refund policies for trials
- BNPL payment dispute handling
- Trial extension for technical issues

---

## 🎯 **Implementation Summary**

### **✅ What's Been Implemented:**
- ✅ **Free Trial Support**: 7-day trial configuration
- ✅ **BNPL Integration**: Klarna, Afterpay, Affirm support
- ✅ **Dynamic Payment Types**: Full, Trial, Installments options
- ✅ **Webhook Handling**: Trial and BNPL event processing
- ✅ **User Experience**: Clear payment type selection

### **🚀 Next Steps:**
1. **Test Trial Flow**: Start free trial, verify 7-day period
2. **Test BNPL Flow**: Try installment payments
3. **Monitor Conversions**: Track trial → paid conversion rates
4. **Optimize UX**: A/B test different payment options
5. **Scale Up**: Add more BNPL providers as needed

### **💡 Pro Tips:**
- **Start with Trials**: Higher conversion than BNPL
- **Monitor Analytics**: Track what works best
- **Compliance First**: Follow BNPL regulations
- **User Education**: Clear terms for trials and BNPL

**🎉 Your Stripe integration now supports both Free Trials and Buy Now Pay Later options!** 🚀

---

**🎉 Your Stripe billing integration is now ready! Users can subscribe to Plus/Pro plans with full Apple Pay support.**
