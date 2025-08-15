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

// Read and parse the data file
const dataPath = path.resolve(__dirname, '../data/data.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

interface Component {
  id: string;
  name: string;
  type: string;
  status: string;
  criticality: string;
  description: string;
  location: string;
  owner: string;
  vendor: string;
  lastUpdated: string;
  metadata: any;
}

interface Dependency {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
  criticality: string;
  lastUpdated: string;
}

async function uploadComponents() {
  if (!data.components || data.components.length === 0) {
    console.log('No components to upload');
    return;
  }

  console.log(`Uploading ${data.components.length} components...`);
  
  // Upload components in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < data.components.length; i += BATCH_SIZE) {
    const batch = data.components.slice(i, i + BATCH_SIZE) as Component[];
    const formattedBatch = batch.map(comp => ({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      status: comp.status,
      criticality: comp.criticality,
      description: comp.description || '',
      location: comp.location || '',
      owner: comp.owner || '',
      vendor: comp.vendor || '',
      last_updated: comp.lastUpdated || new Date().toISOString(),
      metadata: comp.metadata || {}
    }));
    
    const { data: result, error } = await supabase
      .from('components')
      .upsert(formattedBatch, { onConflict: 'id' });
      
    if (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error);
    } else {
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.components.length / BATCH_SIZE)}`);
    }
  }
  
  console.log('Components upload completed!');
}

async function uploadDependencies() {
  if (!data.dependencies || data.dependencies.length === 0) {
    console.log('No dependencies to upload');
    return;
  }

  console.log(`\nUploading ${data.dependencies.length} dependencies...`);
  
  // Upload dependencies in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < data.dependencies.length; i += BATCH_SIZE) {
    const batch = data.dependencies.slice(i, i + BATCH_SIZE) as Dependency[];
    const formattedBatch = batch.map(dep => ({
      id: dep.id,
      source_id: dep.sourceId,
      target_id: dep.targetId,
      type: dep.type || 'depends_on',
      description: dep.description || '',
      criticality: dep.criticality || 'medium'
      // Removed last_updated as it's causing schema cache issues
    }));
    
    const { data: result, error } = await supabase
      .from('dependencies')
      .upsert(formattedBatch, { onConflict: 'id' });
      
    if (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error);
      
      // If there's a foreign key constraint error, try to find which dependency caused it
      if (error.message.includes('foreign key constraint')) {
        console.log('Checking for problematic dependencies in the current batch...');
        for (const dep of batch) {
          try {
            // Check if source component exists
            const { data: sourceCheck } = await supabase
              .from('components')
              .select('id')
              .eq('id', dep.sourceId)
              .single();
              
            // Check if target component exists
            const { data: targetCheck } = await supabase
              .from('components')
              .select('id')
              .eq('id', dep.targetId)
              .single();
              
            if (!sourceCheck) {
              console.error(`  - Source component not found: ${dep.sourceId} (referenced by dependency ${dep.id})`);
            }
            
            if (!targetCheck) {
              console.error(`  - Target component not found: ${dep.targetId} (referenced by dependency ${dep.id})`);
            }
            
            if (sourceCheck && targetCheck) {
              console.log(`  - Both components exist for dependency ${dep.id}: ${dep.sourceId} -> ${dep.targetId}`);
            }
          } catch (err) {
            console.error(`Error checking dependency ${dep.id}:`, err);
          }
        }
      }
    } else {
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.dependencies.length / BATCH_SIZE)}`);
    }
  }
  
  console.log('Dependencies upload completed!');
}

async function main() {
  console.log('Starting data upload via REST API...');
  
  try {
    // Upload components first
    await uploadComponents();
    
    // Then upload dependencies
    await uploadDependencies();
    
    console.log('\nAll data has been uploaded successfully!');
  } catch (error) {
    console.error('Error during upload:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
