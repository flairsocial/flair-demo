// Test the complete add-to-collection workflow
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAddToCollectionWorkflow() {
  console.log('🧪 Testing complete add-to-collection workflow...\n')

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Find a user and their collections
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, clerk_id, username')
      .limit(1)

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found')
      return
    }

    const testProfile = profiles[0]
    console.log(`🎯 Testing with profile: ${testProfile.username} (${testProfile.clerk_id})`)

    // 2. Get collections for this user
    const { data: collections } = await supabase
      .from('collections')
      .select('id, name, item_ids, item_count')
      .eq('profile_id', testProfile.id)
      .limit(3)

    console.log(`📁 Found ${collections?.length || 0} collections:`)
    collections?.forEach(collection => {
      console.log(`  - ${collection.name}: ${collection.item_count} items`)
    })

    // 3. Find saved items for this user
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .eq('profile_id', testProfile.id)
      .limit(5)

    console.log(`\n💾 Found ${savedItems?.length || 0} saved items:`)
    savedItems?.forEach(item => {
      console.log(`  - ${item.product_data.title} (${item.product_id})`)
    })

    if (!collections || !savedItems || collections.length === 0 || savedItems.length === 0) {
      console.log('❌ Need collections and saved items to test')
      return
    }

    // 4. Simulate the API call that happens when user adds item to collection
    const testCollection = collections[0]
    const testItem = savedItems[0]

    console.log(`\n🔄 Testing: Add "${testItem.product_data.title}" to "${testCollection.name}"`)

    // Check current collection state
    console.log('Before add:')
    console.log(`  Collection item_ids: [${testCollection.item_ids?.join(', ') || ''}]`)
    console.log(`  Collection item_count: ${testCollection.item_count}`)

    // Only add if not already in collection
    if (!testCollection.item_ids?.includes(testItem.product_id)) {
      const newItemIds = [...(testCollection.item_ids || []), testItem.product_id]
      
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          item_ids: newItemIds,
          item_count: newItemIds.length
        })
        .eq('id', testCollection.id)

      if (updateError) {
        console.error('❌ Error updating collection:', updateError)
      } else {
        console.log('✅ Successfully added item to collection')
        
        // Verify the update
        const { data: updatedCollection } = await supabase
          .from('collections')
          .select('item_ids, item_count')
          .eq('id', testCollection.id)
          .single()

        console.log('After add:')
        console.log(`  Collection item_ids: [${updatedCollection.item_ids?.join(', ') || ''}]`)
        console.log(`  Collection item_count: ${updatedCollection.item_count}`)

        // 5. Test retrieval (simulate the fixed API)
        console.log('\n🔍 Testing item retrieval with fixed API logic:')
        
        const { data: retrievedItems } = await supabase
          .from('saved_items')
          .select('product_id, product_data')
          .eq('profile_id', testProfile.id)
          .in('product_id', updatedCollection.item_ids || [])

        console.log(`✅ Retrieved ${retrievedItems?.length || 0} items:`)
        retrievedItems?.forEach(item => {
          console.log(`  - ${item.product_data.title} (${item.product_id})`)
        })

        // 6. Test removal
        console.log('\n🗑️ Testing item removal:')
        const updatedItemIds = updatedCollection.item_ids.filter(id => id !== testItem.product_id)
        
        const { error: removeError } = await supabase
          .from('collections')
          .update({ 
            item_ids: updatedItemIds,
            item_count: updatedItemIds.length
          })
          .eq('id', testCollection.id)

        if (removeError) {
          console.error('❌ Error removing item:', removeError)
        } else {
          console.log('✅ Successfully removed item from collection')
          
          const { data: finalCollection } = await supabase
            .from('collections')
            .select('item_ids, item_count')
            .eq('id', testCollection.id)
            .single()

          console.log('After removal:')
          console.log(`  Collection item_ids: [${finalCollection.item_ids?.join(', ') || ''}]`)
          console.log(`  Collection item_count: ${finalCollection.item_count}`)
        }
      }
    } else {
      console.log('⚠️ Item already in collection, skipping add test')
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testAddToCollectionWorkflow().then(() => {
  console.log('\n🏁 Workflow test completed')
  process.exit(0)
})