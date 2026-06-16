-- Migration: Add multi-tenant scope columns to categories and unidades tables
-- Run this in the Supabase SQL Editor

ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'grupo-frz';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'febracis-pa';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS space_id TEXT NOT NULL DEFAULT 'caixa-principal';

ALTER TABLE unidades ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'grupo-frz';
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'febracis-pa';
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS space_id TEXT NOT NULL DEFAULT 'caixa-principal';

DROP INDEX IF EXISTS idx_categories_scope;
DROP INDEX IF EXISTS idx_unidades_scope;

CREATE INDEX idx_categories_scope ON categories(company_id, workspace_id, space_id);
CREATE INDEX idx_unidades_scope ON unidades(company_id, workspace_id, space_id);

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE categories ADD PRIMARY KEY (company_id, workspace_id, space_id, name);

ALTER TABLE unidades DROP CONSTRAINT IF EXISTS unidades_pkey;
ALTER TABLE unidades ADD PRIMARY KEY (company_id, workspace_id, space_id, name);

-- Ensure existing rows have the default scope
UPDATE categories SET company_id = 'grupo-frz', workspace_id = 'febracis-pa', space_id = 'caixa-principal' WHERE company_id IS NULL OR company_id = '';
UPDATE unidades SET company_id = 'grupo-frz', workspace_id = 'febracis-pa', space_id = 'caixa-principal' WHERE company_id IS NULL OR company_id = '';

ALTER TABLE categories ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN space_id SET NOT NULL;

ALTER TABLE unidades ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE unidades ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE unidades ALTER COLUMN space_id SET NOT NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories scope isolation" ON categories
  USING (company_id = current_setting('app.company_id', true)
    AND workspace_id = current_setting('app.workspace_id', true)
    AND space_id = current_setting('app.space_id', true));

CREATE POLICY "Unidades scope isolation" ON unidades
  USING (company_id = current_setting('app.company_id', true)
    AND workspace_id = current_setting('app.workspace_id', true)
    AND space_id = current_setting('app.space_id', true));
