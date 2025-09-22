import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to get or create profile
async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  // Try to get existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (existingProfile) {
    return existingProfile.id
  }

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch profile: ${selectError.message}`)
  }

  // Create new profile
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      profile_picture_url: null,
      is_public: true,
      data: {}
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      // Profile already exists, fetch it
      const { data: existingProfile, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', clerkId)
        .single()

      if (existingError || !existingProfile) {
        throw new Error(`Failed to fetch existing profile: ${existingError?.message}`)
      }

      return existingProfile.id
    }

    throw new Error(`Failed to create profile: ${insertError.message}`)
  }

  if (!newProfile) {
    throw new Error('Failed to create profile: No data returned')
  }

  return newProfile.id
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'stats') {
      // Get invite statistics for the user
      const profileId = await getOrCreateProfile(userId)

      // Get total invites sent (from invite_links table)
      const { count: totalInvites } = await supabase
        .from('invite_links')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', profileId)

      // Get successful signups (users who signed up via this referrer)
      const { count: successfulSignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', profileId)

      // Get credits earned from invites
      const creditsEarned = (successfulSignups || 0) * 100

      return NextResponse.json({
        totalInvites: totalInvites || 0,
        successfulSignups: successfulSignups || 0,
        creditsEarned
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Invite GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'generate'

    if (action === 'generate') {
      // Generate a new invite link
      const profileId = await getOrCreateProfile(userId)

      // Create or update invite link record
      const inviteCode = crypto.randomUUID()
      const inviteLink = `https://app.flair.social/invite/${inviteCode}`

      const { error } = await supabase
        .from('invite_links')
        .upsert({
          referrer_id: profileId,
          invite_code: inviteCode,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
        })

      if (error) {
        console.error('Error creating invite link:', error)
        return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
      }

      return NextResponse.json({ inviteLink })
    }

    if (action === 'process') {
      // Process an invite code for the current user
      const body = await request.json()
      const { inviteCode } = body

      if (!inviteCode) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
      }

      const profileId = await getOrCreateProfile(userId)

      // Check if user already has a referrer
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', profileId)
        .single()

      if (existingProfile?.referred_by) {
        return NextResponse.json({ error: 'You have already used an invite link' }, { status: 400 })
      }

      // Find the invite link
      const { data: inviteLink, error: inviteError } = await supabase
        .from('invite_links')
        .select('referrer_id')
        .eq('invite_code', inviteCode)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (inviteError || !inviteLink) {
        return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 })
      }

      // Prevent self-referral
      if (inviteLink.referrer_id === profileId) {
        return NextResponse.json({ error: 'You cannot use your own invite link' }, { status: 400 })
      }

      // Update user's profile with referrer
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referred_by: inviteLink.referrer_id })
        .eq('id', profileId)

      if (updateError) {
        console.error('Error updating profile with referrer:', updateError)
        return NextResponse.json({ error: 'Failed to process invite' }, { status: 500 })
      }

      // Award credits to both referrer and new user
      // Note: Credits are handled client-side via the credit context
      // The webhook will handle the actual credit awarding

      return NextResponse.json({
        message: 'Invite processed successfully! You and your friend both received 100 credits.'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Invite POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
