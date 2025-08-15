import { query, testConnection } from './directDb';
import * as fs from 'fs';
import * as path from 'path';

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

// Function to escape single quotes for SQL
const escape = (str: string): string => {
  if (!str) return '';
  return str.replace(/'/g, "''");
};

async function uploadComponents() {
  if (!data.components || data.components.length === 0) {
    console.log('No components to upload');
    return;
  }

  console.log(`Uploading ${data.components.length} components...`);
  
  // Create components table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS public.components (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      criticality TEXT NOT NULL,
      description TEXT,
      location TEXT,
      owner TEXT,
      vendor TEXT,
      last_updated TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  
  // Upload components in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < data.components.length; i += BATCH_SIZE) {
    const batch = data.components.slice(i, i + BATCH_SIZE) as Component[];
    const values = batch.map(comp => {
      const metadata = JSON.stringify(comp.metadata || {});
      return `(
        '${comp.id}',
        '${escape(comp.name)}',
        '${escape(comp.type)}',
        '${escape(comp.status)}',
        '${escape(comp.criticality)}',
        '${escape(comp.description || '')}',
        '${escape(comp.location || '')}',
        '${escape(comp.owner || '')}',
        '${escape(comp.vendor || '')}',
        '${comp.lastUpdated || new Date().toISOString()}',
        '${metadata.replace(/'/g, "''")}'::jsonb
      )`;
    }).join(',');
    
    const sql = `
      INSERT INTO public.components (
        id, name, type, status, criticality, description, 
        location, owner, vendor, last_updated, metadata
      ) VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        criticality = EXCLUDED.criticality,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        owner = EXCLUDED.owner,
        vendor = EXCLUDED.vendor,
        last_updated = EXCLUDED.last_updated,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `;
    
    try {
      await query(sql);
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.components.length / BATCH_SIZE)}`);
    } catch (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error);
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
  
  // Create dependencies table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS public.dependencies (
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
  `);
  
  // Upload dependencies in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < data.dependencies.length; i += BATCH_SIZE) {
    const batch = data.dependencies.slice(i, i + BATCH_SIZE) as Dependency[];
    const values = batch.map(dep => {
      return `(
        '${dep.id}',
        '${dep.sourceId}',
        '${dep.targetId}',
        '${escape(dep.type || 'depends_on')}',
        '${escape(dep.description || '')}',
        '${escape(dep.criticality || 'medium')}',
        '${dep.lastUpdated || new Date().toISOString()}'
      )`;
    }).join(',');
    
    const sql = `
      INSERT INTO public.dependencies (
        id, source_id, target_id, type, description, criticality, last_updated
      ) VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        target_id = EXCLUDED.target_id,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        criticality = EXCLUDED.criticality,
        last_updated = EXCLUDED.last_updated,
        updated_at = NOW();
    `;
    
    try {
      await query(sql);
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.dependencies.length / BATCH_SIZE)}`);
    } catch (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error);
      
      // If there's a foreign key constraint error, try to find which dependency caused it
      if (error.message.includes('violates foreign key constraint')) {
        console.log('Checking for problematic dependencies in the current batch...');
        await checkProblematicDependencies(batch);
      }
    }
  }
  
  console.log('Dependencies upload completed!');
}

async function checkProblematicDependencies(dependencies: Dependency[]) {
  for (const dep of dependencies) {
    try {
      // Check if source component exists
      const sourceCheck = await query(
        'SELECT id FROM public.components WHERE id = $1', 
        [dep.sourceId]
      );
      
      // Check if target component exists
      const targetCheck = await query(
        'SELECT id FROM public.components WHERE id = $1', 
        [dep.targetId]
     );
      
      if (sourceCheck.rows.length === 0) {
        console.error(`  - Source component not found: ${dep.sourceId} (referenced by dependency ${dep.id})`);
      }
      
      if (targetCheck.rows.length === 0) {
        console.error(`  - Target component not found: ${dep.targetId} (referenced by dependency ${dep.id})`);
      }
      
      if (sourceCheck.rows.length > 0 && targetCheck.rows.length > 0) {
        console.log(`  - Both components exist for dependency ${dep.id}: ${dep.sourceId} -> ${dep.targetId}`);
      }
    } catch (error) {
      console.error(`Error checking dependency ${dep.id}:`, error);
    }
  }
}

async function main() {
  console.log('Starting direct database upload...');
  
  // Test the connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to the database. Please check your connection settings.');
    process.exit(1);
  }
  
  try {
    // Upload components first
    await uploadComponents();
    
    // Then upload dependencies
    await uploadDependencies();
    
    console.log('\nAll data has been uploaded successfully!');
  } catch (error) {
    console.error('Error during upload:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the main function
main().catch(console.error);
