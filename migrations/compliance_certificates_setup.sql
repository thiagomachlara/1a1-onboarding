-- Migration: Setup compliance certificates structure
-- Created: 2025-11-10

-- 1. Adicionar novos campos na tabela compliance_certificates existente
ALTER TABLE compliance_certificates
ADD COLUMN IF NOT EXISTS infosimples_service VARCHAR(100),
ADD COLUMN IF NOT EXISTS infosimples_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS infosimples_response JSONB,
ADD COLUMN IF NOT EXISTS manual_url TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- 2. Criar tabela de configuração de tipos de certidões
CREATE TABLE IF NOT EXISTS compliance_certificate_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('PJ', 'PF')),
  source VARCHAR(100) NOT NULL,
  infosimples_service VARCHAR(100),
  manual_url TEXT,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir dados das certidões para Pessoa Jurídica (PJ)
INSERT INTO compliance_certificate_types (id, name, description, entity_type, source, infosimples_service, manual_url, is_required, display_order) VALUES
('qsa', 'QSA - Quadro de Sócios', 'Quadro de Sócios e Administradores', 'PJ', 'Receita Federal', 'receita-federal/cnpj', 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', true, 1),
('cnd_federal', 'CND Federal', 'Certidão Negativa de Débitos Federais', 'PJ', 'Receita Federal (PGFN)', 'receita-federal/pgfn', 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home', true, 2),
('cndt', 'CNDT', 'Certidão Negativa de Débitos Trabalhistas', 'PJ', 'TST', 'tribunal/tst/cndt', 'https://cndt-certidao.tst.jus.br/inicio.faces', true, 3),
('trf', 'Certidão Unificada TRF', 'Certidão Unificada da Justiça Federal', 'PJ', 'Justiça Federal', 'tribunal/trf/cert-unificada', 'https://certidao-unificada.cjf.jus.br/#/solicitacao-certidao', true, 4),
('mte', 'Infrações Trabalhistas', 'Certidão de Infrações Trabalhistas', 'PJ', 'MTE', 'mte/certidao-debitos', 'https://eprocesso.sit.trabalho.gov.br/Certidao/Emitir', true, 5),
('fgts', 'CRF - FGTS', 'Certificado de Regularidade do FGTS', 'PJ', 'Caixa', 'caixa/regularidade', 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf', true, 6),
('cvm_processos', 'Processos CVM', 'Processos Administrativos Sancionadores CVM', 'PJ', 'CVM', 'cvm/processo-administrativo', 'https://www.gov.br/cvm', false, 7),
('protestos', 'Protestos', 'Certidão de Protestos', 'PJ', 'CENPROT/IEPTB', 'cenprot-sp/protestos', null, false, 8),
('cheques_sem_fundo', 'Cheques sem Fundos', 'Relatório de Cheques sem Fundos', 'PJ', 'Banco Central', 'bcb/cheques-sem-fundo', null, false, 9),
('improbidade', 'Improbidade Administrativa', 'Cadastro Nacional de Improbidade Administrativa', 'PJ', 'CNJ', 'cnj/improbidade', 'https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php', false, 10)
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir dados das certidões para Pessoa Física (PF)
INSERT INTO compliance_certificate_types (id, name, description, entity_type, source, infosimples_service, manual_url, is_required, display_order) VALUES
('pf_cpf', 'Situação Cadastral CPF', 'Consulta Situação Cadastral do CPF', 'PF', 'Receita Federal', 'receita-federal/cpf', 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp', true, 11),
('pf_cnd_federal', 'CND Federal', 'Certidão Negativa de Débitos Federais', 'PF', 'Receita Federal (PGFN)', 'receita-federal/pgfn', 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home', true, 12),
('pf_cndt', 'CNDT', 'Certidão Negativa de Débitos Trabalhistas', 'PF', 'TST', 'tribunal/tst/cndt', 'https://cndt-certidao.tst.jus.br/inicio.faces', true, 13),
('pf_trf', 'Certidão Unificada TRF', 'Certidão Unificada da Justiça Federal', 'PF', 'Justiça Federal', 'tribunal/trf/cert-unificada', 'https://certidao-unificada.cjf.jus.br/#/solicitacao-certidao', true, 14),
('pf_antecedentes', 'Antecedentes Criminais', 'Certidão de Antecedentes Criminais', 'PF', 'Polícia Federal', 'antecedentes-criminais/pf/emit', 'https://servicos.pf.gov.br/epol-sinic-publico/', true, 15),
('pf_mandados', 'Mandados de Prisão', 'Banco Nacional de Mandados de Prisão', 'PF', 'CNJ (BNMP)', 'cnj/mandados-prisao', 'https://portalbnmp.cnj.jus.br/#/pesquisa-peca', true, 16),
('pf_cvm_processos', 'Processos CVM', 'Processos Administrativos Sancionadores CVM', 'PF', 'CVM', 'cvm/processo-administrativo', 'https://www.gov.br/cvm', false, 17),
('pf_protestos', 'Protestos', 'Certidão de Protestos', 'PF', 'IEPTB', 'ieptb/protestos', null, false, 18),
('pf_cheques_sem_fundo', 'Cheques sem Fundos', 'Relatório de Cheques sem Fundos', 'PF', 'Banco Central', 'bcb/cheques-sem-fundo', null, false, 19),
('pf_improbidade', 'Improbidade Administrativa', 'Cadastro Nacional de Improbidade Administrativa', 'PF', 'CNJ', 'cnj/improbidade', 'https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php', false, 20)
ON CONFLICT (id) DO NOTHING;

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_compliance_certificate_types_entity ON compliance_certificate_types(entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_certificate_types_order ON compliance_certificate_types(display_order);

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE compliance_certificate_types ENABLE ROW LEVEL SECURITY;

-- 7. Criar policies para compliance_certificate_types
CREATE POLICY "Admins can view all certificate types"
  ON compliance_certificate_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert certificate types"
  ON compliance_certificate_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update certificate types"
  ON compliance_certificate_types FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete certificate types"
  ON compliance_certificate_types FOR DELETE
  TO authenticated
  USING (true);
