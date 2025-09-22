// Quick test to verify the collection data structure
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testDataStructure() {
  console.log('🔍 Testing collection data structure...\n')

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get a collection with items
    const { data: collection } = await supabase
      .from('collections')
      .select('*')
      .eq('id', 'col-1758058589608') // From our previous debug
      .single()

    console.log('Collection data:')
    console.log(JSON.stringify(collection, null, 2))

    // Get the saved items for this collection
    console.log('\n--- Testing fixed query ---')
    const { data: savedItems, error } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .eq('profile_id', collection.profile_id)
      .in('product_id', collection.item_ids || [])

    if (error) {
      console.error('Error:', error)
    } else {
      console.log(`Found ${savedItems.length} items:`)
      savedItems.forEach(item => {
        console.log(`- Product ID: ${item.product_id}`)
        console.log(`  Title: ${item.product_data?.title}`)
        console.log(`  Product Data ID: ${item.product_data?.id}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testDataStructure().then(() => {
  console.log('🏁 Done')
  process.exit(0)
})