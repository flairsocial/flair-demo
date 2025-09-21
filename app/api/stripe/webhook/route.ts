import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'
import { SubscriptionService } from '@/lib/subscription-service'
import { headers } from 'next/headers'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig || !endpointSecret) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    const stripe = getServerStripe()

    let event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    const clerkUserId = session.metadata?.clerkUserId
    const plan = session.metadata?.plan

    if (!clerkUserId || !plan) {
      console.error('Missing metadata in checkout session:', session.id)
      return
    }

    console.log(`Processing completed checkout for user ${clerkUserId}, plan: ${plan}`)

    // Update user's subscription status in database
    await SubscriptionService.updateSubscriptionStatus(clerkUserId, plan === 'pro')

    // Update user's plan in credit context (this will be handled by the credit context when they refresh)
    console.log(`Successfully processed subscription for user ${clerkUserId}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    const subscriptionId = invoice.subscription
    const customerId = invoice.customer

    console.log(`Payment succeeded for subscription ${subscriptionId}, customer ${customerId}`)

    // You can add additional logic here for successful payments
    // For example, sending confirmation emails, updating usage limits, etc.
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    const subscriptionId = invoice.subscription
    const customerId = invoice.customer

    console.log(`Payment failed for subscription ${subscriptionId}, customer ${customerId}`)

    // You can add logic here to handle failed payments
    // For example, sending payment failure notifications, downgrading plans, etc.
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const clerkUserId = subscription.metadata?.clerkUserId
    const plan = subscription.metadata?.plan

    if (!clerkUserId) {
      console.error('Missing clerkUserId in subscription metadata')
      return
    }

    console.log(`Subscription updated for user ${clerkUserId}, status: ${subscription.status}`)

    // Handle different subscription statuses
    switch (subscription.status) {
      case 'active':
        // Subscription is active
        await SubscriptionService.updateSubscriptionStatus(clerkUserId, plan === 'pro')
        break

      case 'canceled':
      case 'incomplete_expired':
        // Subscription ended or failed
        await SubscriptionService.updateSubscriptionStatus(clerkUserId, false)
        break

      case 'past_due':
        // Payment failed, subscription is past due
        console.log(`Subscription past due for user ${clerkUserId}`)
        break

      default:
        console.log(`Unhandled subscription status: ${subscription.status}`)
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const clerkUserId = subscription.metadata?.clerkUserId

    if (!clerkUserId) {
      console.error('Missing clerkUserId in subscription metadata')
      return
    }

    console.log(`Subscription deleted for user ${clerkUserId}`)

    // Remove subscription benefits
    await SubscriptionService.updateSubscriptionStatus(clerkUserId, false)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}
