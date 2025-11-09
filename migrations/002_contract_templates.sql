-- Migration: Sistema de Templates de Contratos
-- Data: 2025-11-09
-- Autor: Manus AI

-- =====================================================
-- 1. Tabela de Templates
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type TEXT NOT NULL,  -- 'contract', 'wallet_term'
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- Texto do template com variáveis
  variables JSONB NOT NULL,  -- Lista de variáveis disponíveis
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES admin_users(id),
  
  UNIQUE(template_type, version)
);

CREATE INDEX IF NOT EXISTS idx_templates_type_active ON contract_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON contract_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_type_version ON contract_templates(template_type, version DESC);

-- =====================================================
-- 2. Tabela de Histórico de Alterações
-- =====================================================

CREATE TABLE IF NOT EXISTS template_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES contract_templates(id) NOT NULL,
  changed_by UUID REFERENCES admin_users(id) NOT NULL,
  action TEXT NOT NULL,  -- 'created', 'updated', 'activated', 'deactivated'
  old_content TEXT,
  new_content TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_template ON template_change_log(template_id);
CREATE INDEX IF NOT EXISTS idx_changelog_created_at ON template_change_log(created_at DESC);

-- =====================================================
-- 3. Comentários para documentação
-- =====================================================

COMMENT ON TABLE contract_templates IS 'Armazena templates de contratos e termos com versionamento';
COMMENT ON TABLE template_change_log IS 'Registra histórico de alterações nos templates';

COMMENT ON COLUMN contract_templates.template_type IS 'Tipo do template: contract ou wallet_term';
COMMENT ON COLUMN contract_templates.version IS 'Número da versão do template';
COMMENT ON COLUMN contract_templates.content IS 'Conteúdo do template com variáveis no formato {{variavel}}';
COMMENT ON COLUMN contract_templates.variables IS 'Definição das variáveis disponíveis no template';
COMMENT ON COLUMN contract_templates.is_active IS 'Indica se esta versão está ativa (apenas uma por tipo)';
