/**
 * Endpoint de teste do fluxo completo de screening Chainalysis
 * GET /api/test-screening?wallet=TXRUVnwEZbtRvfZ7DVd1KmrG2RDxjCUU4y
 */

import { NextRequest, NextResponse } from 'next/server';
import { performWalletScreening, formatScreeningResult } from '@/lib/chainalysis';
import { generateScreeningPDF, generateScreeningPDFFilename } from '@/lib/screening-pdf';
import { sendWhatsAppNotification, createWalletRegisteredNotification } from '@/lib/whatsapp-notifier';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro wallet é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato TRC-20
    const trc20Regex = /^T[A-Za-z1-9]{33}$/;
    if (!trc20Regex.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Endereço de wallet TRC-20 inválido' },
        { status: 400 }
      );
    }

    const results = {
      wallet: walletAddress,
      screening: null as any,
      pdf: null as any,
      notification: null as any,
      errors: [] as string[],
    };

    // Dados de teste do cliente
    const testClient = {
      id: 'test-id',
      external_user_id: 'cnpj_47377694000144',
      company_name: 'EMPRESA TESTE LTDA',
      document_number: '47377694000144',
      email: 'teste@empresa.com',
    };

    // ========================================================================
    // PASSO 1: SCREENING CHAINALYSIS
    // ========================================================================
    console.log(`[Test] Iniciando screening para ${walletAddress}`);
    
    try {
      const screeningResult = await performWalletScreening(walletAddress);
      const formattedResult = formatScreeningResult(screeningResult);
      
      results.screening = {
        success: true,
        decision: formattedResult.decision,
        riskLevel: formattedResult.riskLevel,
        isSanctioned: formattedResult.isSanctioned,
        exposuresCount: formattedResult.exposures.length,
      };

      console.log(`[Test] Screening concluído: ${formattedResult.decision} (${formattedResult.riskLevel})`);

      // ========================================================================
      // PASSO 2: GERAR PDF
      // ========================================================================
      console.log(`[Test] Gerando PDF do screening`);
      
      try {
        const pdfBuffer = await generateScreeningPDF(
          testClient,
          walletAddress,
          formattedResult
        );
        
        results.pdf = {
          success: true,
          size: pdfBuffer.length,
          sizeKB: (pdfBuffer.length / 1024).toFixed(2),
        };

        console.log(`[Test] PDF gerado: ${results.pdf.sizeKB} KB`);

        // ========================================================================
        // PASSO 3: UPLOAD PARA SUPABASE STORAGE
        // ========================================================================
        console.log(`[Test] Fazendo upload para Supabase Storage`);
        
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const filename = generateScreeningPDFFilename(testClient.external_user_id, walletAddress);
          const filePath = `${testClient.external_user_id}/${filename}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('screening-reports')
            .upload(filePath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Gerar signed URL
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('screening-reports')
            .createSignedUrl(filePath, 31536000); // 1 ano

          if (signedUrlError) {
            throw signedUrlError;
          }

          results.pdf.uploaded = true;
          results.pdf.url = signedUrlData.signedUrl;
          results.pdf.filename = filename;

          console.log(`[Test] Upload concluído: ${filename}`);

          // ========================================================================
          // PASSO 4: ENVIAR NOTIFICAÇÃO WHATSAPP
          // ========================================================================
          console.log(`[Test] Enviando notificação WhatsApp`);
          
          try {
            const notification = createWalletRegisteredNotification(
              testClient.external_user_id,
              walletAddress,
              {
                chainalysisScreening: {
                  decision: formattedResult.decision,
                  riskLevel: formattedResult.riskLevel,
                  isSanctioned: formattedResult.isSanctioned,
                  pdfUrl: signedUrlData.signedUrl,
                },
              }
            );

            await sendWhatsAppNotification(notification);
            
            results.notification = {
              success: true,
              sent: true,
            };

            console.log(`[Test] Notificação enviada com sucesso`);

          } catch (notificationError: any) {
            console.error(`[Test] Erro ao enviar notificação:`, notificationError);
            results.notification = {
              success: false,
              error: notificationError.message,
            };
            results.errors.push(`Notificação: ${notificationError.message}`);
          }

        } catch (storageError: any) {
          console.error(`[Test] Erro no upload:`, storageError);
          results.pdf.uploaded = false;
          results.pdf.error = storageError.message;
          results.errors.push(`Upload: ${storageError.message}`);
        }

      } catch (pdfError: any) {
        console.error(`[Test] Erro ao gerar PDF:`, pdfError);
        results.pdf = {
          success: false,
          error: pdfError.message,
        };
        results.errors.push(`PDF: ${pdfError.message}`);
      }

    } catch (screeningError: any) {
      console.error(`[Test] Erro no screening:`, screeningError);
      results.screening = {
        success: false,
        error: screeningError.message,
      };
      results.errors.push(`Screening: ${screeningError.message}`);
    }

    // Retornar resultados
    return NextResponse.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0 
        ? '✅ Teste concluído com sucesso! Verifique o WhatsApp.' 
        : '⚠️ Teste concluído com erros.',
      results,
    });

  } catch (error: any) {
    console.error('[Test] Erro geral:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

