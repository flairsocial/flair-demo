// Test script for invite system
// Run with: node test-invite-system.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000'; // Change if running on different port

async function testInviteSystem() {
  console.log('🧪 Testing Invite System...\n');

  try {
    // Test 1: Validate invite code
    console.log('1. Testing invite validation...');
    const testUserId = 'user_332ISXNNiK6MggcKNw7swTx5PsY'; // Use a real user ID from your system

    const validateResponse = await fetch(`${BASE_URL}/api/invite/validate/${testUserId}`);
    const validateData = await validateResponse.json();

    console.log('   Validation result:', validateData);

    if (validateData.valid) {
      console.log('   ✅ Invite validation works');
    } else {
      console.log('   ❌ Invite validation failed:', validateData.error);
    }

    // Test 2: Check profile API
    console.log('\n2. Testing profile API...');
    // Note: This would require authentication, so we'll skip for now

    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Open incognito browser');
    console.log(`2. Go to: ${BASE_URL}/invite/${testUserId}`);
    console.log('3. Should redirect to sign-up with invite banner');
    console.log('4. Sign up with new account');
    console.log('5. Should redirect to invite success page');
    console.log('6. Check both accounts have +100 credits');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInviteSystem();
