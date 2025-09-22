// Test script to verify collection functionality is working
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCollections() {
  console.log('🧪 Testing Collection Functionality...\n');

  try {
    // Test 1: Get collections
    console.log('1. Testing GET /api/collections...');
    const collectionsResponse = await fetch(`${BASE_URL}/api/collections`);
    const collections = await collectionsResponse.json();
    console.log(`✅ Found ${collections.length} collections`);

    if (collections.length > 0) {
      const testCollection = collections[0];
      console.log(`📁 Testing with collection: ${testCollection.name} (${testCollection.id})`);

      // Test 2: Add item to collection
      console.log('\n2. Testing POST /api/collections (addItem)...');
      const addItemResponse = await fetch(`${BASE_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          itemId: 'test-product-123',
          collectionId: testCollection.id
        })
      });

      if (addItemResponse.ok) {
        console.log('✅ Successfully added item to collection');
      } else {
        console.log('❌ Failed to add item to collection:', await addItemResponse.text());
      }

      // Test 3: Get updated collection
      console.log('\n3. Testing GET /api/collections/[id]...');
      const collectionResponse = await fetch(`${BASE_URL}/api/collections/${testCollection.id}`);
      const updatedCollection = await collectionResponse.json();

      if (updatedCollection.items && updatedCollection.items.length > 0) {
        console.log(`✅ Collection now has ${updatedCollection.items.length} items`);
      } else {
        console.log('⚠️  Collection items not populated (this might be expected if item not in saved_items)');
      }

      // Test 4: Remove item from collection
      console.log('\n4. Testing POST /api/collections (removeItem)...');
      const removeItemResponse = await fetch(`${BASE_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeItem',
          itemId: 'test-product-123',
          collectionId: testCollection.id
        })
      });

      if (removeItemResponse.ok) {
        console.log('✅ Successfully removed item from collection');
      } else {
        console.log('❌ Failed to remove item from collection:', await removeItemResponse.text());
      }
    }

    console.log('\n🎉 Collection functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCollections();
