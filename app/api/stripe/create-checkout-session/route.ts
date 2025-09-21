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

    const { plan, billingCycle = 'monthly' } = await request.json()

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
      // Try to find existing customer
      const customers = await stripe.customers.list({
        email: `${userId}@clerk.dev`, // Using Clerk user ID as email for now
        limit: 1,
      })

      if (customers.data.length > 0) {
        customer = customers.data[0]
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: `${userId}@clerk.dev`,
          metadata: {
            clerkUserId: userId,
          },
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        clerkUserId: userId,
        plan: plan,
        billingCycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          plan: plan,
          billingCycle: billingCycle,
        },
      },
    })

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
