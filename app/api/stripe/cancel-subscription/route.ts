import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'
import { auth } from '@clerk/nextjs/server'
import { SubscriptionService } from '@/lib/subscription-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { subscriptionId, cancelAtPeriodEnd = true } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    const stripe = getServerStripe()

    // Cancel the subscription
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    })

    // Update user's subscription status in database
    await SubscriptionService.updateSubscriptionStatus(userId, false)

    console.log(`Successfully canceled subscription ${subscriptionId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      subscription: canceledSubscription,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the current billing period'
        : 'Subscription canceled immediately'
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
