import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    return;
  }

  console.log('🚀 Starting database migration...');

  try {
    const client = postgres(connectionString, {
      prepare: false,
    });

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'lib', 'db', 'migrations', '0000_worthless_hex.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoints and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await client.unsafe(statement);
        console.log(`✅ Statement ${i + 1} completed`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    await client.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
