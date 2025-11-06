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
 * POST /api/sumsub/summary-report
 * 
 * Gera e baixa o Summary Report em PDF de um applicant
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantId, type } = body;

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }

    // Determinar tipo de relatório
    const reportType = type === 'company' ? 'companyReport' : 'applicantReport';
    
    // Fazer requisição para o Sumsub
    const path = `/resources/applicants/${applicantId}/summary/report?report=${reportType}&lang=pt`;
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

    // Retornar PDF
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="summary_report_${applicantId}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('[SUMMARY-REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório', details: error.message },
      { status: 500 }
    );
  }
}
