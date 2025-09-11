import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as fs from "fs"
import * as path from "path"

// Load environment variables FIRST
require('dotenv').config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

async function runConstraintsScript() {
  const connectionString = process.env.DATABASE_URL!
  const client = postgres(connectionString, { prepare: false })
  
  try {
    console.log('🚀 Running database constraints script...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-constraints.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Split by semicolons and run each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}:`)
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''))
      
      try {
        const result = await client.unsafe(statement)
        if (Array.isArray(result)) {
          console.log(`✅ Success: ${result.length} row(s) affected`)
        } else {
          console.log(`✅ Success: Statement executed`)
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Warning: Constraint already exists (skipping)`)
        } else {
          console.error(`❌ Error: ${error.message}`)
          throw error
        }
      }
    }
    
    console.log('\n🎉 Database constraints script completed successfully!')
    
  } catch (error) {
    console.error('💥 Failed to run constraints script:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runConstraintsScript()
