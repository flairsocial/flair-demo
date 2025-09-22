// Test the collection API endpoints with a real HTTP request
const fetch = require('node-fetch')

async function testCollectionAPI() {
  console.log('🧪 Testing collection API endpoints...\n')

  try {
    const baseUrl = 'http://localhost:3000'

    // 1. Test GET collections
    console.log('📁 Testing GET /api/collections...')
    
    const getResponse = await fetch(`${baseUrl}/api/collections`, {
      headers: {
        'Cookie': 'clerk-session=test' // This won't work without real auth
      }
    })
    
    if (getResponse.ok) {
      const collections = await getResponse.json()
      console.log(`✅ GET collections successful: ${collections.length} collections`)
    } else {
      console.log(`❌ GET collections failed: ${getResponse.status} ${getResponse.statusText}`)
      const errorText = await getResponse.text()
      console.log('Error:', errorText)
    }

    // 2. Test POST add item (will fail without auth, but we can see the structure)
    console.log('\n🔄 Testing POST /api/collections (add item)...')
    
    const addResponse = await fetch(`${baseUrl}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'clerk-session=test'
      },
      body: JSON.stringify({
        action: 'addItem',
        itemId: 'test-item-id',
        collectionId: 'test-collection-id'
      })
    })

    if (addResponse.ok) {
      const result = await addResponse.json()
      console.log(`✅ POST add item successful:`, result)
    } else {
      console.log(`❌ POST add item failed: ${addResponse.status} ${addResponse.statusText}`)
      const errorText = await addResponse.text()
      console.log('Error response:', errorText)
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - make sure Next.js dev server is running on port 3000')
      console.log('Run: npm run dev')
    } else {
      console.error('❌ Test error:', error.message)
    }
  }
}

testCollectionAPI().then(() => {
  console.log('\n🏁 API endpoint test completed')
  process.exit(0)
})