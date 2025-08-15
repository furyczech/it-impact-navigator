import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase URL or Anon Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQLFile(filePath: string): Promise<boolean> {
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error(`Error executing SQL from ${path.basename(filePath)}:`, error);
        return false;
      }
    }
    
    console.log(`Successfully executed ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`Error reading or executing ${path.basename(filePath)}:`, error);
    return false;
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = [
    '0001_initial_schema.sql',
    'insert_components.sql',
    'insert_dependencies.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Migration file not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`\nRunning migration: ${file}`);
    const success = await runSQLFile(filePath);
    if (!success) {
      console.error(`Migration failed: ${file}`);
      process.exit(1);
    }
  }

  console.log('\nAll migrations completed successfully!');
}

main().catch(console.error);
