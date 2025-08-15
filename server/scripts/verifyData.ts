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

async function verifyData() {
  try {
    console.log('Verifying data in Supabase...');
    
    // Check components table
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select('*')
      .limit(5);
    
    if (componentsError) {
      console.error('Error fetching components:', componentsError);
    } else {
      console.log('\nSample components from database:');
      console.table(components);
    }
    
    // Check dependencies table
    const { data: dependencies, error: depsError } = await supabase
      .from('dependencies')
      .select('*')
      .limit(5);
    
    if (depsError) {
      console.error('\nError fetching dependencies:', depsError);
    } else {
      console.log('\nSample dependencies from database:');
      console.table(dependencies);
    }
    
    // Count records
    const { count: componentsCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true });
      
    const { count: depsCount } = await supabase
      .from('dependencies')
      .select('*', { count: 'exact', head: true });
    
    console.log('\nRecord counts:');
    console.log(`- Components: ${componentsCount || 0}`);
    console.log(`- Dependencies: ${depsCount || 0}`);
    
  } catch (error) {
    console.error('Error verifying data:', error);
  }
}

verifyData();
