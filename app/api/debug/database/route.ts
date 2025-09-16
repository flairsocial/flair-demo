import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[Debug] Checking database tables...')

    // Check if core tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'collections', 'saved_items', 'conversations', 'messages'])

    if (tablesError) {
      console.error('[Debug] Error checking tables:', tablesError)
      return NextResponse.json({ error: "Failed to check tables", details: tablesError }, { status: 500 })
    }

    const existingTables = tables?.map(t => t.table_name) || []
    console.log('[Debug] Existing tables:', existingTables)

    // Check collections table structure if it exists
    let collectionsStructure = null
    if (existingTables.includes('collections')) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'collections')
        .order('ordinal_position')

      if (!columnsError) {
        collectionsStructure = columns
      }
    }

    // Test a simple collections query
    let collectionsTest = null
    try {
      const { data: testData, error: testError } = await supabase
        .from('collections')
        .select('count')
        .limit(1)
      
      if (testError) {
        collectionsTest = `Collections query error: ${testError.message}`
      } else {
        collectionsTest = 'Collections table accessible'
      }
    } catch (testErr) {
      collectionsTest = `Collections test exception: ${testErr}`
    }

    // Check profiles with collections
    let profilesWithCollections = null
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('clerk_id, id')
        .limit(10)
      
      if (profileError) {
        profilesWithCollections = `Profiles query error: ${profileError.message}`
      } else {
        // For each profile, try to count their collections
        const profileCollectionCounts = []
        for (const profile of profileData || []) {
          try {
            const { count, error: countError } = await supabase
              .from('collections')
              .select('id', { count: 'exact' })
              .eq('profile_id', profile.id)
            
            profileCollectionCounts.push({
              clerk_id: profile.clerk_id,
              profile_id: profile.id,
              collections_count: countError ? `Error: ${countError.message}` : count
            })
          } catch (countErr) {
            profileCollectionCounts.push({
              clerk_id: profile.clerk_id,
              profile_id: profile.id,
              collections_count: `Exception: ${countErr}`
            })
          }
        }
        profilesWithCollections = profileCollectionCounts
      }
    } catch (profileErr) {
      profilesWithCollections = `Profiles test exception: ${profileErr}`
    }

    return NextResponse.json({
      status: 'Database debug completed',
      existing_tables: existingTables,
      collections_structure: collectionsStructure,
      collections_test: collectionsTest,
      profiles_with_collections: profilesWithCollections,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Debug] Database debug error:', error)
    return NextResponse.json({ 
      error: "Database debug failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
