// Test script to verify invite credit system
// Run with: node test-invite-credits.js

const BASE_URL = 'http://localhost:3000'

async function testInviteCredits() {
  console.log('🧪 Testing Invite Credit System...\n')

  try {
    // Test 1: Check if existing user can trigger credit award for referrer
    console.log('Test 1: Existing user clicking invite link')
    const testUserId = 'user_332ISXNNiK6MggcKNw7swTx5PsY' // Replace with actual test user ID

    const response = await fetch(`${BASE_URL}/api/invite/award-click-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This would need proper authentication in real testing
        // For now, we'll just test the API structure
      },
      body: JSON.stringify({
        inviteCode: testUserId
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API responded successfully:', data.message)
    } else {
      console.log('❌ API error:', response.status, response.statusText)
    }

    // Test 2: Check credit awards for user
    console.log('\nTest 2: Checking credit awards for user')
    const awardsResponse = await fetch(`${BASE_URL}/api/credits/check-awards`)
    if (awardsResponse.ok) {
      const awards = await awardsResponse.json()
      console.log('✅ Credit awards check:', awards)
    } else {
      console.log('❌ Credit awards check failed:', awardsResponse.status)
    }

    console.log('\n🎉 Invite credit system test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Instructions for manual testing
console.log('📋 Manual Testing Instructions:')
console.log('1. Open incognito browser')
console.log('2. Go to invite link: http://localhost:3000/invite/user_332ISXNNiK6MggcKNw7swTx5PsY')
console.log('3. Sign in with existing account')
console.log('4. Check console logs for credit awarding')
console.log('5. Check referrer\'s credit counter')
console.log('')

// Uncomment to run automated test
// testInviteCredits()

console.log('💡 To run automated test, uncomment the testInviteCredits() call above')
