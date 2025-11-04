import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken } from '@/lib/jwt-utils';
import { generateAccessToken } from '@/lib/sumsub-api';

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

    // Validar e decodificar token JWT
    const payload = verifyRefreshToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    console.log('[API] Token válido:', {
      applicantId: payload.applicantId,
      externalUserId: payload.externalUserId,
    });

    // Gerar access token do Sumsub
    const accessToken = await generateAccessToken(
      payload.externalUserId,
      'kyb-onboarding-completo',
      600 // 10 minutos
    );

    return NextResponse.json({
      success: true,
      token: accessToken,
      userId: payload.externalUserId,
      companyName: payload.companyName,
    });

  } catch (error: any) {
    console.error('[API] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
