-- Tabela para armazenar documentos de compliance carregados manualmente
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  
  -- Informações do documento
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- 'CND_FEDERAL', 'CNDT', 'CONTRATO_SOCIAL', 'BALANCO', 'OUTROS'
  document_category VARCHAR(50) NOT NULL, -- 'certificate', 'financial', 'legal', 'other'
  description TEXT,
  
  -- Armazenamento
  file_url TEXT NOT NULL,
  file_storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100), -- MIME type
  
  -- Metadados
  issue_date DATE,
  expiry_date DATE,
  document_number VARCHAR(100),
  
  -- Versionamento
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES compliance_documents(id),
  is_current_version BOOLEAN DEFAULT true,
  
  -- Tags para busca
  tags TEXT[], -- Array de tags
  
  -- Auditoria
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  
  -- Constraints
  CONSTRAINT valid_document_category CHECK (
    document_category IN ('certificate', 'financial', 'legal', 'other')
  )
);

-- Índices para performance
CREATE INDEX idx_compliance_documents_company_id ON compliance_documents(company_id);
CREATE INDEX idx_compliance_documents_type ON compliance_documents(document_type);
CREATE INDEX idx_compliance_documents_category ON compliance_documents(document_category);
CREATE INDEX idx_compliance_documents_expiry ON compliance_documents(expiry_date);
CREATE INDEX idx_compliance_documents_current ON compliance_documents(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_compliance_documents_tags ON compliance_documents USING GIN(tags);

-- Índice composto para buscar documentos ativos de uma empresa
CREATE INDEX idx_compliance_documents_company_active ON compliance_documents(company_id, is_current_version, deleted_at)
WHERE is_current_version = true AND deleted_at IS NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_compliance_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_documents_updated_at
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_documents_updated_at();

-- Função para criar nova versão de documento
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Marcar versão anterior como não atual
  IF NEW.previous_version_id IS NOT NULL THEN
    UPDATE compliance_documents
    SET is_current_version = false
    WHERE id = NEW.previous_version_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_document_version
  AFTER INSERT ON compliance_documents
  FOR EACH ROW
  WHEN (NEW.previous_version_id IS NOT NULL)
  EXECUTE FUNCTION create_document_version();

-- RLS (Row Level Security)
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os documentos não deletados
CREATE POLICY "Admins can view active documents"
  ON compliance_documents
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Política: Admins podem inserir documentos
CREATE POLICY "Admins can insert documents"
  ON compliance_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Política: Admins podem atualizar documentos
CREATE POLICY "Admins can update documents"
  ON compliance_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Política: Admins podem deletar documentos (soft delete)
CREATE POLICY "Admins can delete documents"
  ON compliance_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE compliance_documents IS 'Armazena documentos de compliance carregados manualmente pelos administradores';
COMMENT ON COLUMN compliance_documents.document_type IS 'Tipo específico do documento (CND_FEDERAL, CNDT, CONTRATO_SOCIAL, etc)';
COMMENT ON COLUMN compliance_documents.document_category IS 'Categoria geral: certificate, financial, legal, other';
COMMENT ON COLUMN compliance_documents.version IS 'Número da versão do documento';
COMMENT ON COLUMN compliance_documents.previous_version_id IS 'ID da versão anterior (para controle de histórico)';
COMMENT ON COLUMN compliance_documents.is_current_version IS 'Indica se esta é a versão atual do documento';
COMMENT ON COLUMN compliance_documents.tags IS 'Array de tags para facilitar busca e organização';
COMMENT ON COLUMN compliance_documents.deleted_at IS 'Data de exclusão (soft delete) - NULL indica documento ativo';
