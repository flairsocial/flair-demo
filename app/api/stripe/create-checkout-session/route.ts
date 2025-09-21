import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe, SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { plan, billingCycle = 'monthly', paymentType = 'full' } = await request.json()

    if (!plan || !['plus', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      )
    }

    if (!['full', 'trial', 'installments'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      )
    }

    const stripe = getServerStripe()
    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]

    if (!planConfig) {
      return NextResponse.json(
        { error: 'Plan configuration not found' },
        { status: 400 }
      )
    }

    const priceId = planConfig.priceIds[billingCycle as keyof typeof planConfig.priceIds]

    // Create or retrieve customer
    let customer
    try {
      // Try to find existing customer by metadata first
      const customers = await stripe.customers.list({
        limit: 100, // Increase limit to search through customers
      })

      // Look for customer with matching Clerk user ID
      customer = customers.data.find(cust =>
        cust.metadata?.clerkUserId === userId
      )

      if (!customer) {
        // Create new customer with a valid email format
        customer = await stripe.customers.create({
          email: `user-${userId}@flairsocial.local`, // Use a valid email format ???????????????????
          name: `FlairSocial User ${userId.slice(-8)}`, // Add a name for better UX
          metadata: {
            clerkUserId: userId,
            source: 'flairsocial_checkout',
          },
        })
        console.log('Created new Stripe customer:', customer.id)
      } else {
        console.log('Found existing Stripe customer:', customer.id)
      }
    } catch (error: any) {
      console.error('Error creating/retrieving customer:', error)
      return NextResponse.json(
        {
          error: 'Failed to create customer',
          details: error.message,
          type: error.type
        },
        { status: 500 }
      )
    }

    // Configure payment methods based on payment type
    let paymentMethodTypes: string[] = ['card']

    if (paymentType === 'installments') {
      // Add BNPL providers
      paymentMethodTypes = [
        'card',
        'afterpay_clearpay', // Clearpay/Afterpay
        'klarna',            // Klarna
        'affirm',            // Affirm
      ]
    }

    // Configure subscription data
    const subscriptionData: any = {
      metadata: {
        clerkUserId: userId,
        plan: plan,
        billingCycle: billingCycle,
        paymentType: paymentType,
      },
    }

    // Add trial period for trial payment type
    if (paymentType === 'trial') {
      subscriptionData.trial_period_days = 7 // 7-day free trial
      subscriptionData.metadata.trial = 'true'
    }

    // Create checkout session
    const sessionParams: any = {
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}&payment_type=${paymentType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      allow_promotion_codes: true,
      customer: customer.id,
      metadata: {
        clerkUserId: userId,
        plan: plan,
        billingCycle: billingCycle,
        paymentType: paymentType,
      },
      subscription_data: subscriptionData,
    }

    // Add payment method options for BNPL
    if (paymentType === 'installments') {
      sessionParams.payment_method_options = {
        klarna: {
          preferred_locale: 'en-US',
        },
        afterpay_clearpay: {
          preferred_locale: 'en-US',
        },
        affirm: {
          preferred_locale: 'en-US',
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
