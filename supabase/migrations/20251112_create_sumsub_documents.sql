-- Tabela para armazenar documentos sincronizados do Sumsub
-- Suporta documentos de empresas E UBOs
CREATE TABLE IF NOT EXISTS sumsub_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  company_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  ubo_id UUID REFERENCES beneficial_owners(id) ON DELETE CASCADE, -- NULL para documentos da empresa
  
  -- Origem do documento
  source VARCHAR(20) NOT NULL CHECK (source IN ('company', 'ubo')),
  applicant_id VARCHAR(255) NOT NULL, -- ID do applicant no Sumsub
  
  -- Informações do Sumsub
  image_id VARCHAR(255) NOT NULL UNIQUE, -- ID único da imagem no Sumsub
  inspection_id VARCHAR(255) NOT NULL, -- ID da inspeção no Sumsub
  doc_set_type VARCHAR(100) NOT NULL, -- Ex: 'COMPANY_DOC', 'IDENTITY'
  doc_type VARCHAR(100) NOT NULL, -- Ex: 'COMPANY_REGISTRATION', 'ID_CARD'
  
  -- Status e revisão
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  review_answer VARCHAR(50), -- 'GREEN', 'RED', 'YELLOW'
  review_comment TEXT,
  
  -- Armazenamento
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'jpg', 'png'
  file_size INTEGER,
  storage_path TEXT NOT NULL, -- Caminho no Supabase Storage
  download_url TEXT NOT NULL, -- URL pública do arquivo
  
  -- Tags para organização
  tags TEXT[], -- Array de tags: ['RG', 'Documento de Identidade', 'UBO']
  
  -- Metadados adicionais (JSON flexível)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  
  -- Constraints
  CONSTRAINT valid_source CHECK (
    (source = 'company' AND ubo_id IS NULL) OR
    (source = 'ubo' AND ubo_id IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_sumsub_documents_company_id ON sumsub_documents(company_id);
CREATE INDEX idx_sumsub_documents_ubo_id ON sumsub_documents(ubo_id) WHERE ubo_id IS NOT NULL;
CREATE INDEX idx_sumsub_documents_source ON sumsub_documents(source);
CREATE INDEX idx_sumsub_documents_image_id ON sumsub_documents(image_id);
CREATE INDEX idx_sumsub_documents_doc_type ON sumsub_documents(doc_set_type, doc_type);
CREATE INDEX idx_sumsub_documents_status ON sumsub_documents(status);
CREATE INDEX idx_sumsub_documents_tags ON sumsub_documents USING GIN(tags);

-- Índice composto para buscar documentos ativos de uma empresa
CREATE INDEX idx_sumsub_documents_company_active ON sumsub_documents(company_id, source, deleted_at)
WHERE deleted_at IS NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_sumsub_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sumsub_documents_updated_at
  BEFORE UPDATE ON sumsub_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_sumsub_documents_updated_at();

-- RLS (Row Level Security)
ALTER TABLE sumsub_documents ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver documentos não deletados
CREATE POLICY "Authenticated users can view active documents"
  ON sumsub_documents
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    auth.role() = 'authenticated'
  );

-- Política: Service role pode fazer tudo
CREATE POLICY "Service role has full access"
  ON sumsub_documents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE sumsub_documents IS 'Documentos sincronizados do Sumsub (empresas e UBOs)';
COMMENT ON COLUMN sumsub_documents.source IS 'Origem: company (empresa) ou ubo (beneficial owner)';
COMMENT ON COLUMN sumsub_documents.image_id IS 'ID único da imagem no Sumsub';
COMMENT ON COLUMN sumsub_documents.doc_set_type IS 'Tipo do conjunto de documentos no Sumsub';
COMMENT ON COLUMN sumsub_documents.doc_type IS 'Tipo específico do documento no Sumsub';
COMMENT ON COLUMN sumsub_documents.tags IS 'Array de tags para facilitar busca e organização';
COMMENT ON COLUMN sumsub_documents.deleted_at IS 'Data de exclusão (soft delete) - NULL indica documento ativo';
