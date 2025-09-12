// Debug script to test authentication flow
const { auth } = require('@clerk/nextjs/server')

// This simulates what happens in the API routes
async function testAuth() {
  try {
    console.log('🔍 Testing Clerk authentication...')
    
    const authResult = await auth()
    console.log('Auth result:', authResult)
    
    if (authResult.userId) {
      console.log('✅ User authenticated:', authResult.userId)
    } else {
      console.log('❌ User not authenticated')
    }
  } catch (error) {
    console.error('Auth error:', error)
  }
}

testAuth()
