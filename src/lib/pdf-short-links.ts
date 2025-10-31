/**
 * Sistema de Links Curtos para PDFs
 * 
 * Converte URLs longas do Supabase Storage em links curtos e profissionais
 * Exemplo: onboarding.1a1cripto.com/pdf/a7f9k2
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Gera um ID curto aleatório (6 caracteres)
 * Usa caracteres alfanuméricos (exceto caracteres confusos: 0, O, I, l)
 */
function generateShortId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // 30 caracteres
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Cria um link curto para uma URL de PDF
 * 
 * @param fullUrl - URL completa assinada do Supabase Storage
 * @param applicantId - ID do aplicante (opcional)
 * @param walletAddress - Endereço da wallet (opcional)
 * @returns ID curto gerado
 */
export async function createShortLink(
  fullUrl: string,
  applicantId?: string,
  walletAddress?: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Gerar ID único (tentar até 5 vezes em caso de colisão)
  let shortId: string | null = null;
  let attempts = 0;
  
  while (!shortId && attempts < 5) {
    const candidateId = generateShortId();
    
    // Verificar se ID já existe
    const { data: existing } = await supabase
      .from('pdf_short_links')
      .select('id')
      .eq('id', candidateId)
      .single();
    
    if (!existing) {
      shortId = candidateId;
    }
    
    attempts++;
  }
  
  if (!shortId) {
    throw new Error('Falha ao gerar ID único após 5 tentativas');
  }
  
  // Inserir no banco
  const { error } = await supabase
    .from('pdf_short_links')
    .insert({
      id: shortId,
      full_url: fullUrl,
      applicant_id: applicantId,
      wallet_address: walletAddress,
    });
  
  if (error) {
    console.error('[Short Links] Erro ao criar link curto:', error);
    throw new Error('Falha ao criar link curto');
  }
  
  return shortId;
}

/**
 * Busca a URL completa a partir de um ID curto
 * 
 * @param shortId - ID curto (6 caracteres)
 * @returns URL completa ou null se não encontrado
 */
export async function getFullUrl(shortId: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase
    .from('pdf_short_links')
    .select('full_url')
    .eq('id', shortId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.full_url;
}

/**
 * Incrementa o contador de acessos de um link curto
 * 
 * @param shortId - ID curto (6 caracteres)
 */
export async function trackAccess(shortId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  await supabase.rpc('increment_pdf_access', { link_id: shortId });
}

/**
 * Gera URL curta completa para uso em notificações
 * 
 * @param shortId - ID curto (6 caracteres)
 * @returns URL completa: https://onboarding.1a1cripto.com/pdf/{shortId}
 */
export function buildShortUrl(shortId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
  return `${baseUrl}/pdf/${shortId}`;
}

