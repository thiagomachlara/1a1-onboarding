import { NextRequest, NextResponse } from 'next/server';
import { validateWalletToken } from '@/lib/magic-links';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token não fornecido' },
        { status: 400 }
      );
    }

    const result = await validateWalletToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      applicant: result.applicant,
    });
  } catch (error) {
    console.error('Error validating wallet token:', error);
    return NextResponse.json(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

