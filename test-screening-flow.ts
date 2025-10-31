/**
 * Script de teste do fluxo completo de screening Chainalysis
 * Testa: Screening → PDF → Upload → Notificação
 */

import { performWalletScreening, formatScreeningResult } from './src/lib/chainalysis';
import { generateScreeningPDF, generateScreeningPDFFilename } from './src/lib/screening-pdf';
import { sendWhatsAppNotification, createWalletRegisteredNotification } from './src/lib/whatsapp-notifier';
import { createClient } from '@supabase/supabase-js';

const WALLET_ADDRESS = 'TXRUVnwEZbtRvfZ7DVd1KmrG2RDxjCUU4y';
const EXTERNAL_USER_ID = 'cnpj_47377694000144';

// Dados de teste do cliente
const TEST_CLIENT = {
  id: 'test-id',
  external_user_id: EXTERNAL_USER_ID,
  company_name: 'EMPRESA TESTE LTDA',
  document_number: '47377694000144',
  email: 'teste@empresa.com',
};

async function testScreeningFlow() {
  console.log('🚀 Iniciando teste do fluxo completo de screening...\n');

  try {
    // ========================================================================
    // PASSO 1: SCREENING CHAINALYSIS
    // ========================================================================
    console.log('📊 PASSO 1: Screening Chainalysis');
    console.log(`   Wallet: ${WALLET_ADDRESS}`);
    
    const screeningResult = await performWalletScreening(WALLET_ADDRESS);
    const formattedResult = formatScreeningResult(screeningResult);
    
    console.log(`   ✅ Screening concluído!`);
    console.log(`   Decisão: ${formattedResult.decision}`);
    console.log(`   Risco: ${formattedResult.riskLevel}`);
    console.log(`   Sancionada: ${formattedResult.isSanctioned ? 'Sim' : 'Não'}`);
    console.log(`   Exposições: ${formattedResult.exposures.length} categorias\n`);

    // ========================================================================
    // PASSO 2: GERAR PDF
    // ========================================================================
    console.log('📄 PASSO 2: Gerando PDF do screening');
    
    const pdfBuffer = await generateScreeningPDF(
      TEST_CLIENT,
      WALLET_ADDRESS,
      formattedResult
    );
    
    console.log(`   ✅ PDF gerado! Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // ========================================================================
    // PASSO 3: UPLOAD PARA SUPABASE STORAGE
    // ========================================================================
    console.log('☁️  PASSO 3: Upload para Supabase Storage');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filename = generateScreeningPDFFilename(EXTERNAL_USER_ID, WALLET_ADDRESS);
    const filePath = `${EXTERNAL_USER_ID}/${filename}`;
    
    console.log(`   Arquivo: ${filePath}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screening-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    console.log(`   ✅ Upload concluído!`);

    // Gerar signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('screening-reports')
      .createSignedUrl(filePath, 31536000); // 1 ano

    if (signedUrlError) {
      throw new Error(`Erro ao gerar signed URL: ${signedUrlError.message}`);
    }

    const pdfUrl = signedUrlData.signedUrl;
    console.log(`   📎 URL do PDF: ${pdfUrl}\n`);

    // ========================================================================
    // PASSO 4: ENVIAR NOTIFICAÇÃO WHATSAPP
    // ========================================================================
    console.log('📱 PASSO 4: Enviando notificação WhatsApp');
    
    const notification = createWalletRegisteredNotification(
      TEST_CLIENT.external_user_id,
      WALLET_ADDRESS,
      {
        chainalysisScreening: {
          decision: formattedResult.decision,
          riskLevel: formattedResult.riskLevel,
          isSanctioned: formattedResult.isSanctioned,
          pdfUrl: pdfUrl,
        },
      }
    );

    await sendWhatsAppNotification(notification);
    
    console.log(`   ✅ Notificação enviada!\n`);

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📊 RESULTADO DO SCREENING:`);
    console.log(`   Wallet: ${WALLET_ADDRESS}`);
    console.log(`   Decisão: ${formattedResult.decision}`);
    console.log(`   Risco: ${formattedResult.riskLevel}`);
    console.log(`   Sancionada: ${formattedResult.isSanctioned ? 'Sim' : 'Não'}`);
    console.log(`\n📄 PDF GERADO:`);
    console.log(`   Arquivo: ${filename}`);
    console.log(`   Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   URL: ${pdfUrl}`);
    console.log(`\n📱 NOTIFICAÇÃO WHATSAPP:`);
    console.log(`   Status: Enviada`);
    console.log(`   Grupo: ${process.env.WHATSAPP_GROUP_ID}`);
    console.log('\n✅ Verifique o WhatsApp para confirmar o recebimento!\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    process.exit(1);
  }
}

// Executar teste
testScreeningFlow();

