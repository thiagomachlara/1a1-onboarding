-- Migration: Adicionar suporte para certidões de UBOs (Pessoa Física)
-- Data: 2025-11-12
-- Descrição: Adiciona colunas ubo_id e entity_type para permitir certidões tanto de PJ quanto de PF

-- 1. Adicionar coluna entity_type (PJ ou PF)
ALTER TABLE compliance_certificates
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(2) DEFAULT 'PJ' CHECK (entity_type IN ('PJ', 'PF'));

-- 2. Adicionar coluna ubo_id (referência para beneficial_owners)
ALTER TABLE compliance_certificates
ADD COLUMN IF NOT EXISTS ubo_id UUID REFERENCES beneficial_owners(id) ON DELETE CASCADE;

-- 3. Tornar company_id nullable (pois certidões PF podem não ter company_id direto)
ALTER TABLE compliance_certificates
ALTER COLUMN company_id DROP NOT NULL;

-- 4. Adicionar constraint: ou company_id ou ubo_id deve estar preenchido
ALTER TABLE compliance_certificates
ADD CONSTRAINT check_entity_id CHECK (
  (entity_type = 'PJ' AND company_id IS NOT NULL AND ubo_id IS NULL) OR
  (entity_type = 'PF' AND ubo_id IS NOT NULL)
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_compliance_certificates_ubo_id ON compliance_certificates(ubo_id);
CREATE INDEX IF NOT EXISTS idx_compliance_certificates_entity_type ON compliance_certificates(entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_certificates_ubo_type ON compliance_certificates(ubo_id, entity_type);

-- 6. Atualizar RLS policies para incluir UBOs
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar certidões" ON compliance_certificates;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir certidões" ON compliance_certificates;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar certidões" ON compliance_certificates;

-- Policy para SELECT (visualizar certidões de PJ e PF)
CREATE POLICY "Usuários autenticados podem visualizar certidões"
ON compliance_certificates
FOR SELECT
TO authenticated
USING (true);

-- Policy para INSERT (criar certidões de PJ e PF)
CREATE POLICY "Usuários autenticados podem inserir certidões"
ON compliance_certificates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy para UPDATE (atualizar certidões de PJ e PF)
CREATE POLICY "Usuários autenticados podem atualizar certidões"
ON compliance_certificates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Comentários para documentação
COMMENT ON COLUMN compliance_certificates.entity_type IS 'Tipo de entidade: PJ (Pessoa Jurídica) ou PF (Pessoa Física)';
COMMENT ON COLUMN compliance_certificates.ubo_id IS 'ID do UBO (beneficial owner) quando entity_type = PF';
COMMENT ON CONSTRAINT check_entity_id ON compliance_certificates IS 'Garante que PJ tem company_id e PF tem ubo_id';
