import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { getOrCreateProfile } from '@/lib/database-service-v2'

export async function POST(request: NextRequest) {
  try {
    // Get the webhook secret from environment variables
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Get the headers
    const headersList = await headers()
    const svixId = headersList.get('svix-id')
    const svixTimestamp = headersList.get('svix-timestamp')
    const svixSignature = headersList.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    // Get the raw body
    const body = await request.text()

    // Verify the webhook
    const wh = new Webhook(webhookSecret)
    let evt: any

    try {
      evt = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
    }

    // Handle the webhook event
    const eventType = evt.type
    const data = evt.data

    console.log(`[Clerk Webhook] Received event: ${eventType}`)

    // Handle user creation events
    if (eventType === 'user.created') {
      const clerkId = data.id

      if (!clerkId) {
        console.error('[Clerk Webhook] No clerk_id in user.created event')
        return NextResponse.json({ error: 'Missing clerk_id' }, { status: 400 })
      }

      console.log(`[Clerk Webhook] Creating profile for new user: ${clerkId}`)

      try {
        // Create profile for the new user
        const profileId = await getOrCreateProfile(clerkId)
        console.log(`[Clerk Webhook] Successfully created profile ${profileId} for user ${clerkId}`)
      } catch (error) {
        console.error(`[Clerk Webhook] Failed to create profile for user ${clerkId}:`, error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    }

    // Handle other events if needed in the future
    // if (eventType === 'user.updated') {
    //   // Handle user updates
    // }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Clerk Webhook] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
