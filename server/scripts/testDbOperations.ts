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

// Test component data
const testComponent = {
  id: 'test_' + Date.now(),
  name: 'Test Component',
  type: 'test',
  status: 'online',
  criticality: 'low',
  description: 'Test component for database operations',
  location: 'Test Location',
  owner: 'Test Owner',
  vendor: 'Test Vendor'
};

// Test dependency data
const testDependency = {
  id: 'test_dep_' + Date.now(),
  source_id: testComponent.id,  // Will reference our test component
  target_id: testComponent.id,  // Self-reference for test
  type: 'depends_on',
  description: 'Test dependency',
  criticality: 'low'
};

async function testDatabaseOperations() {
  console.log('=== Testing Database Operations ===');
  
  try {
    // Test 1: Insert a test component
    console.log('\n1. Testing component insertion...');
    const { data: insertComponentData, error: insertError } = await supabase
      .from('components')
      .insert([testComponent])
      .select();
      
    if (insertError) {
      console.error('Error inserting test component:', insertError);
    } else {
      console.log('✅ Test component inserted successfully:', insertComponentData);
      
      // Test 2: Read the test component back
      console.log('\n2. Testing component retrieval...');
      const { data: readComponentData, error: readError } = await supabase
        .from('components')
        .select('*')
        .eq('id', testComponent.id)
        .single();
        
      if (readError || !readComponentData) {
        console.error('Error reading test component:', readError);
      } else {
        console.log('✅ Test component retrieved successfully:', readComponentData);
        
        // Test 3: Insert a test dependency
        console.log('\n3. Testing dependency insertion...');
        const { data: insertDepData, error: depInsertError } = await supabase
          .from('dependencies')
          .insert([testDependency])
          .select();
          
        if (depInsertError) {
          console.error('Error inserting test dependency:', depInsertError);
          
          // If there's a schema issue, try without the last_updated field
          console.log('\nTrying without last_updated field...');
          const { id, ...dependencyWithoutLastUpdated } = testDependency;
          const { data: retryDepData, error: retryError } = await supabase
            .from('dependencies')
            .insert([{ ...dependencyWithoutLastUpdated, id }])
            .select();
            
          if (retryError) {
            console.error('Error on retry without last_updated:', retryError);
          } else {
            console.log('✅ Test dependency inserted successfully (without last_updated):', retryDepData);
          }
        } else {
          console.log('✅ Test dependency inserted successfully:', insertDepData);
        }
        
        // Test 4: Read the test dependency back
        console.log('\n4. Testing dependency retrieval...');
        const { data: readDepData, error: readDepError } = await supabase
          .from('dependencies')
          .select('*')
          .eq('id', testDependency.id);
          
        if (readDepError || !readDepData || readDepData.length === 0) {
          console.error('Error reading test dependency:', readDepError);
        } else {
          console.log('✅ Test dependency retrieved successfully:', readDepData);
        }
      }
      
      // Cleanup: Delete test data
      console.log('\n5. Cleaning up test data...');
      const { error: deleteDepError } = await supabase
        .from('dependencies')
        .delete()
        .eq('id', testDependency.id);
        
      if (deleteDepError) {
        console.error('Error cleaning up test dependency:', deleteDepError);
      } else {
        console.log('✅ Test dependency cleaned up');
      }
    }
    
    // Cleanup: Delete test component
    const { error: deleteError } = await supabase
      .from('components')
      .delete()
      .eq('id', testComponent.id);
      
    if (deleteError) {
      console.error('Error cleaning up test component:', deleteError);
    } else {
      console.log('✅ Test component cleaned up');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
  
  console.log('\n=== Test Complete ===');
  
  // Final verification of all data
  console.log('\n=== Final Database State ===');
  const { data: allComponents } = await supabase.from('components').select('id, name');
  const { data: allDependencies } = await supabase.from('dependencies').select('id, source_id, target_id');
  
  console.log(`Components (${allComponents?.length || 0}):`, allComponents?.map(c => `${c.id}: ${c.name}`).join(', ') || 'None');
  console.log(`Dependencies (${allDependencies?.length || 0}):`, allDependencies?.map(d => `${d.id}: ${d.source_id}->${d.target_id}`).join(', ') || 'None');
}

// Run the tests
testDatabaseOperations().catch(console.error);
