/**
 * Script CLI para Gerar Link de Contrato
 * 
 * Uso:
 * 
 * Por CNPJ/CPF:
 *   npx tsx scripts/generate-contract-link.ts 12345678000190
 * 
 * Por External User ID:
 *   npx tsx scripts/generate-contract-link.ts cnpj_12345678000190
 * 
 * Por Applicant ID (UUID):
 *   npx tsx scripts/generate-contract-link.ts 550e8400-e29b-41d4-a716-446655440000
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gera ou reutiliza token válido para contrato
 */
async function generateContractToken(applicantId: string): Promise<string> {
  // Verificar se já existe token válido
  const { data: existingApplicant } = await supabase
    .from('applicants')
    .select('contract_token, contract_token_expires_at, contract_signed_at')
    .eq('id', applicantId)
    .single();
  
  // Reutilizar token se ainda válido e não assinado
  if (existingApplicant?.contract_token && !existingApplicant.contract_signed_at) {
    const expiresAt = new Date(existingApplicant.contract_token_expires_at);
    const now = new Date();
    
    // Se ainda tem mais de 1 dia de validade, reutilizar
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (expiresAt > oneDayFromNow) {
      console.log('✅ Reutilizando token válido existente');
      console.log(`   Expira em: ${expiresAt.toISOString()}`);
      console.log(`   Dias restantes: ${Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))}`);
      return existingApplicant.contract_token;
    }
  }
  
  // Gerar novo token
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

  const { error } = await supabase
    .from('applicants')
    .update({
      contract_token: token,
      contract_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', applicantId);

  if (error) {
    throw new Error(`Erro ao gerar token: ${error.message}`);
  }

  console.log('✅ Novo token gerado');
  console.log(`   Expira em: ${expiresAt.toISOString()}`);
  
  return token;
}

/**
 * Gera URL completa do magic link
 */
function generateContractLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
  return `${baseUrl}/contract?token=${token}`;
}

/**
 * Busca applicant por identificador
 */
async function findApplicant(identifier: string) {
  let query = supabase.from('applicants').select('*');

  // Tentar detectar tipo de identificador
  if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    // UUID (applicant ID)
    query = query.eq('id', identifier);
  } else if (identifier.startsWith('cnpj_') || identifier.startsWith('cpf_')) {
    // External User ID
    query = query.eq('external_user_id', identifier);
  } else {
    // Documento (CNPJ/CPF)
    const cleanDoc = identifier.replace(/\D/g, '');
    const externalUserIdCnpj = `cnpj_${cleanDoc}`;
    const externalUserIdCpf = `cpf_${cleanDoc}`;
    query = query.or(`external_user_id.eq.${externalUserIdCnpj},external_user_id.eq.${externalUserIdCpf}`);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error(`Applicant não encontrado: ${identifier}`);
  }

  return data;
}

/**
 * Main
 */
async function main() {
  const identifier = process.argv[2];

  if (!identifier) {
    console.error('❌ Erro: Forneça um identificador (CNPJ, CPF, external_user_id ou applicant_id)');
    console.log('');
    console.log('Exemplos:');
    console.log('  npx tsx scripts/generate-contract-link.ts 12345678000190');
    console.log('  npx tsx scripts/generate-contract-link.ts cnpj_12345678000190');
    console.log('  npx tsx scripts/generate-contract-link.ts 550e8400-e29b-41d4-a716-446655440000');
    process.exit(1);
  }

  try {
    console.log('🔍 Buscando applicant...');
    const applicant = await findApplicant(identifier);

    console.log('');
    console.log('📋 Applicant encontrado:');
    console.log(`   ID: ${applicant.id}`);
    console.log(`   External User ID: ${applicant.external_user_id}`);
    console.log(`   Tipo: ${applicant.applicant_type === 'company' ? 'Empresa (PJ)' : 'Pessoa Física (PF)'}`);
    console.log(`   Nome: ${applicant.company_name || applicant.full_name}`);
    console.log(`   Email: ${applicant.email || 'N/A'}`);
    console.log(`   Documento: ${applicant.document_number || 'N/A'}`);
    console.log(`   Status: ${applicant.current_status}`);
    console.log(`   Review Answer: ${applicant.review_answer || 'N/A'}`);
    console.log('');

    // Verificar se foi aprovado
    if (applicant.current_status !== 'approved' && applicant.review_answer !== 'GREEN') {
      console.error('❌ Erro: Applicant não está aprovado');
      console.log(`   Status atual: ${applicant.current_status}`);
      console.log(`   Review Answer: ${applicant.review_answer || 'N/A'}`);
      console.log('');
      console.log('   Apenas applicants aprovados podem receber link de contrato.');
      process.exit(1);
    }

    // Verificar se já assinou
    if (applicant.contract_signed_at) {
      console.log('⚠️  Aviso: Contrato já foi assinado em', applicant.contract_signed_at);
      console.log('   Um novo link será gerado, mas o contrato anterior já está assinado.');
      console.log('');
    }

    // Gerar link
    console.log('🔗 Gerando link de contrato...');
    const token = await generateContractToken(applicant.id);
    const contractLink = generateContractLink(token);

    console.log('');
    console.log('✅ Link de contrato gerado com sucesso!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   ${contractLink}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📲 Envie este link para o cliente via WhatsApp ou email.');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
