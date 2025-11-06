import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

/**
 * Gera assinatura HMAC SHA256 para autenticação na API Sumsub
 */
function generateSignature(method: string, path: string, timestamp: number): string {
  const data = timestamp + method.toUpperCase() + path;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * GET /api/documents/download?imageId=xxx&inspectionId=yyy
 * 
 * Baixa um documento do Sumsub
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const inspectionId = searchParams.get('inspectionId');

    if (!imageId || !inspectionId) {
      return NextResponse.json(
        { error: 'imageId e inspectionId são obrigatórios' },
        { status: 400 }
      );
    }

    // Fazer requisição para o Sumsub
    const path = `/resources/inspections/${inspectionId}/resources/${imageId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature('GET', path, timestamp);

    const headers: Record<string, string> = {
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp.toString(),
    };

    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sumsub API error: ${response.status} - ${error}`);
    }

    // Obter tipo de conteúdo
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Retornar imagem/documento
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="document_${imageId}.jpg"`,
      },
    });

  } catch (error: any) {
    console.error('[DOCUMENT-DOWNLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao baixar documento', details: error.message },
      { status: 500 }
    );
  }
}
