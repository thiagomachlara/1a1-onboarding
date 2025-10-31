-- Tabela para mapear IDs curtos → URLs completas de PDFs
CREATE TABLE IF NOT EXISTS pdf_short_links (
  id TEXT PRIMARY KEY,
  full_url TEXT NOT NULL,
  applicant_id TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Índice para busca rápida por applicant_id
CREATE INDEX IF NOT EXISTS idx_pdf_short_links_applicant_id ON pdf_short_links(applicant_id);

-- Índice para busca por wallet
CREATE INDEX IF NOT EXISTS idx_pdf_short_links_wallet ON pdf_short_links(wallet_address);

-- Comentários
COMMENT ON TABLE pdf_short_links IS 'Mapeamento de IDs curtos para URLs completas de PDFs de screening';
COMMENT ON COLUMN pdf_short_links.id IS 'ID curto (6-8 caracteres) usado na URL';
COMMENT ON COLUMN pdf_short_links.full_url IS 'URL completa assinada do Supabase Storage';
COMMENT ON COLUMN pdf_short_links.accessed_count IS 'Contador de acessos ao PDF';
COMMENT ON COLUMN pdf_short_links.last_accessed_at IS 'Última vez que o PDF foi acessado';
