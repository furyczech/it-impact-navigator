-- Drop existing foreign key constraints if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'dependencies_source_id_fkey' 
        AND table_name = 'dependencies'
    ) THEN
        ALTER TABLE dependencies DROP CONSTRAINT dependencies_source_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'dependencies_target_id_fkey' 
        AND table_name = 'dependencies'
    ) THEN
        ALTER TABLE dependencies DROP CONSTRAINT dependencies_target_id_fkey;
    END IF;
END $$;

-- Change the id column type in components
ALTER TABLE components 
    ALTER COLUMN id TYPE text 
    USING id::text;

-- Change the foreign key columns in dependencies
ALTER TABLE dependencies 
    ALTER COLUMN source_id TYPE text 
    USING source_id::text;
    
ALTER TABLE dependencies 
    ALTER COLUMN target_id TYPE text 
    USING target_id::text;

-- Re-add the foreign key constraints
ALTER TABLE dependencies 
    ADD CONSTRAINT dependencies_source_id_fkey 
    FOREIGN KEY (source_id) 
    REFERENCES components(id) 
    ON DELETE CASCADE;
    
ALTER TABLE dependencies 
    ADD CONSTRAINT dependencies_target_id_fkey 
    FOREIGN KEY (target_id) 
    REFERENCES components(id) 
    ON DELETE CASCADE;

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('components', 'dependencies')
    AND column_name IN ('id', 'source_id', 'target_id')
ORDER BY 
    table_name, 
    ordinal_position;
