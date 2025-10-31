import { NextRequest, NextResponse } from 'next/server';
import { validateWalletToken, saveWallet } from '@/lib/magic-links';
import {
  sendWhatsAppNotification,
  createWalletRegisteredNotification,
} from '@/lib/whatsapp-notifier';
import { addVerificationHistory } from '@/lib/supabase-db';

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

    // Salvar wallet
    await saveWallet(applicant.id, walletAddress);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id,
      event_type: 'wallet_registered',
      new_status: applicant.current_status,
      metadata: {
        walletAddress,
        timestamp: new Date().toISOString(),
      },
    });

    // Enviar notificação WhatsApp
    const notification = createWalletRegisteredNotification({
      externalUserId: applicant.external_user_id,
      verificationType: applicant.applicant_type,
      name: applicant.company_name || applicant.full_name,
      document: applicant.document_number,
      walletAddress,
    });

    await sendWhatsAppNotification(notification);

    console.log('✅ Wallet registered successfully:', applicant.id, walletAddress);

    return NextResponse.json({
      success: true,
      message: 'Wallet cadastrada com sucesso',
    });
  } catch (error) {
    console.error('Error registering wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar wallet' },
      { status: 500 }
    );
  }
}

