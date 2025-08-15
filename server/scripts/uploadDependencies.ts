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

interface Dependency {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
  criticality: string;
  lastUpdated: string;
}

async function uploadDependencies() {
  if (!data.dependencies || data.dependencies.length === 0) {
    console.log('No dependencies to upload');
    return;
  }

  console.log(`Preparing to upload ${data.dependencies.length} dependencies...`);
  
  // First, verify that all referenced components exist
  const { data: components } = await supabase
    .from('components')
    .select('id');
    
  const componentIds = new Set(components?.map(c => c.id) || []);
  
  // Filter out any dependencies that reference non-existent components
  const validDependencies = data.dependencies.filter((dep: Dependency) => {
    const sourceExists = componentIds.has(dep.sourceId);
    const targetExists = componentIds.has(dep.targetId);
    
    if (!sourceExists) {
      console.warn(`Skipping dependency ${dep.id}: Source component ${dep.sourceId} not found`);
      return false;
    }
    
    if (!targetExists) {
      console.warn(`Skipping dependency ${dep.id}: Target component ${dep.targetId} not found`);
      return false;
    }
    
    return true;
  });
  
  if (validDependencies.length === 0) {
    console.log('No valid dependencies to upload after validation');
    return;
  }
  
  console.log(`Uploading ${validDependencies.length} valid dependencies...`);
  
  // Upload in batches to avoid hitting rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < validDependencies.length; i += BATCH_SIZE) {
    const batch = validDependencies.slice(i, i + BATCH_SIZE);
    const formattedBatch = batch.map((dep: Dependency) => ({
      id: dep.id,
      source_id: dep.sourceId,
      target_id: dep.targetId,
      type: dep.type || 'depends_on',
      description: dep.description || '',
      criticality: dep.criticality || 'medium',
      last_updated: dep.lastUpdated || new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('dependencies')
      .upsert(formattedBatch, { onConflict: 'id' });
      
    if (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error);
    } else {
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(validDependencies.length / BATCH_SIZE)}`);
    }
  }
  
  console.log('Dependencies upload completed!');
}

// Run the upload
uploadDependencies().catch(console.error);
