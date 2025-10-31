/**
 * API Endpoint para Screening Manual de Wallets
 * GET /api/screening?wallet=TXRUVnwEZbtRvfZ7DVd1KmrG2RDxjCUU4y&memo=GS Pay
 */

import { NextRequest, NextResponse } from 'next/server';
import { performWalletScreening } from '@/lib/chainalysis';
import { generateScreeningPDF, generateScreeningPDFFilename } from '@/lib/screening-pdf';
import { sendWhatsAppNotification, createWalletScreeningNotification } from '@/lib/whatsapp-notifier';
import { createClient } from '@supabase/supabase-js';
import { addVerificationHistory } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const memo = searchParams.get('memo');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro wallet é obrigatório' },
        { status: 400 }
      );
    }

    if (!memo) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro memo é obrigatório' },
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

    console.log(`[Manual Screening] Iniciando screening para ${walletAddress} (${memo})`);

    // ========================================================================
    // PASSO 1: SCREENING CHAINALYSIS
    // ========================================================================
    const screeningResult = await performWalletScreening(walletAddress, memo);

    console.log(`[Manual Screening] Screening concluído: ${screeningResult.decision} (${screeningResult.riskLevel})`);

    // ========================================================================
    // PASSO 2: GERAR PDF
    // ========================================================================
    let pdfUrl: string | null = null;

    try {
      // Criar objeto applicant fictício para o PDF
      const applicant = {
        id: `manual_${Date.now()}`,
        external_user_id: `manual_${Date.now()}`,
        applicant_type: 'company' as const,
        current_status: 'pending' as const,
        company_name: memo,
        document_number: undefined,
        email: undefined,
      };

      const pdfBuffer = await generateScreeningPDF(screeningResult, applicant);

      // Upload para Supabase Storage
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const filename = generateScreeningPDFFilename(`manual_${Date.now()}`, walletAddress);
      const filePath = `manual/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('screening-reports')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('[Manual Screening] Erro no upload do PDF:', uploadError);
      } else {
        // Gerar signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('screening-reports')
          .createSignedUrl(filePath, 31536000); // 1 ano

        if (!signedUrlError && signedUrlData) {
          pdfUrl = signedUrlData.signedUrl;
          console.log(`[Manual Screening] PDF gerado: ${filename}`);
        }
      }
    } catch (pdfError) {
      console.error('[Manual Screening] Erro ao gerar PDF:', pdfError);
      // Continuar mesmo se o PDF falhar
    }

    // ========================================================================
    // PASSO 3: ENVIAR NOTIFICAÇÃO WHATSAPP
    // ========================================================================
    let notificationSent = false;

    try {
      const notification = createWalletScreeningNotification(
        memo,
        walletAddress,
        {
          decision: screeningResult.decision,
          riskLevel: screeningResult.riskLevel,
          isSanctioned: screeningResult.isSanctioned,
          pdfUrl: pdfUrl || undefined,
        }
      );

      await sendWhatsAppNotification(notification);
      notificationSent = true;
      console.log(`[Manual Screening] Notificação enviada`);
    } catch (notificationError) {
      console.error('[Manual Screening] Erro ao enviar notificação:', notificationError);
      // Continuar mesmo se a notificação falhar
    }

    // ========================================================================
    // RETORNAR RESULTADO
    // ========================================================================
    return NextResponse.json({
      success: true,
      address: screeningResult.address,
      decision: screeningResult.decision,
      decisionReason: screeningResult.decisionReason,
      riskLevel: screeningResult.riskLevel,
      riskReason: screeningResult.riskReason,
      addressType: screeningResult.addressType,
      isSanctioned: screeningResult.isSanctioned,
      exposures: screeningResult.exposures || [],
      pdfUrl,
      notificationSent,
      timestamp: screeningResult.timestamp,
    });

  } catch (error: any) {
    console.error('[Manual Screening] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao fazer screening',
      },
      { status: 500 }
    );
  }
}

