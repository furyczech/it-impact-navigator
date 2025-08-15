import * as fs from 'fs';
import * as path from 'path';

// Read and parse the data file
const dataPath = path.resolve(__dirname, '../data/data.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

// Function to escape single quotes in SQL strings
const escapeSQL = (str: string): string => {
  if (!str) return '';
  return str.replace(/'/g, "''");
};

// Generate SQL for components
generateComponentsSQL();

// Generate SQL for dependencies
generateDependenciesSQL();

function generateComponentsSQL() {
  if (!data.components || data.components.length === 0) return;
  
  const outputPath = path.resolve(__dirname, 'migrations/insert_components.sql');
  let sql = '-- SQL to insert components\n';
  
  data.components.forEach((comp: any) => {
    sql += `INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '${comp.id}',
      '${escapeSQL(comp.name)}',
      '${escapeSQL(comp.type)}',
      '${escapeSQL(comp.status)}',
      '${escapeSQL(comp.criticality)}',
      '${escapeSQL(comp.description || '')}',
      '${escapeSQL(comp.location || '')}',
      '${escapeSQL(comp.owner || '')}',
      '${escapeSQL(comp.vendor || '')}',
      '${comp.lastUpdated || new Date().toISOString()}',
      '${JSON.stringify(comp.metadata || {}).replace(/'/g, "''")}'
    ) ON CONFLICT (id) DO UPDATE SET
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
      updated_at = NOW();\n\n`;
  });
  
  fs.writeFileSync(outputPath, sql);
  console.log(`Generated SQL for ${data.components.length} components at ${outputPath}`);
}

function generateDependenciesSQL() {
  if (!data.dependencies || data.dependencies.length === 0) return;
  
  const outputPath = path.resolve(__dirname, 'migrations/insert_dependencies.sql');
  let sql = '-- SQL to insert dependencies\n';
  
  data.dependencies.forEach((dep: any) => {
    sql += `INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '${dep.id}',
      '${dep.sourceId}',
      '${dep.targetId}',
      '${escapeSQL(dep.type || 'depends_on')}',
      '${escapeSQL(dep.description || '')}',
      '${escapeSQL(dep.criticality || 'medium')}',
      '${dep.lastUpdated || new Date().toISOString()}'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();\n\n`;
  });
  
  fs.writeFileSync(outputPath, sql);
  console.log(`Generated SQL for ${data.dependencies.length} dependencies at ${outputPath}`);
}
