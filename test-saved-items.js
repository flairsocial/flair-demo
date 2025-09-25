const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSavedItems() {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .limit(5);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Sample saved items:');
    data.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log('product_id:', item.product_id);
      console.log('product_data.id:', item.product_data?.id);
      console.log('product_data.title:', item.product_data?.title);
      console.log('product_data.brand:', item.product_data?.brand);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSavedItems();