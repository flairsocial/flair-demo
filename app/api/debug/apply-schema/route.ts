import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Applying direct messages schema...')

    // Read and execute the schema
    const fs = require('fs')
    const path = require('path')
    const schemaPath = path.join(process.cwd(), 'direct-messages-schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')

    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSql })

    if (error) {
      console.error('Schema application error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('Schema applied successfully')

    return NextResponse.json({
      success: true,
      message: 'Direct messages schema applied successfully',
      data
    })

  } catch (error) {
    console.error('Apply schema error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
