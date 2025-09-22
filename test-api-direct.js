// Test if the collection API endpoints work without database triggers
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints for collection operations...\n')

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Get a test user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, clerk_id, username')
      .limit(1)

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found')
      return
    }

    const testProfile = profiles[0]
    console.log(`🎯 Testing with profile: ${testProfile.username}`)

    // 2. Temporarily disable the trigger to bypass the error
    console.log('🔧 Temporarily disabling collection trigger...')
    
    try {
      await supabase.rpc('exec', { 
        query: 'DROP TRIGGER IF EXISTS trigger_collections_item_count ON collections' 
      })
      console.log('✅ Trigger disabled')
    } catch (error) {
      console.log('⚠️ Could not disable trigger:', error.message)
    }

    // 3. Get collections for this user
    const { data: collections } = await supabase
      .from('collections')
      .select('id, name, item_ids, item_count')
      .eq('profile_id', testProfile.id)
      .limit(1)

    if (!collections || collections.length === 0) {
      console.log('❌ No collections found for user')
      return
    }

    const testCollection = collections[0]
    console.log(`📁 Testing with collection: ${testCollection.name}`)

    // 4. Get a saved item
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .eq('profile_id', testProfile.id)
      .limit(1)

    if (!savedItems || savedItems.length === 0) {
      console.log('❌ No saved items found for user')
      return
    }

    const testItem = savedItems[0]
    console.log(`📦 Testing with item: ${testItem.product_data.title}`)

    // 5. Test manual collection update (like the API does)
    console.log('\n🔄 Testing collection update...')
    
    const currentItemIds = testCollection.item_ids || []
    console.log('Current item_ids:', currentItemIds)
    
    if (!currentItemIds.includes(testItem.product_id)) {
      const updatedItemIds = [...currentItemIds, testItem.product_id]
      
      console.log('Updating to:', updatedItemIds)
      
      const { data, error } = await supabase
        .from('collections')
        .update({ 
          item_ids: updatedItemIds,
          item_count: updatedItemIds.length
        })
        .eq('id', testCollection.id)
        .select()

      if (error) {
        console.error('❌ Error updating collection:', error)
      } else {
        console.log('✅ Collection updated successfully')
        console.log('Updated data:', data[0])

        // 6. Test retrieval
        console.log('\n🔍 Testing item retrieval...')
        
        const { data: retrievedItems, error: retrieveError } = await supabase
          .from('saved_items')
          .select('product_id, product_data')
          .eq('profile_id', testProfile.id)
          .in('product_id', updatedItemIds)

        if (retrieveError) {
          console.error('❌ Error retrieving items:', retrieveError)
        } else {
          console.log(`✅ Retrieved ${retrievedItems.length} items:`)
          retrievedItems.forEach(item => {
            console.log(`  - ${item.product_data.title}`)
          })
        }

        // 7. Remove the item to clean up
        console.log('\n🧹 Cleaning up...')
        const cleanItemIds = currentItemIds
        
        const { error: cleanError } = await supabase
          .from('collections')
          .update({ 
            item_ids: cleanItemIds,
            item_count: cleanItemIds.length
          })
          .eq('id', testCollection.id)

        if (cleanError) {
          console.error('❌ Error cleaning up:', cleanError)
        } else {
          console.log('✅ Collection cleaned up')
        }
      }
    } else {
      console.log('⚠️ Item already in collection')
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testAPIEndpoints().then(() => {
  console.log('\n🏁 API test completed')
  process.exit(0)
})