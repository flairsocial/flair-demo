// Debug script to test collection items functionality
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function debugCollectionItems() {
  console.log('🔍 Starting collection items debug...\n')

  try {
    // 1. Check profiles table
    console.log('1. Checking profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, clerk_id, username')
      .limit(5)
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }
    
    console.log(`✅ Found ${profiles.length} profiles`)
    if (profiles.length > 0) {
      console.log('First profile:', profiles[0])
    }

    // 2. Check saved_items table
    console.log('\n2. Checking saved_items...')
    const { data: savedItems, error: savedItemsError } = await supabase
      .from('saved_items')
      .select('id, profile_id, product_id, product_data')
      .limit(5)
    
    if (savedItemsError) {
      console.error('❌ Error fetching saved_items:', savedItemsError)
      return
    }
    
    console.log(`✅ Found ${savedItems.length} saved items`)
    if (savedItems.length > 0) {
      console.log('First saved item:', {
        id: savedItems[0].id,
        profile_id: savedItems[0].profile_id,
        product_id: savedItems[0].product_id,
        product_title: savedItems[0].product_data?.title
      })
    }

    // 3. Check collections table
    console.log('\n3. Checking collections...')
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, profile_id, name, item_ids, item_count')
    
    if (collectionsError) {
      console.error('❌ Error fetching collections:', collectionsError)
      return
    }
    
    console.log(`✅ Found ${collections.length} collections`)
    collections.forEach(collection => {
      console.log(`Collection "${collection.name}":`, {
        id: collection.id,
        profile_id: collection.profile_id,
        item_ids: collection.item_ids,
        item_count: collection.item_count
      })
    })

    // 4. Test collection item resolution
    console.log('\n4. Testing collection item resolution...')
    for (const collection of collections) {
      if (collection.item_ids && collection.item_ids.length > 0) {
        console.log(`\nTesting collection "${collection.name}" with ${collection.item_ids.length} item_ids:`)
        console.log('Item IDs:', collection.item_ids)
        
        // Try to find matching saved items
        const { data: matchingItems, error: matchingError } = await supabase
          .from('saved_items')
          .select('id, product_id, product_data')
          .eq('profile_id', collection.profile_id)
          .in('product_id', collection.item_ids)
        
        if (matchingError) {
          console.error('❌ Error finding matching items:', matchingError)
        } else {
          console.log(`✅ Found ${matchingItems.length} matching saved items out of ${collection.item_ids.length} expected`)
          matchingItems.forEach(item => {
            console.log(`  - ${item.product_id}: ${item.product_data?.title}`)
          })
          
          if (matchingItems.length !== collection.item_ids.length) {
            console.log('⚠️  MISMATCH: Collection item_ids and saved_items don\'t match!')
            console.log('Missing items:')
            const foundIds = matchingItems.map(item => item.product_id)
            collection.item_ids.forEach(itemId => {
              if (!foundIds.includes(itemId)) {
                console.log(`  - Missing: ${itemId}`)
              }
            })
          }
        }
      }
    }

    // 5. Test the current API logic
    console.log('\n5. Testing current API logic...')
    if (collections.length > 0 && savedItems.length > 0) {
      const testCollection = collections[0]
      console.log(`Testing with collection: ${testCollection.name}`)
      
      // Simulate the current API logic from [id]/route.ts
      const { data: collectionSavedItems, error: apiTestError } = await supabase
        .from('saved_items')
        .select('product_data')
        .eq('profile_id', testCollection.profile_id)
      
      if (apiTestError) {
        console.error('❌ API test error:', apiTestError)
      } else {
        console.log(`✅ Found ${collectionSavedItems.length} saved items for profile`)
        
        let collectionItems = []
        if (testCollection.item_ids && testCollection.item_ids.length > 0) {
          collectionItems = collectionSavedItems
            .filter(item => testCollection.item_ids.includes(item.product_data.id))
            .map(item => item.product_data)
        }
        
        console.log(`✅ Filtered down to ${collectionItems.length} collection items`)
        console.log('Items found:', collectionItems.map(item => item.title))
      }
    }

  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

// Run the debug
debugCollectionItems().then(() => {
  console.log('\n🏁 Debug completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})