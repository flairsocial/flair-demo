// Test to check Clerk user ID consistency
// Run this from the browser console while logged in

console.log('🔍 Testing user ID consistency...')

// Test Clerk user ID
fetch('/api/profile')
  .then(response => response.json())
  .then(data => {
    console.log('Current user from /api/profile:', data)
  })

// Test saved items API
fetch('/api/saved')
  .then(response => response.json())
  .then(data => {
    console.log('Saved items from API:', data)
  })

// Test what Clerk reports on client side
if (window.Clerk && window.Clerk.user) {
  console.log('Clerk user ID from client:', window.Clerk.user.id)
}
