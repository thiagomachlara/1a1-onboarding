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
    await signContract(applicant.id, ip, userAgent);

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

