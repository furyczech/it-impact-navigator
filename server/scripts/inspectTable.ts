import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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

async function inspectTable(tableName: string) {
  console.log(`\nInspecting table: ${tableName}`);
  
  try {
    // Get table info
    const { data: tableInfo, error: infoError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', tableName);
      
    if (infoError) throw infoError;
    
    console.log('\nTable columns:');
    console.table(tableInfo.map(col => ({
      column_name: col.column_name,
      data_type: col.data_type,
      is_nullable: col.is_nullable,
      column_default: col.column_default
    })));
    
    // Get a sample of the data
    const { data: sampleData, error: dataError } = await supabase
      .from(tableName)
      .select('*')
      .limit(2);
      
    if (dataError) throw dataError;
    
    console.log(`\nSample data (first ${sampleData?.length || 0} rows):`);
    console.table(sampleData);
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;
    
    console.log(`\nTotal rows: ${count}`);
    
  } catch (error) {
    console.error(`Error inspecting table ${tableName}:`, error);
  }
}

async function main() {
  console.log('Inspecting Supabase tables...');
  
  // Inspect components table
  await inspectTable('components');
  
  // Inspect dependencies table
  await inspectTable('dependencies');
  
  console.log('\nInspection completed!');
}

// Run the main function
main().catch(console.error);
