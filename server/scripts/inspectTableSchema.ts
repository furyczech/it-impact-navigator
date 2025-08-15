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

async function getTableSchema(tableName: string) {
  console.log(`\n=== Schema for table: ${tableName} ===`);
  
  try {
    // Get a single row to infer schema
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log(`No data found in table ${tableName}`);
      return;
    }
    
    console.log('Sample row structure:');
    console.log(JSON.stringify(data[0], null, 2));
    
    // Get column information by trying to insert a test value
    const testId = `test_${Date.now()}`;
    const testData = {
      id: testId,
      name: 'test',
      type: 'test',
      status: 'test',
      criticality: 'test',
      description: 'test',
      location: 'test',
      owner: 'test',
      vendor: 'test'
    };
    
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([testData]);
      
    if (insertError) {
      console.log('\nError when trying to insert test data:');
      console.log(insertError);
    } else {
      console.log('\nSuccessfully inserted test data');
      
      // Clean up test data
      await supabase
        .from(tableName)
        .delete()
        .eq('id', testId);
    }
    
  } catch (error) {
    console.error(`Error inspecting table ${tableName}:`, error);
  }
}

async function main() {
  console.log('Inspecting database tables...');
  
  // Inspect components table
  await getTableSchema('components');
  
  // Inspect dependencies table
  await getTableSchema('dependencies');
  
  console.log('\nInspection completed!');
}

// Run the main function
main().catch(console.error);
