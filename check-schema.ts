import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDatabaseSchema() {
  console.log('🔍 Checking current database schema...');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    return;
  }

  try {
    const client = postgres(connectionString, {
      prepare: false,
    });

    // Check existing tables
    const tables = await client`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `;

    console.log('📊 Current database schema:');
    let currentTable = '';
    for (const row of tables) {
      if (row.table_name !== currentTable) {
        console.log(`\n🗃️  Table: ${row.table_name}`);
        currentTable = row.table_name;
      }
      console.log(`   ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    }

    // Check foreign key constraints
    const fks = await client`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `;

    console.log('\n🔗 Foreign Key Constraints:');
    for (const fk of fks) {
      console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkDatabaseSchema();
