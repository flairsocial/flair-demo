import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function applyDirectMessagesSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('Reading schema file...')
    const schemaPath = path.join(process.cwd(), 'direct-messages-schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('Schema content:', schemaSql.substring(0, 200) + '...')

    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}:`, statement.substring(0, 100) + '...')
        
        const { data, error } = await supabase.from('').select('').limit(0) // This will fail but we need the client
        // Use raw SQL execution instead
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: statement + ';' })
        })

        if (!result.ok) {
          console.error(`Error executing statement ${i + 1}:`, await result.text())
        } else {
          console.log(`Statement ${i + 1} executed successfully`)
        }
      }
    }

    console.log('Schema application completed')

  } catch (error) {
    console.error('Error applying schema:', error)
  }
}

// Run the function
applyDirectMessagesSchema().then(() => {
  console.log('Done')
  process.exit(0)
}).catch(error => {
  console.error('Failed:', error)
  process.exit(1)
})
