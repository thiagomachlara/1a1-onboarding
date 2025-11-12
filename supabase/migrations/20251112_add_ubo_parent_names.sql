-- Migration: Adicionar campos de nome da mãe e pai para UBOs
-- Data: 2025-11-12
-- Objetivo: Permitir emissão de Antecedentes Criminais e Mandados de Prisão

-- Adicionar colunas
ALTER TABLE beneficial_owners
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT;

-- Comentários
COMMENT ON COLUMN beneficial_owners.mother_name IS 'Nome da mãe do UBO (necessário para Antecedentes Criminais e Mandados de Prisão)';
COMMENT ON COLUMN beneficial_owners.father_name IS 'Nome do pai do UBO (necessário para Antecedentes Criminais)';
