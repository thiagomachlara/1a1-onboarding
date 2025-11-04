import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApplicantByDocument } from '@/lib/supabase-db';

const SUMSUB_APP_TOKEN = process.env.NEXT_PUBLIC_SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

interface AccessTokenRequest {
  userId: string;
  levelName: string;
  ttlInSecs?: number;
}

/**
 * Gera assinatura HMAC para autenticação na API do Sumsub
 */
function generateSignature(
  method: string,
  url: string,
  timestamp: number,
  body?: string
): string {
  const data = timestamp + method.toUpperCase() + url + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Gera um access token do Sumsub para iniciar a verificação
 * POST /api/sumsub/access-token
 */
export async function POST(request: NextRequest) {
  try {
    const body: AccessTokenRequest = await request.json();
    let { userId, levelName, ttlInSecs = 600 } = body;
    const { document } = body as any; // Documento (CPF/CNPJ) opcional

    if (!userId && !document) {
      return NextResponse.json(
        { error: 'userId or document is required' },
        { status: 400 }
      );
    }

    if (!levelName) {
      return NextResponse.json(
        { error: 'levelName is required' },
        { status: 400 }
      );
    }

    // Se não tem userId mas tem documento, buscar no banco
    if (!userId && document) {
      console.log('[Access Token] Buscando applicant por documento:', document);
      const existingApplicant = await getApplicantByDocument(document);
      
      if (existingApplicant) {
        console.log('[Access Token] Applicant existente encontrado:', {
          externalUserId: existingApplicant.external_user_id,
          companyName: existingApplicant.company_name,
        });
        userId = existingApplicant.external_user_id;
      } else {
        // Se não encontrou, criar novo userId baseado no documento
        const cleanDocument = document.replace(/\D/g, '');
        userId = cleanDocument.length === 11 
          ? `cpf_${cleanDocument}` 
          : `cnpj_${cleanDocument}`;
        console.log('[Access Token] Novo userId gerado:', userId);
      }
    }

    // Preparar requisição para API do Sumsub
    const method = 'POST';
    const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&ttlInSecs=${ttlInSecs}&levelName=${encodeURIComponent(levelName)}`;
    const url = `${SUMSUB_BASE_URL}${path}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Gerar assinatura
    const signature = generateSignature(method, path, timestamp);

    // Fazer requisição para API do Sumsub
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sumsub API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate access token', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.token,
      userId: data.userId,
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

