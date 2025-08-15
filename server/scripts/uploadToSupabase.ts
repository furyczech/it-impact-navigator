import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Types based on the data structure
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
  metadata: Record<string, any>;
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

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase URL or Anon Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read and parse the data file
const dataPath = path.resolve(__dirname, '../data/data.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

async function applyMigrations() {
  console.log('Applying database migrations...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations/0001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split the SQL into individual statements and execute them one by one
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('pgmigrate', {
        sql: statement + ';'  // Add back the semicolon that was removed by split
      });
      
      if (error) {
        console.error('Error executing SQL statement:', statement);
        console.error('Error details:', error);
        return false;
      }
    }
    
    console.log('Migrations applied successfully');
    return true;
  } catch (error) {
    console.error('Error reading or applying migrations:', error);
    return false;
  }
}

async function uploadData() {
  try {
    // First, apply database migrations
    const migrationsApplied = await applyMigrations();
    if (!migrationsApplied) {
      console.error('Failed to apply database migrations. Aborting data upload.');
      return;
    }

    // Upload components
    if (data.components && data.components.length > 0) {
      console.log(`\nUploading ${data.components.length} components...`);
      
      // Transform components to match the expected format
      const componentsToUpload = data.components.map((comp: Component) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        status: comp.status,
        criticality: comp.criticality,
        description: comp.description || '',
        location: comp.location || '',
        owner: comp.owner || '',
        vendor: comp.vendor || '',
        last_updated: comp.lastUpdated ? new Date(comp.lastUpdated).toISOString() : new Date().toISOString(),
        metadata: comp.metadata || {}
      }));
      
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .upsert(componentsToUpload, { onConflict: 'id' });
      
      if (componentsError) {
        console.error('Error uploading components:', componentsError);
      } else {
        console.log(`Successfully uploaded ${data.components.length} components`);
      }
    }

    // Upload dependencies
    if (data.dependencies && data.dependencies.length > 0) {
      console.log(`\nUploading ${data.dependencies.length} dependencies...`);
      
      // Transform dependencies to match the expected format
      const depsToUpload = data.dependencies.map((dep: Dependency) => ({
        id: dep.id,
        source_id: dep.sourceId,
        target_id: dep.targetId,
        type: dep.type || 'depends_on',
        description: dep.description || '',
        criticality: dep.criticality || 'medium',
        last_updated: dep.lastUpdated ? new Date(dep.lastUpdated).toISOString() : new Date().toISOString()
      }));
      
      const { data: depsData, error: depsError } = await supabase
        .from('dependencies')
        .upsert(depsToUpload, { onConflict: 'id' });
      
      if (depsError) {
        console.error('Error uploading dependencies:', depsError);
      } else {
        console.log(`Successfully uploaded ${data.dependencies.length} dependencies`);
      }
    }

    console.log('\nData upload completed!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the upload
uploadData();
