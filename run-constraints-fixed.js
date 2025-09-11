const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

console.log('🔧 Starting database constraints script...')

async function runConstraintsScript() {
  console.log('🔍 Checking DATABASE_URL...')
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  console.log('✅ DATABASE_URL found')

  console.log('🔌 Creating database connection...')
  const sql = postgres(process.env.DATABASE_URL, { prepare: false })

  try {
    console.log('🚀 Running database constraints script...')
    
    // Read the SQL file and execute as one statement since it has DO blocks
    const sqlPath = path.join(__dirname, 'add-constraints-final.sql')
    console.log('📄 Reading SQL file:', sqlPath)
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log('📝 SQL file loaded, length:', sqlContent.length, 'characters')
    
    console.log('⚡ Executing SQL script with DO blocks')
    
    try {
      const result = await sql.unsafe(sqlContent)
      console.log('✅ SQL script executed successfully')
      console.log('📊 Result type:', typeof result)
      console.log('📊 Result:', result)
    } catch (error) {
      console.error(`❌ SQL Error: ${error.message}`)
      console.error('💥 Full error:', error)
      throw error
    }
    
    console.log('\n🎉 Database constraints script completed successfully!')
    
  } catch (error) {
    console.error('💥 Failed to run constraints script:', error.message)
    console.error('📋 Stack trace:', error.stack)
    process.exit(1)
  } finally {
    console.log('🔌 Closing database connection...')
    await sql.end()
    console.log('✅ Database connection closed')
  }
}

console.log('🎬 Calling runConstraintsScript...')
runConstraintsScript().catch(error => {
  console.error('💀 Unhandled error:', error)
  process.exit(1)
})
