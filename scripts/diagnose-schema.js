const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseSchema() {
  console.log('🔍 Diagnosing database schema...\n')
  
  try {
    // Check chat_messages table structure
    const { data: chatMessagesInfo, error: chatError } = await supabase
      .rpc('get_table_info', { table_name: 'chat_messages' })
      .single()
    
    if (chatError) {
      console.log('⚠️  Could not get chat_messages schema via RPC, trying manual query...')
      
      // Try a simple query to see what columns exist
      const { data: testData, error: testError } = await supabase
        .from('chat_messages')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.error('❌ Error querying chat_messages:', testError.message)
        
        // Try to see what columns the error mentions
        if (testError.message.includes('column')) {
          console.log('🔍 Error suggests column issues. Let\'s check what columns exist...')
        }
      } else {
        console.log('✅ chat_messages table can be queried')
        if (testData && testData.length > 0) {
          console.log('📋 Available columns in chat_messages:', Object.keys(testData[0]))
        } else {
          console.log('📋 chat_messages table exists but is empty')
        }
      }
    }

    // Test specific problematic queries
    console.log('\n🧪 Testing specific queries that are failing...\n')

    // Test 1: Check if chat_id column exists
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('chat_id')
        .limit(1)
      
      if (error) {
        console.log('❌ chat_id column does NOT exist:', error.message)
      } else {
        console.log('✅ chat_id column exists')
      }
    } catch (e) {
      console.log('❌ chat_id column test failed:', e.message)
    }

    // Test 2: Check if chat_history_id column exists
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('chat_history_id')
        .limit(1)
      
      if (error) {
        console.log('❌ chat_history_id column does NOT exist:', error.message)
      } else {
        console.log('✅ chat_history_id column exists')
      }
    } catch (e) {
      console.log('❌ chat_history_id column test failed:', e.message)
    }

    // Test 3: Check if attached_files column exists
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('attached_files')
        .limit(1)
      
      if (error) {
        console.log('❌ attached_files column does NOT exist:', error.message)
      } else {
        console.log('✅ attached_files column exists')
      }
    } catch (e) {
      console.log('❌ attached_files column test failed:', e.message)
    }

    // Test 4: Check if products column exists
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('products')
        .limit(1)
      
      if (error) {
        console.log('❌ products column does NOT exist:', error.message)
      } else {
        console.log('✅ products column exists')
      }
    } catch (e) {
      console.log('❌ products column test failed:', e.message)
    }

    console.log('\n📊 Summary: You need to run the migration script to fix the schema issues.')
    
  } catch (error) {
    console.error('Database connection error:', error)
  }
}

diagnoseSchema()
