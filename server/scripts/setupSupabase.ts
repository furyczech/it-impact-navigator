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

async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Drop existing tables if they exist
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS public.dependencies CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS public.components CASCADE;' });
    
    // Create components table
    await supabase.rpc('exec_sql', { sql: `
      CREATE TABLE public.components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        criticality TEXT NOT NULL,
        description TEXT,
        location TEXT,
        owner TEXT,
        vendor TEXT,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `});
    
    // Create dependencies table with explicit last_updated column
    await supabase.rpc('exec_sql', { sql: `
      CREATE TABLE public.dependencies (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'depends_on',
        description TEXT,
        criticality TEXT NOT NULL DEFAULT 'medium',
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `});
    
    // Create indexes for better query performance
    await supabase.rpc('exec_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_components_name ON public.components (name);' });
    await supabase.rpc('exec_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_components_type ON public.components (type);' });
    await supabase.rpc('exec_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_dependencies_source ON public.dependencies (source_id);' });
    await supabase.rpc('exec_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_dependencies_target ON public.dependencies (target_id);' });
    
    // Enable Row Level Security
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;' });
    
    // Create policies for public read access
    await supabase.rpc('exec_sql', { sql: `
      CREATE POLICY "Enable read access for all users"
      ON public.components
      FOR SELECT
      TO public
      USING (true);
    `});
    
    await supabase.rpc('exec_sql', { sql: `
      CREATE POLICY "Enable read access for all users"
      ON public.dependencies
      FOR SELECT
      TO public
      USING (true);
    `});
    
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  }
}

async function uploadData() {
  try {
    // First, set up the database
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      console.error('Failed to set up database. Aborting data upload.');
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
      const depsToUpload = data.dependencies.map((dep: Dependency) => {
        const depData: any = {
          id: dep.id,
          source_id: dep.sourceId,
          target_id: dep.targetId,
          type: dep.type || 'depends_on',
          description: dep.description || '',
          criticality: dep.criticality || 'medium'
        };
        
        // Only include last_updated if it exists in the source data
        if (dep.lastUpdated) {
          depData.last_updated = new Date(dep.lastUpdated).toISOString();
        }
        
        return depData;
      });
      
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
