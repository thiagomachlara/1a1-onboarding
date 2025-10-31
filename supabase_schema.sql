-- Schema do banco de dados para sistema de onboarding 1A1 Cripto
-- Supabase PostgreSQL

-- ============================================
-- Tabela de verificações (applicants)
-- ============================================
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    external_user_id VARCHAR(255) UNIQUE NOT NULL,
    applicant_id VARCHAR(255) UNIQUE,
    inspection_id VARCHAR(255),
    
    -- Tipo de verificação
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('individual', 'company')),
    level_name VARCHAR(50) NOT NULL,
    
    -- Status da verificação
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    review_status VARCHAR(50),
    review_answer VARCHAR(20), -- GREEN, RED, YELLOW
    
    -- Informações pessoais/empresariais
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    document_number VARCHAR(50), -- CPF ou CNPJ
    
    -- Informações da empresa (para KYB)
    company_name VARCHAR(255),
    company_registration_number VARCHAR(50), -- CNPJ
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Dados adicionais (JSON para flexibilidade)
    metadata JSONB DEFAULT '{}'::jsonb,
    review_details JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_verifications_external_user_id ON verifications(external_user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_applicant_id ON verifications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_verification_type ON verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON verifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_document_number ON verifications(document_number);

-- ============================================
-- Tabela de eventos de webhook
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência à verificação
    verification_id UUID REFERENCES verifications(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255),
    applicant_id VARCHAR(255),
    
    -- Dados do evento
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Metadados
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_events_verification_id ON webhook_events(verification_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- ============================================
-- Tabela de documentos
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência à verificação
    verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
    
    -- Informações do documento
    document_type VARCHAR(50) NOT NULL, -- ID_CARD, PASSPORT, COMPANY_DOC, etc.
    document_subtype VARCHAR(50),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Metadados
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Dados adicionais
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_verification_id ON documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ============================================
-- Tabela de auditoria (logs)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência à verificação
    verification_id UUID REFERENCES verifications(id) ON DELETE CASCADE,
    
    -- Informações do evento
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    
    -- Usuário/sistema que gerou o evento
    actor VARCHAR(100), -- 'system', 'admin', 'webhook', etc.
    
    -- Dados do evento
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_verification_id ON audit_logs(verification_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- Função para atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at na tabela verifications
CREATE TRIGGER update_verifications_updated_at
    BEFORE UPDATE ON verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) - Segurança
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir acesso via service role key)
-- Para uso em APIs backend com autenticação própria

-- Política para verifications
CREATE POLICY "Enable all access for service role" ON verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para webhook_events
CREATE POLICY "Enable all access for service role" ON webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para documents
CREATE POLICY "Enable all access for service role" ON documents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para audit_logs
CREATE POLICY "Enable all access for service role" ON audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Views úteis para dashboard
-- ============================================

-- View de estatísticas gerais
CREATE OR REPLACE VIEW verification_stats AS
SELECT
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE verification_type = 'individual') as total_individuals,
    COUNT(*) FILTER (WHERE verification_type = 'company') as total_companies,
    COUNT(*) FILTER (WHERE status = 'created') as status_created,
    COUNT(*) FILTER (WHERE status = 'pending') as status_pending,
    COUNT(*) FILTER (WHERE review_answer = 'GREEN') as approved,
    COUNT(*) FILTER (WHERE review_answer = 'RED') as rejected,
    COUNT(*) FILTER (WHERE review_answer = 'YELLOW') as under_review,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
FROM verifications;

-- View de verificações recentes
CREATE OR REPLACE VIEW recent_verifications AS
SELECT
    v.id,
    v.external_user_id,
    v.verification_type,
    v.full_name,
    v.company_name,
    v.email,
    v.status,
    v.review_answer,
    v.created_at,
    v.reviewed_at,
    COUNT(d.id) as document_count
FROM verifications v
LEFT JOIN documents d ON v.id = d.verification_id
GROUP BY v.id
ORDER BY v.created_at DESC
LIMIT 100;

-- ============================================
-- Comentários nas tabelas
-- ============================================

COMMENT ON TABLE verifications IS 'Armazena informações sobre verificações KYC/KYB';
COMMENT ON TABLE webhook_events IS 'Registra eventos recebidos via webhook do Sumsub';
COMMENT ON TABLE documents IS 'Armazena metadados dos documentos enviados';
COMMENT ON TABLE audit_logs IS 'Log de auditoria de todas as ações no sistema';

COMMENT ON COLUMN verifications.external_user_id IS 'ID único gerado pela aplicação (individual_* ou company_*)';
COMMENT ON COLUMN verifications.applicant_id IS 'ID do applicant no Sumsub';
COMMENT ON COLUMN verifications.review_answer IS 'Resultado da revisão: GREEN (aprovado), RED (rejeitado), YELLOW (revisão)';

