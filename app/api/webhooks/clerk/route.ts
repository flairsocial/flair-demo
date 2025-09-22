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

        // Check if user has a pending invite code (stored during invite link click)
        const pendingInviteCode = data.public_metadata?.pendingInviteCode || data.private_metadata?.inviteCode || data.unsafe_metadata?.inviteCode
        if (pendingInviteCode) {
          console.log(`[Clerk Webhook] Processing pending invite code: ${pendingInviteCode}`)
          console.log(`[Clerk Webhook] Available metadata:`, {
            public: data.public_metadata,
            private: data.private_metadata,
            unsafe: data.unsafe_metadata
          })

          try {
            // Import supabase client
            const { createClient } = await import('@supabase/supabase-js')
            const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            })

            // For user-based invites, the invite code IS the referrer's user ID
            // Validate that it's a valid user ID and exists
            if (pendingInviteCode.startsWith('user_')) {
              // Check if referrer exists
              const { data: referrerData, error: referrerError } = await supabase
                .from('profiles')
                .select('id, clerk_id')
                .eq('clerk_id', pendingInviteCode)
                .single()

              if (!referrerError && referrerData && referrerData.id !== profileId) {
                // Update new user's profile with referrer
                await supabase
                  .from('profiles')
                  .update({ referred_by: referrerData.id })
                  .eq('id', profileId)

                console.log(`[Clerk Webhook] Successfully processed invite: ${referrerData.id} referred ${profileId}`)

                // Award 100 credits to both referrer and new user
                // Since this is server-side, we need to handle credits differently
                // For now, we'll log this and the credits will be awarded client-side when users log in
                console.log(`[Clerk Webhook] Referral relationship established: referrer ${referrerData.id} -> new user ${profileId}`)

                // Note: Credits are awarded client-side via credit context when users access the app
                // This ensures proper credit limits and plan-based maximums are respected
              } else {
                console.log(`[Clerk Webhook] Invalid referrer or self-referral: ${pendingInviteCode}`, {
                  referrerError,
                  referrerData,
                  profileId
                })
              }
            } else {
              console.log(`[Clerk Webhook] Invalid invite code format: ${pendingInviteCode}`)
            }
          } catch (inviteError) {
            console.error('[Clerk Webhook] Error processing pending invite:', inviteError)
          }
        } else {
          console.log(`[Clerk Webhook] No invite code found in metadata`)
        }
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
