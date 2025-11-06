import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

function generateSignature(method: string, path: string, timestamp: number, body?: string): string {
  const data = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

async function sumsubRequest(method: string, path: string, body?: any) {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = body ? JSON.stringify(body) : undefined;
  const signature = generateSignature(method, path, timestamp, bodyString);

  const headers: Record<string, string> = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicantId');

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Buscando dados RAW do Sumsub para: ${applicantId}`);

    const path = `/resources/applicants/${applicantId}/one`;
    const data = await sumsubRequest('GET', path);

    // Análise detalhada de emails
    const emailAnalysis = {
      'data.info.email': data.info?.email,
      'data.info.companyInfo.email': data.info?.companyInfo?.email,
      'data.email': data.email,
      'data.contacts': data.contacts,
      'data.info.profileInformation': data.info?.profileInformation,
    };

    // UBO analysis
    const uboAnalysis = data.info?.companyInfo?.beneficialOwners?.map((ubo: any, index: number) => ({
      index: index + 1,
      name: `${ubo.firstName} ${ubo.lastName}`,
      email: ubo.email,
      phone: ubo.phone,
    }));

    return NextResponse.json({
      success: true,
      applicantId,
      rawData: data,
      emailAnalysis,
      uboAnalysis,
      companyInfo: data.info?.companyInfo,
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('[DEBUG] Erro ao buscar dados do Sumsub:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do Sumsub', details: error.message },
      { status: 500 }
    );
  }
}
