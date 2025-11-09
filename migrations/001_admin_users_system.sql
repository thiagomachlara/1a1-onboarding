-- Migration: Sistema de Múltiplos Usuários Admin
-- Data: 2025-11-09
-- Autor: Manus AI

-- =====================================================
-- 1. Tabela de Permissões por Role
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir permissões padrão
INSERT INTO admin_permissions (role, permissions, description) VALUES
('super_admin', '{
  "companies": {"view": true, "edit_status": true, "delete": true},
  "notes": {"create": true, "edit_own": true, "edit_all": true, "delete": true},
  "wallets": {"approve": true, "reject": true},
  "users": {"view": true, "create": true, "edit": true, "delete": true},
  "templates": {"view": true, "edit": true},
  "audit_logs": {"view_own": true, "view_all": true}
}'::jsonb, 'Super Administrador - Acesso total ao sistema'),

('compliance_officer', '{
  "companies": {"view": true, "edit_status": true, "delete": false},
  "notes": {"create": true, "edit_own": true, "edit_all": false, "delete": false},
  "wallets": {"approve": true, "reject": true},
  "users": {"view": false, "create": false, "edit": false, "delete": false},
  "templates": {"view": true, "edit": false},
  "audit_logs": {"view_own": true, "view_all": false}
}'::jsonb, 'Compliance Officer - Análise de risco e aprovações'),

('analyst', '{
  "companies": {"view": true, "edit_status": false, "delete": false},
  "notes": {"create": true, "edit_own": true, "edit_all": false, "delete": false},
  "wallets": {"approve": false, "reject": false},
  "users": {"view": false, "create": false, "edit": false, "delete": false},
  "templates": {"view": true, "edit": false},
  "audit_logs": {"view_own": true, "view_all": false}
}'::jsonb, 'Analista - Visualização e notas'),

('read_only', '{
  "companies": {"view": true, "edit_status": false, "delete": false},
  "notes": {"create": false, "edit_own": false, "edit_all": false, "delete": false},
  "wallets": {"approve": false, "reject": false},
  "users": {"view": false, "create": false, "edit": false, "delete": false},
  "templates": {"view": true, "edit": false},
  "audit_logs": {"view_own": false, "view_all": false}
}'::jsonb, 'Somente Leitura - Auditoria externa');

-- =====================================================
-- 2. Tabela de Convites
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES admin_users(id) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON admin_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON admin_invites(expires_at);

-- =====================================================
-- 3. Tabela de Auditoria
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'approve', 'reject'
  resource_type TEXT NOT NULL,  -- 'company', 'note', 'wallet', 'user', 'template'
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);

-- =====================================================
-- 4. Atualizar tabela admin_users existente
-- =====================================================

-- Adicionar constraint para role (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('super_admin', 'compliance_officer', 'analyst', 'read_only'));
  END IF;
END $$;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- =====================================================
-- 5. Comentários para documentação
-- =====================================================

COMMENT ON TABLE admin_permissions IS 'Armazena as permissões para cada role de usuário admin';
COMMENT ON TABLE admin_invites IS 'Gerencia convites para novos usuários admin';
COMMENT ON TABLE admin_audit_log IS 'Registra todas as ações realizadas por usuários admin';

COMMENT ON COLUMN admin_permissions.permissions IS 'Objeto JSONB com permissões granulares por recurso';
COMMENT ON COLUMN admin_invites.token IS 'Token único para validação do convite';
COMMENT ON COLUMN admin_audit_log.old_value IS 'Valor anterior do recurso (para updates)';
COMMENT ON COLUMN admin_audit_log.new_value IS 'Novo valor do recurso (para creates e updates)';
