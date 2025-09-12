import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if direct_messages tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (error) {
      console.error('Error checking tables:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tableNames = tables.map(t => t.table_name)
    const hasDirectConversations = tableNames.includes('direct_conversations')
    const hasDirectMessages = tableNames.includes('direct_messages')

    return NextResponse.json({
      allTables: tableNames,
      hasDirectConversations,
      hasDirectMessages,
      missingTables: {
        direct_conversations: !hasDirectConversations,
        direct_messages: !hasDirectMessages
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database check error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
