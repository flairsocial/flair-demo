require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('🧪 Testing profile update with proper UUID handling...');
  
  // Find the profile with clerk_id 'user_329KVwiv762JNKE2wiz6yRjlNbp'
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_id', 'user_329KVwiv762JNKE2wiz6yRjlNbp');
  
  if (fetchError) {
    console.error('Error fetching profile:', fetchError);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('❌ Profile not found');
    return;
  }
  
  const profile = profiles[0];
  console.log(`✅ Found profile with UUID: ${profile.id}`);
  console.log(`   Clerk ID: ${profile.clerk_id}`);
  console.log(`   Current username: ${profile.username}`);
  
  // Test the update using the proper UUID
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      bio: `Updated at ${new Date().toISOString()} - Test successful!`,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id); // Using the proper UUID here
  
  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
  } else {
    console.log('✅ Profile updated successfully using proper UUID!');
    
    // Verify the update
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('bio, updated_at')
      .eq('id', profile.id)
      .single();
    
    console.log('📝 Updated bio:', updatedProfile?.bio);
  }
})();
