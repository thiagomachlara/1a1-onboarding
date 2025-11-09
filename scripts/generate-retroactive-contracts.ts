/**
 * Script para gerar PDFs retroativos de contratos assinados
 * 
 * Este script busca todas as empresas com contract_signed_at preenchido
 * mas sem contract_pdf_url, gera os PDFs com os dados históricos de assinatura,
 * faz upload para o Supabase Storage e atualiza o banco de dados.
 */

import { createClient } from '@supabase/supabase-js';
import { generateContractPDF } from '../src/lib/contract-pdf';

// Configurar cliente Supabase com service_role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Applicant {
  id: string;
  external_user_id: string;
  company_name: string;
  contract_signed_at: string;
  contract_ip: string;
  contract_user_agent: string;
  contract_pdf_url: string | null;
  // Adicionar outros campos necessários para generateContractPDF
  applicant_type: string;
  document_number: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

async function generateRetroactiveContracts() {
  console.log('🔍 Buscando empresas com contratos assinados sem PDF...\n');

  // Buscar empresas com contrato assinado mas sem PDF
  const { data: applicants, error } = await supabase
    .from('applicants')
    .select('*')
    .not('contract_signed_at', 'is', null)
    .or('contract_pdf_url.is.null,contract_pdf_url.eq.')
    .order('contract_signed_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error);
    process.exit(1);
  }

  if (!applicants || applicants.length === 0) {
    console.log('✅ Nenhuma empresa encontrada com contratos sem PDF!');
    return;
  }

  console.log(`📋 Encontradas ${applicants.length} empresas:\n`);
  applicants.forEach((app, index) => {
    console.log(`${index + 1}. ${app.company_name}`);
    console.log(`   - ID: ${app.id}`);
    console.log(`   - Assinado em: ${new Date(app.contract_signed_at).toLocaleString('pt-BR')}`);
    console.log(`   - IP: ${app.contract_ip}`);
    console.log('');
  });

  console.log('🚀 Iniciando geração de PDFs retroativos...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const applicant of applicants) {
    try {
      console.log(`📄 Processando: ${applicant.company_name}...`);

      // Gerar PDF com dados históricos
      const pdfData = generateContractPDF({
        applicant: applicant as any,
        signedAt: applicant.contract_signed_at,
        ip: applicant.contract_ip,
        userAgent: applicant.contract_user_agent,
      });

      console.log('   ✓ PDF gerado');

      // Fazer upload para Storage
      const fileName = `contract_${applicant.external_user_id}_${new Date(applicant.contract_signed_at).getTime()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, pdfData, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error(`   ❌ Erro no upload: ${uploadError.message}`);
        errorCount++;
        continue;
      }

      console.log(`   ✓ Upload concluído: ${fileName}`);

      // Atualizar banco de dados com o nome do arquivo
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ contract_pdf_url: fileName })
        .eq('id', applicant.id);

      if (updateError) {
        console.error(`   ❌ Erro ao atualizar banco: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log('   ✓ Banco de dados atualizado');
      console.log('   ✅ Sucesso!\n');
      successCount++;

    } catch (error) {
      console.error(`   ❌ Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA EXECUÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Sucesso: ${successCount} PDFs gerados`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📋 Total: ${applicants.length} empresas processadas`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.log('⚠️  Alguns PDFs não foram gerados. Verifique os erros acima.');
    process.exit(1);
  }

  console.log('🎉 Todos os PDFs foram gerados com sucesso!');
}

// Executar script
generateRetroactiveContracts()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
