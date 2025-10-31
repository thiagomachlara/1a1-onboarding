import { NextRequest, NextResponse } from 'next/server';
import { validateWalletToken, saveWallet } from '@/lib/magic-links';
import {
  sendWhatsAppNotification,
  createWalletRegisteredNotification,
} from '@/lib/whatsapp-notifier';
import { addVerificationHistory } from '@/lib/supabase-db';
import { performWalletScreening, formatScreeningResult } from '@/lib/chainalysis';
import { generateScreeningPDF, generateScreeningPDFFilename } from '@/lib/screening-pdf';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, walletAddress } = body;

    if (!token || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Token ou endereço de wallet não fornecido' },
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

    // Validar token
    const result = await validateWalletToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const applicant = result.applicant;

    // ========================================================================
    // CHAINALYSIS SCREENING
    // ========================================================================
    
    console.log(`[Wallet Registration] Iniciando screening Chainalysis para ${walletAddress}`);
    
    let screeningResult;
    try {
      // Realizar screening completo (sanções + risco)
      screeningResult = await performWalletScreening(
        walletAddress,
        `applicant_${applicant.id}`
      );

      console.log('[Wallet Registration] Resultado do screening:');
      console.log(formatScreeningResult(screeningResult));

      // Adicionar resultado ao histórico
      await addVerificationHistory({
        applicant_id: applicant.id,
        event_type: 'wallet_screening',
        new_status: applicant.current_status,
        metadata: {
          walletAddress,
          screening: screeningResult,
          timestamp: new Date().toISOString(),
        },
      });

      // Verificar decisão do screening
      if (screeningResult.decision === 'REJECTED') {
        console.log(`[Wallet Registration] Wallet REJEITADA: ${screeningResult.decisionReason}`);
        
        // Adicionar rejeição ao histórico
        await addVerificationHistory({
          applicant_id: applicant.id,
          event_type: 'wallet_rejected',
          new_status: applicant.current_status,
          metadata: {
            walletAddress,
            reason: screeningResult.decisionReason,
            isSanctioned: screeningResult.isSanctioned,
            riskLevel: screeningResult.riskLevel,
            timestamp: new Date().toISOString(),
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Wallet rejeitada',
            reason: screeningResult.decisionReason,
            details: {
              isSanctioned: screeningResult.isSanctioned,
              riskLevel: screeningResult.riskLevel,
            },
          },
          { status: 403 }
        );
      }

      if (screeningResult.decision === 'MANUAL_REVIEW') {
        console.log(`[Wallet Registration] Wallet requer REVISÃO MANUAL: ${screeningResult.decisionReason}`);
        
        // Adicionar ao histórico para revisão manual
        await addVerificationHistory({
          applicant_id: applicant.id,
          event_type: 'wallet_manual_review',
          new_status: applicant.current_status,
          metadata: {
            walletAddress,
            reason: screeningResult.decisionReason,
            riskLevel: screeningResult.riskLevel,
            exposures: screeningResult.exposures,
            timestamp: new Date().toISOString(),
          },
        });

        // Por enquanto, permitir o cadastro mas marcar para revisão
        // TODO: Implementar fluxo de revisão manual
        console.log('[Wallet Registration] Permitindo cadastro com flag de revisão manual');
      }

    } catch (screeningError) {
      console.error('[Wallet Registration] Erro no screening Chainalysis:', screeningError);
      
      // Adicionar erro ao histórico
      await addVerificationHistory({
        applicant_id: applicant.id,
        event_type: 'wallet_screening_error',
        new_status: applicant.current_status,
        metadata: {
          walletAddress,
          error: screeningError instanceof Error ? screeningError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
        },
      });

      // Em caso de erro no screening, permitir o cadastro mas marcar para revisão
      console.log('[Wallet Registration] Erro no screening - permitindo cadastro com flag de revisão');
    }

    // ========================================================================
    // SALVAR WALLET
    // ========================================================================

    // Salvar wallet
    await saveWallet(applicant.id, walletAddress);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id,
      event_type: 'wallet_registered',
      new_status: applicant.current_status,
      metadata: {
        walletAddress,
        screeningDecision: screeningResult?.decision,
        riskLevel: screeningResult?.riskLevel,
        timestamp: new Date().toISOString(),
      },
    });

    // ========================================================================
    // GERAR PDF DO SCREENING
    // ========================================================================

    let pdfUrl: string | null = null;

    if (screeningResult) {
      try {
        console.log('[Wallet Registration] Gerando PDF do screening...');

        // Gerar PDF
        const pdfBuffer = await generateScreeningPDF(screeningResult, applicant);
        const pdfFilename = generateScreeningPDFFilename(applicant.external_user_id, walletAddress);

        // Inicializar cliente Supabase com service_role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Upload do PDF para o Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screening-reports')
          .upload(pdfFilename, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('[Wallet Registration] Erro ao fazer upload do PDF:', uploadError);
        } else {
          console.log('[Wallet Registration] PDF salvo com sucesso:', uploadData.path);

          // Gerar URL pública (signed URL válida por 1 ano)
          const { data: urlData } = await supabase.storage
            .from('screening-reports')
            .createSignedUrl(uploadData.path, 31536000); // 1 ano em segundos

          if (urlData) {
            pdfUrl = urlData.signedUrl;
            console.log('[Wallet Registration] URL do PDF gerada:', pdfUrl);

            // Adicionar URL do PDF ao histórico
            await addVerificationHistory({
              applicant_id: applicant.id,
              event_type: 'screening_pdf_generated',
              new_status: applicant.current_status,
              metadata: {
                walletAddress,
                pdfFilename,
                pdfUrl,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (pdfError) {
        console.error('[Wallet Registration] Erro ao gerar PDF:', pdfError);
        // Não bloquear o cadastro se houver erro no PDF
      }
    }

    // ========================================================================
    // NOTIFICAÇÃO WHATSAPP
    // ========================================================================

    // Criar notificação incluindo resultado do screening no metadata
    const notification = createWalletRegisteredNotification({
      externalUserId: applicant.external_user_id,
      verificationType: applicant.applicant_type,
      name: applicant.company_name || applicant.full_name,
      document: applicant.document_number,
      walletAddress,
    });

    // Adicionar informações do screening ao metadata
    if (screeningResult) {
      notification.metadata = {
        ...notification.metadata,
        chainalysisScreening: {
          decision: screeningResult.decision,
          riskLevel: screeningResult.riskLevel,
          isSanctioned: screeningResult.isSanctioned,
          decisionReason: screeningResult.decisionReason,
          pdfUrl: pdfUrl || undefined,
        },
      };
    }

    await sendWhatsAppNotification(notification);

    console.log('✅ Wallet registered successfully:', applicant.id, walletAddress);

    return NextResponse.json({
      success: true,
      message: 'Wallet cadastrada com sucesso',
      screening: screeningResult ? {
        decision: screeningResult.decision,
        riskLevel: screeningResult.riskLevel,
        requiresManualReview: screeningResult.decision === 'MANUAL_REVIEW',
      } : null,
    });
  } catch (error) {
    console.error('Error registering wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar wallet' },
      { status: 500 }
    );
  }
}

