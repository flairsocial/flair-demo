// Test the actual database service functions used by the API
require('dotenv').config({ path: '.env.local' })

// Import the actual functions from the service
async function testDatabaseService() {
  console.log('🧪 Testing database service functions...\n')

  try {
    // Import the database service functions
    const { 
      addItemToCollection, 
      removeItemFromCollection, 
      getCollections,
      getSavedItems 
    } = await import('./lib/database-service-v2.js')

    // Test with a known user
    const testClerkId = 'user_32n6ZEkwzPPj2HRuq0rilBOxwYD' // jenny
    
    console.log(`🎯 Testing with clerk_id: ${testClerkId}`)
    
    // 1. Get collections
    console.log('\n📁 Getting collections...')
    const collections = await getCollections(testClerkId)
    console.log(`Found ${collections.length} collections:`)
    collections.forEach(collection => {
      console.log(`  - ${collection.name}: ${collection.itemIds?.length || 0} items`)
    })

    // 2. Get saved items
    console.log('\n💾 Getting saved items...')
    const savedItems = await getSavedItems(testClerkId)
    console.log(`Found ${savedItems.length} saved items:`)
    savedItems.slice(0, 3).forEach(item => {
      console.log(`  - ${item.title} (${item.id})`)
    })

    if (collections.length === 0 || savedItems.length === 0) {
      console.log('❌ Need collections and saved items to test')
      return
    }

    // 3. Test adding item to collection
    const testCollection = collections.find(c => c.itemIds?.length === 0) || collections[0]
    const testItem = savedItems[0]

    console.log(`\n🔄 Testing: Add "${testItem.title}" to "${testCollection.name}"`)
    console.log(`Collection ID: ${testCollection.id}`)
    console.log(`Item ID: ${testItem.id}`)

    try {
      await addItemToCollection(testClerkId, testItem.id, testCollection.id)
      console.log('✅ addItemToCollection completed without error')
      
      // 4. Verify the addition
      console.log('\n🔍 Verifying addition...')
      const updatedCollections = await getCollections(testClerkId)
      const updatedCollection = updatedCollections.find(c => c.id === testCollection.id)
      
      if (updatedCollection) {
        console.log(`Updated collection "${updatedCollection.name}":`)
        console.log(`  - Item count: ${updatedCollection.itemIds?.length || 0}`)
        console.log(`  - Item IDs: [${updatedCollection.itemIds?.join(', ') || ''}]`)
        
        if (updatedCollection.itemIds?.includes(testItem.id)) {
          console.log('✅ Item successfully added to collection')
          
          // 5. Test removal
          console.log('\n🗑️ Testing removal...')
          await removeItemFromCollection(testClerkId, testItem.id, testCollection.id)
          console.log('✅ removeItemFromCollection completed without error')
          
          // Verify removal
          const finalCollections = await getCollections(testClerkId)
          const finalCollection = finalCollections.find(c => c.id === testCollection.id)
          
          if (finalCollection) {
            console.log(`Final collection "${finalCollection.name}":`)
            console.log(`  - Item count: ${finalCollection.itemIds?.length || 0}`)
            console.log(`  - Item IDs: [${finalCollection.itemIds?.join(', ') || ''}]`)
            
            if (!finalCollection.itemIds?.includes(testItem.id)) {
              console.log('✅ Item successfully removed from collection')
            } else {
              console.log('❌ Item was not removed from collection')
            }
          }
        } else {
          console.log('❌ Item was not added to collection')
        }
      }
      
    } catch (error) {
      console.error('❌ Error in addItemToCollection:', error)
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testDatabaseService().then(() => {
  console.log('\n🏁 Database service test completed')
  process.exit(0)
})