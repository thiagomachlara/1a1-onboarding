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

    // Marcar contrato como assinado
    const signedAt = new Date().toISOString();
    await signContract(applicant.id, ip, userAgent);

    // Gerar PDF do contrato
    const pdfData = generateContractPDF({
      applicant,
      signedAt,
      ip,
      userAgent,
    });

    // Salvar PDF no Supabase Storage
    const fileName = `contract_${applicant.external_user_id}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
    } else {
      console.log('✅ PDF saved:', fileName);
      
      // Atualizar applicant com caminho do PDF
      await supabase
        .from('applicants')
        .update({ contract_pdf_path: fileName })
        .eq('id', applicant.id);
    }

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id,
      event_type: 'contract_signed',
      new_status: applicant.current_status,
      metadata: {
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      },
    });

    // Gerar token para cadastro de wallet
    const walletToken = await generateWalletToken(applicant.id);
    const walletLink = generateWalletLink(walletToken);

    // Enviar notificação WhatsApp
    const notification = createContractSignedNotification({
      externalUserId: applicant.external_user_id,
      verificationType: applicant.applicant_type,
      name: applicant.company_name || applicant.full_name,
      document: applicant.document_number,
      walletLink,
    });

    await sendWhatsAppNotification(notification);

    console.log('✅ Contract signed successfully:', applicant.id);

    return NextResponse.json({
      success: true,
      walletToken,
      message: 'Contrato assinado com sucesso',
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao assinar contrato' },
      { status: 500 }
    );
  }
}

