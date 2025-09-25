import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (existingProfile) {
    return existingProfile.id
  }

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Database error: ${selectError.message}`)
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      profile_picture_url: null,
      is_public: true,
      data: {},
      created_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`Failed to create profile: ${insertError.message}`)
  }

  return newProfile.id
}

export { supabase }
