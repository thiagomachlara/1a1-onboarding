-- Schema do Banco de Dados - 1A1 Onboarding
-- Criado em: 2025-10-31
-- Descrição: Armazena dados de verificação KYC/KYB e dados de negócio

-- =====================================================
-- TABELA: applicants
-- Armazena dados principais dos applicants
-- =====================================================
CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores
  external_user_id TEXT NOT NULL UNIQUE, -- cpf_xxx ou cnpj_xxx
  applicant_id TEXT UNIQUE, -- ID do Sumsub
  inspection_id TEXT, -- ID da inspeção do Sumsub
  
  -- Tipo e Status
  applicant_type TEXT NOT NULL CHECK (applicant_type IN ('individual', 'company')),
  current_status TEXT NOT NULL DEFAULT 'created' CHECK (current_status IN ('created', 'pending', 'approved', 'rejected', 'onHold')),
  review_answer TEXT CHECK (review_answer IN ('GREEN', 'RED', 'YELLOW')),
  
  -- Dados Pessoais/Empresariais
  document_number TEXT, -- CPF ou CNPJ limpo (apenas números)
  full_name TEXT, -- Nome completo ou Razão Social
  email TEXT,
  phone TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_verification_at TIMESTAMPTZ,
  last_verification_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Dados do Sumsub
  sumsub_level_name TEXT, -- Nome do level (auto-kyb, basic-kyc, etc)
  sumsub_review_result JSONB, -- Resultado completo da revisão
  rejection_reason TEXT,
  
  -- Índices para busca rápida
  CONSTRAINT external_user_id_format CHECK (
    external_user_id ~ '^(cpf|cnpj)_[0-9]+$'
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_applicants_external_user_id ON applicants(external_user_id);
CREATE INDEX IF NOT EXISTS idx_applicants_applicant_id ON applicants(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicants_document_number ON applicants(document_number);
CREATE INDEX IF NOT EXISTS idx_applicants_current_status ON applicants(current_status);
CREATE INDEX IF NOT EXISTS idx_applicants_applicant_type ON applicants(applicant_type);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON applicants(created_at DESC);

-- =====================================================
-- TABELA: verification_history
-- Histórico completo de mudanças de status
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  
  -- Dados do Evento
  event_type TEXT NOT NULL, -- applicantCreated, applicantPending, applicantReviewed, etc
  old_status TEXT,
  new_status TEXT NOT NULL,
  review_answer TEXT CHECK (review_answer IN ('GREEN', 'RED', 'YELLOW')),
  
  -- Metadados
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id TEXT, -- ID de correlação do Sumsub
  
  -- Payload completo do webhook
  webhook_payload JSONB,
  
  -- Observações
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_verification_history_applicant_id ON verification_history(applicant_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_occurred_at ON verification_history(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_event_type ON verification_history(event_type);

-- =====================================================
-- TABELA: business_data
-- Dados de negócio (wallet, contratos, limites)
-- =====================================================
CREATE TABLE IF NOT EXISTS business_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL UNIQUE REFERENCES applicants(id) ON DELETE CASCADE,
  
  -- Wallet USDT
  usdt_wallet_address TEXT,
  usdt_network TEXT CHECK (usdt_network IN ('TRC20', 'ERC20', 'BEP20')),
  wallet_verified BOOLEAN DEFAULT FALSE,
  wallet_added_at TIMESTAMPTZ,
  
  -- Contrato
  contract_signed BOOLEAN DEFAULT FALSE,
  contract_signed_at TIMESTAMPTZ,
  contract_document_url TEXT,
  contract_ip_address INET,
  
  -- Limites de Transação
  daily_limit_usd NUMERIC(15, 2),
  monthly_limit_usd NUMERIC(15, 2),
  transaction_limit_usd NUMERIC(15, 2),
  
  -- Tags e Categorização
  client_tier TEXT CHECK (client_tier IN ('basic', 'standard', 'premium', 'vip')),
  tags TEXT[], -- Array de tags personalizadas
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Observações internas
  internal_notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_business_data_applicant_id ON business_data(applicant_id);
CREATE INDEX IF NOT EXISTS idx_business_data_usdt_wallet_address ON business_data(usdt_wallet_address);
CREATE INDEX IF NOT EXISTS idx_business_data_client_tier ON business_data(client_tier);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para applicants
DROP TRIGGER IF EXISTS update_applicants_updated_at ON applicants;
CREATE TRIGGER update_applicants_updated_at
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para business_data
DROP TRIGGER IF EXISTS update_business_data_updated_at ON business_data;
CREATE TRIGGER update_business_data_updated_at
  BEFORE UPDATE ON business_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View: Applicants com dados de negócio
CREATE OR REPLACE VIEW v_applicants_full AS
SELECT 
  a.*,
  b.usdt_wallet_address,
  b.usdt_network,
  b.wallet_verified,
  b.contract_signed,
  b.contract_signed_at,
  b.client_tier,
  b.tags,
  b.daily_limit_usd,
  b.monthly_limit_usd
FROM applicants a
LEFT JOIN business_data b ON a.id = b.applicant_id;

-- View: Estatísticas gerais
CREATE OR REPLACE VIEW v_verification_stats AS
SELECT 
  applicant_type,
  current_status,
  COUNT(*) as total,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM applicants
GROUP BY applicant_type, current_status;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_data ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura para usuários autenticados
CREATE POLICY "Allow read for authenticated users" ON applicants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read for authenticated users" ON verification_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read for authenticated users" ON business_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Permitir escrita para service_role (backend)
CREATE POLICY "Allow all for service_role" ON applicants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for service_role" ON verification_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for service_role" ON business_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE applicants IS 'Armazena dados principais dos applicants verificados via Sumsub';
COMMENT ON TABLE verification_history IS 'Histórico completo de mudanças de status e eventos de verificação';
COMMENT ON TABLE business_data IS 'Dados de negócio como wallet USDT, contratos e limites de transação';

COMMENT ON COLUMN applicants.external_user_id IS 'Identificador único no formato cpf_xxx ou cnpj_xxx';
COMMENT ON COLUMN applicants.applicant_id IS 'ID do applicant no Sumsub';
COMMENT ON COLUMN applicants.current_status IS 'Status atual: created, pending, approved, rejected, onHold';
COMMENT ON COLUMN applicants.review_answer IS 'Resultado da revisão: GREEN (aprovado), RED (rejeitado), YELLOW (revisão manual)';

COMMENT ON COLUMN business_data.usdt_wallet_address IS 'Endereço da wallet USDT do cliente';
COMMENT ON COLUMN business_data.usdt_network IS 'Rede da wallet: TRC20, ERC20 ou BEP20';
COMMENT ON COLUMN business_data.client_tier IS 'Nível do cliente: basic, standard, premium, vip';

