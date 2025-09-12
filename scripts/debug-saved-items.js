const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugSavedItems() {
  console.log('🔍 Debugging saved items in database...\n')
  
  try {
    // Check profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    console.log('👤 Profiles in database:', profiles?.length || 0)
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`  - ID: ${profile.id}, Clerk ID: ${profile.clerk_id}`)
      })
    }
    console.log()
    
    // Check saved items
    const { data: savedItems, error: savedError } = await supabase
      .from('saved_items')
      .select('*')
    
    console.log('💾 Saved items in database:', savedItems?.length || 0)
    if (savedItems && savedItems.length > 0) {
      savedItems.forEach(item => {
        console.log(`  - ID: ${item.id}, Profile ID: ${item.profile_id}`)
        console.log(`    Product: ${item.product?.title || 'No title'}`)
        console.log(`    Saved at: ${item.saved_at}`)
      })
    }
    console.log()
    
    // Check collections
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
    
    console.log('📁 Collections in database:', collections?.length || 0)
    if (collections && collections.length > 0) {
      collections.forEach(collection => {
        console.log(`  - ID: ${collection.id}, Name: ${collection.name}`)
        console.log(`    Profile ID: ${collection.profile_id}`)
        console.log(`    Items: ${collection.item_ids?.length || 0}`)
      })
    }
    
    if (profilesError) console.error('Profiles error:', profilesError)
    if (savedError) console.error('Saved items error:', savedError)
    if (collectionsError) console.error('Collections error:', collectionsError)
    
  } catch (error) {
    console.error('Database connection error:', error)
  }
}

debugSavedItems()
