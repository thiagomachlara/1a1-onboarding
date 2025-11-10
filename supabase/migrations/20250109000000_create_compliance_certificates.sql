-- Tabela para armazenar certificados de compliance governamentais
CREATE TABLE IF NOT EXISTS compliance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  certificate_type VARCHAR(50) NOT NULL, -- 'CND_FEDERAL', 'CNDT', 'CND_ESTADUAL', 'CND_MUNICIPAL'
  status VARCHAR(20) NOT NULL, -- 'valid', 'invalid', 'pending', 'error', 'not_found'
  
  -- Dados do certificado
  issue_date TIMESTAMP,
  expiry_date TIMESTAMP,
  certificate_number VARCHAR(100),
  protocol_number VARCHAR(100),
  
  -- Armazenamento do PDF
  pdf_url TEXT,
  pdf_storage_path TEXT,
  
  -- Dados da consulta
  query_data JSONB, -- Dados completos retornados pela API
  error_message TEXT,
  
  -- Metadados
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  fetched_by UUID REFERENCES auth.users(id),
  last_checked_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_certificate_type CHECK (
    certificate_type IN ('CND_FEDERAL', 'CNDT', 'CND_ESTADUAL', 'CND_MUNICIPAL')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('valid', 'invalid', 'pending', 'error', 'not_found')
  )
);

-- Índices para performance
CREATE INDEX idx_compliance_certificates_company_id ON compliance_certificates(company_id);
CREATE INDEX idx_compliance_certificates_type ON compliance_certificates(certificate_type);
CREATE INDEX idx_compliance_certificates_status ON compliance_certificates(status);
CREATE INDEX idx_compliance_certificates_expiry ON compliance_certificates(expiry_date);

-- Índice composto para buscar certificados válidos de uma empresa
CREATE INDEX idx_compliance_certificates_company_valid ON compliance_certificates(company_id, certificate_type, status)
WHERE status = 'valid';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_compliance_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_certificates_updated_at
  BEFORE UPDATE ON compliance_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_certificates_updated_at();

-- RLS (Row Level Security)
ALTER TABLE compliance_certificates ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os certificados
CREATE POLICY "Admins can view all certificates"
  ON compliance_certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Política: Admins podem inserir certificados
CREATE POLICY "Admins can insert certificates"
  ON compliance_certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Política: Admins podem atualizar certificados
CREATE POLICY "Admins can update certificates"
  ON compliance_certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'authenticated'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE compliance_certificates IS 'Armazena certificados de compliance governamentais (CND, CNDT, etc)';
COMMENT ON COLUMN compliance_certificates.certificate_type IS 'Tipo do certificado: CND_FEDERAL, CNDT, CND_ESTADUAL, CND_MUNICIPAL';
COMMENT ON COLUMN compliance_certificates.status IS 'Status do certificado: valid, invalid, pending, error, not_found';
COMMENT ON COLUMN compliance_certificates.query_data IS 'Dados completos retornados pela API governamental em formato JSON';
COMMENT ON COLUMN compliance_certificates.auto_renew IS 'Se true, o certificado será renovado automaticamente quando expirar';
