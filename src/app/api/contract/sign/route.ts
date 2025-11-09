import { NextRequest, NextResponse } from 'next/server';
import {
  validateContractToken,
  signContract,
  generateWalletToken,
  generateWalletLink,
} from '@/lib/magic-links';
import {
  sendWhatsAppNotification,
  createContractSignedNotification,
} from '@/lib/whatsapp-notifier';
import { addVerificationHistory } from '@/lib/supabase-db';
import { generateContractPDF } from '@/lib/contract-pdf';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 400 }
      );
    }

    // Validar token
    const result = await validateContractToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const applicant = result.applicant;

    // Capturar IP e User-Agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const signedAt = new Date().toISOString();

    console.log('[Contract] Starting signature process for:', applicant.id);

    // PASSO 1: Gerar PDF do contrato (ANTES de salvar assinatura)
    let pdfData: Uint8Array;
    try {
      console.log('[Contract] Generating PDF...');
      pdfData = generateContractPDF({
        applicant,
        signedAt,
        ip,
        userAgent,
      });
      console.log('[Contract] PDF generated successfully');
    } catch (pdfError) {
      console.error('[Contract] ERROR generating PDF:', pdfError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao gerar PDF do contrato',
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // PASSO 2: Salvar PDF no Supabase Storage
    const fileName = `contract_${applicant.external_user_id}_${Date.now()}.pdf`;
    let pdfPath: string | null = null;
    
    try {
      console.log('[Contract] Uploading PDF to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, pdfData, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[Contract] ERROR uploading PDF:', uploadError);
        // Não falha a assinatura se upload falhar, mas loga o erro
      } else {
        console.log('[Contract] PDF uploaded successfully:', fileName);
        pdfPath = fileName;
      }
    } catch (uploadError) {
      console.error('[Contract] ERROR in upload process:', uploadError);
      // Continua mesmo se upload falhar
    }

    // PASSO 3: Marcar contrato como assinado (SÓ DEPOIS de gerar PDF)
    try {
      console.log('[Contract] Marking contract as signed...');
      await signContract(applicant.id, ip, userAgent, pdfPath || undefined);
      console.log('[Contract] Contract marked as signed');
    } catch (signError) {
      console.error('[Contract] ERROR marking as signed:', signError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao salvar assinatura',
          details: signError instanceof Error ? signError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // PASSO 4: Adicionar ao histórico
    try {
      await addVerificationHistory({
        applicant_id: applicant.id,
        event_type: 'contract_signed',
        new_status: applicant.current_status,
        metadata: {
          ip,
          userAgent,
          timestamp: signedAt,
          pdfPath: pdfPath || 'not_saved',
        },
      });
    } catch (historyError) {
      console.error('[Contract] ERROR adding to history:', historyError);
      // Não falha se histórico falhar
    }

    // PASSO 5: Gerar token para cadastro de wallet
    let walletToken: string;
    let walletLink: string;
    
    try {
      console.log('[Contract] Generating wallet token...');
      walletToken = await generateWalletToken(applicant.id);
      walletLink = generateWalletLink(walletToken);
      console.log('[Contract] Wallet token generated');
    } catch (walletError) {
      console.error('[Contract] ERROR generating wallet token:', walletError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao gerar link de carteira',
          details: walletError instanceof Error ? walletError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // PASSO 6: Enviar notificação WhatsApp
    try {
      console.log('[Contract] Sending WhatsApp notification...');
      const notification = createContractSignedNotification({
        externalUserId: applicant.external_user_id,
        verificationType: applicant.applicant_type,
        name: applicant.company_name || applicant.full_name,
        document: applicant.document_number,
        walletLink,
      });

      await sendWhatsAppNotification(notification);
      console.log('[Contract] WhatsApp notification sent');
    } catch (whatsappError) {
      console.error('[Contract] ERROR sending WhatsApp:', whatsappError);
      // Não falha se WhatsApp falhar
    }

    console.log('[Contract] Contract signed successfully:', applicant.id);

    return NextResponse.json({
      success: true,
      walletToken,
      message: 'Contrato assinado com sucesso',
    });
  } catch (error) {
    console.error('[Contract] UNEXPECTED ERROR:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro inesperado ao assinar contrato',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
