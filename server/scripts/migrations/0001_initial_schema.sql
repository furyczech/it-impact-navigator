-- Create components table
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
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dependencies table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_components_name ON public.components (name);
CREATE INDEX IF NOT EXISTS idx_components_type ON public.components (type);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON public.dependencies (source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON public.dependencies (target_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at columns
CREATE TRIGGER update_components_updated_at
BEFORE UPDATE ON public.components
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dependencies_updated_at
BEFORE UPDATE ON public.dependencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users"
ON public.components
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users"
ON public.dependencies
FOR SELECT
TO public
USING (true);
