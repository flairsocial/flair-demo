import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const stripe = getServerStripe()

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription']
    })

    // Verify the session belongs to the authenticated user
    if (session.metadata?.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to session' },
        { status: 403 }
      )
    }

    // Extract plan information from the session
    const lineItems = session.line_items?.data || []
    const plan = session.metadata?.plan || 'plus'

    return NextResponse.json({
      sessionId: session.id,
      plan: plan,
      amount: session.amount_total,
      currency: session.currency,
      status: session.status,
      customer_email: session.customer_details?.email,
      line_items: lineItems.map(item => ({
        price_id: item.price?.id,
        quantity: item.quantity,
        amount: item.amount_total
      }))
    })
  } catch (error) {
    console.error('Error retrieving session:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}
