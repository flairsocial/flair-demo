// Test the fixed collection API
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testCollectionAPI() {
  console.log('🧪 Testing fixed collection API...\n')

  try {
    // Find a collection with items
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: collections } = await supabase
      .from('collections')
      .select('id, name, item_ids, item_count, profile_id')
      .not('item_ids', 'is', null)
      .gt('item_count', 0)
      .limit(3)

    console.log('Collections with items:')
    collections?.forEach(collection => {
      console.log(`- ${collection.name} (${collection.id}): ${collection.item_count} items`)
    })

    if (collections && collections.length > 0) {
      const testCollection = collections[0]
      console.log(`\n🎯 Testing collection: ${testCollection.name} (${testCollection.id})`)

      // Test the API endpoint directly
      const apiUrl = `http://localhost:3000/api/collections/${testCollection.id}`
      console.log(`Calling: ${apiUrl}`)

      try {
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ API Response successful!`)
          console.log(`Items found: ${data.items?.length || 0}`)
          data.items?.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.title || item.name || 'Unknown Item'}`)
          })
        } else {
          console.log(`❌ API Error: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.log('Error response:', errorText)
        }
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError.message)
        console.log('Note: Make sure the Next.js development server is running')
      }
    } else {
      console.log('❌ No collections with items found to test')
    }

  } catch (error) {
    console.error('❌ Test script error:', error)
  }
}

testCollectionAPI().then(() => {
  console.log('\n🏁 Test completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})