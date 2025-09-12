import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if direct_messages tables exist in public schema
    const { data: dmTables, error: dmTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['direct_conversations', 'direct_messages'])

    if (dmTablesError) {
      console.error('DM tables check error:', dmTablesError)
    }

    // Check tables in direct_messages schema
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'direct_messages')

    if (tableError) {
      console.error('Table check error:', tableError)
    }

    // Check public schema tables
    const { data: publicTables, error: publicError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (publicError) {
      console.error('Public table check error:', publicError)
    }

    return NextResponse.json({
      directMessagesTables: dmTables || [],
      dmTablesError: dmTablesError?.message || null,
      directMessagesTablesFound: dmTables?.length || 0,
      allTables: tables || [],
      tableError: tableError?.message || null,
      publicTables: publicTables || [],
      publicError: publicError?.message || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database debug error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
