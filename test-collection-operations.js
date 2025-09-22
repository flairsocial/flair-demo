// Test adding and removing items from collections
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testCollectionOperations() {
  console.log('🧪 Testing collection item operations...\n')

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Find a collection that currently has 0 items
    const { data: emptyCollections } = await supabase
      .from('collections')
      .select('id, name, item_ids, item_count, profile_id')
      .eq('item_count', 0)
      .limit(1)

    if (!emptyCollections || emptyCollections.length === 0) {
      console.log('❌ No empty collections found to test with')
      return
    }

    const testCollection = emptyCollections[0]
    console.log(`🎯 Testing with collection: ${testCollection.name} (${testCollection.id})`)

    // 2. Find a saved item to add
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .eq('profile_id', testCollection.profile_id)
      .limit(1)

    if (!savedItems || savedItems.length === 0) {
      console.log('❌ No saved items found for this profile to test with')
      return
    }

    const testItem = savedItems[0]
    console.log(`📦 Test item: ${testItem.product_data.title} (ID: ${testItem.product_id})`)

    // 3. Simulate adding item to collection (direct database operation)
    console.log('\n--- Testing Add Item ---')
    
    const { data: beforeAdd, error: beforeError } = await supabase
      .from('collections')
      .select('item_ids, item_count')
      .eq('id', testCollection.id)
      .single()

    console.log('Before add:', beforeAdd)

    const newItemIds = [...(beforeAdd.item_ids || []), testItem.product_id]
    
    const { error: addError } = await supabase
      .from('collections')
      .update({ 
        item_ids: newItemIds,
        item_count: newItemIds.length
      })
      .eq('id', testCollection.id)

    if (addError) {
      console.error('❌ Error adding item:', addError)
    } else {
      console.log('✅ Item added successfully')
      
      // Verify the add
      const { data: afterAdd } = await supabase
        .from('collections')
        .select('item_ids, item_count')
        .eq('id', testCollection.id)
        .single()
      
      console.log('After add:', afterAdd)

      // 4. Test fetching collection with items
      console.log('\n--- Testing Item Retrieval ---')
      const { data: collectionItems, error: retrieveError } = await supabase
        .from('saved_items')
        .select('product_id, product_data')
        .eq('profile_id', testCollection.profile_id)
        .in('product_id', afterAdd.item_ids || [])

      if (retrieveError) {
        console.error('❌ Error retrieving items:', retrieveError)
      } else {
        console.log(`✅ Retrieved ${collectionItems.length} items:`)
        collectionItems.forEach(item => {
          console.log(`  - ${item.product_data.title} (${item.product_id})`)
        })
      }

      // 5. Test removing item
      console.log('\n--- Testing Remove Item ---')
      const updatedItemIds = afterAdd.item_ids.filter(id => id !== testItem.product_id)
      
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
        console.log('✅ Item removed successfully')
        
        // Verify the removal
        const { data: afterRemove } = await supabase
          .from('collections')
          .select('item_ids, item_count')
          .eq('id', testCollection.id)
          .single()
        
        console.log('After remove:', afterRemove)
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testCollectionOperations().then(() => {
  console.log('\n🏁 Test completed')
  process.exit(0)
})