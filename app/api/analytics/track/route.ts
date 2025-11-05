import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateProfile } from '@/lib/database-service-v2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      action,
      product_id,
      impression_id,
      session_id,
      dwell_time,
      payload = {},
      anonymous_id,
    } = body

    // Support both authenticated and anonymous users
    const { userId } = await auth()
    let profileId: string | null = null

    if (userId) {
      profileId = await getOrCreateProfile(userId)
    } else if (!anonymous_id) {
      return NextResponse.json(
        { error: 'Missing anonymous_id or authentication' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = [
      'view',
      'click',
      'save',
      'unsave',
      'like',
      'share',
      'chat_open',
      'chat_message',
    ]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      )
    }

    // Insert event
    const eventResult = await supabase.from('user_events').insert({
      profile_id: profileId || null,
      anonymous_id: anonymous_id || null,
      session_id,
      impression_id,
      product_id,
      action,
      dwell_time_seconds: dwell_time,
      payload,
      created_at: new Date().toISOString(),
    })

    if (eventResult.error) throw eventResult.error

    // Update session activity
    if (session_id) {
      await supabase
        .from('sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('session_id', session_id)
    }

    // If save or unsave, update saved_items
    if ((action === 'save' || action === 'unsave') && product_id) {
      if (action === 'save') {
        // Check if already saved
        const existing = await supabase
          .from('saved_items')
          .select('id')
          .eq('profile_id', profileId)
          .eq('product_id', product_id)
          .maybeSingle()

        if (!existing.data) {
          await supabase.from('saved_items').insert({
            profile_id: profileId,
            product_id,
            product_data: payload.product_data || {},
            saved_at: new Date().toISOString(),
          })
        }
      } else if (action === 'unsave') {
        await supabase
          .from('saved_items')
          .delete()
          .eq('profile_id', profileId)
          .eq('product_id', product_id)
      }
    }

    // Update recommendation performance
    if (impression_id && product_id && profileId) {
      const perfResult = await supabase
        .from('recommendation_performance')
        .select('*')
        .eq('profile_id', profileId)
        .eq('product_id', product_id)
        .maybeSingle()

      if (perfResult.data) {
        await supabase
          .from('recommendation_performance')
          .update({
            action: mapEventToAction(action),
            created_at: new Date().toISOString(),
          })
          .eq('id', perfResult.data.id)
      }
    }

    // Update preference cache if chat signal
    if (action === 'chat_message' && payload.chat_text && product_id) {
      const keywords = extractKeywordsFromChat(payload.chat_text)
      if (keywords.length > 0) {
        const prefResult = await supabase
          .from('user_preference_cache')
          .select('chat_keywords')
          .eq('profile_id', profileId)
          .maybeSingle()

        const existingKeywords = prefResult.data?.chat_keywords || []
        const updated = Array.from(
          new Set([...existingKeywords, ...keywords])
        ).slice(-10) // Keep last 10

        await supabase
          .from('user_preference_cache')
          .upsert(
            {
              profile_id: profileId,
              chat_keywords: updated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'profile_id' }
          )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics track error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

function mapEventToAction(event: string): string {
  switch (event) {
    case 'click':
      return 'clicked'
    case 'save':
      return 'saved'
    case 'unsave':
      return 'unsaved'
    case 'like':
      return 'liked'
    case 'share':
      return 'shared'
    case 'chat_open':
      return 'chat_opened'
    case 'chat_message':
      return 'chat_messaged'
    default:
      return event
  }
}

function extractKeywordsFromChat(text: string): string[] {
  // Simple keyword extraction: capitalize words, remove stop words
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'from',
    'with',
    'by',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'what',
    'which',
    'who',
    'where',
    'when',
    'why',
    'how',
  ])

  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  return Array.from(new Set(words)).slice(0, 5)
}
