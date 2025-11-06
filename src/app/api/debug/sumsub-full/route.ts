import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

function generateSignature(method: string, path: string, timestamp: number): string {
  const data = timestamp + method.toUpperCase() + path;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicantId = searchParams.get('applicantId');

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Buscando dados RAW DIRETO DA API para applicantId: ${applicantId}`);

    // Chamar API do Sumsub DIRETAMENTE (sem /one)
    const path = `/resources/applicants/${applicantId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature('GET', path, timestamp);

    const headers = {
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp.toString(),
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sumsub API error: ${response.status} - ${error}`);
    }

    const responseData = await response.json();
    
    // A API retorna um array dentro de 'list'
    const data = responseData.list && responseData.list.length > 0 ? responseData.list[0] : responseData;

    console.log(`[DEBUG] Dados recebidos - type: ${data.type}, hasInfo: ${!!data.info}, hasRequiredIdDocs: ${!!data.requiredIdDocs}`);

    // Estrutura completa para análise
    const debug = {
      applicantId,
      timestamp: new Date().toISOString(),
      endpoint: path,
      
      // Dados principais
      email_root: data.email || null,
      email_info: data.info?.email || null,
      email_companyInfo: data.info?.companyInfo?.email || null,
      
      // Informações da empresa
      companyInfo: {
        companyName: data.info?.companyInfo?.companyName || null,
        registrationNumber: data.info?.companyInfo?.registrationNumber || null,
        country: data.info?.companyInfo?.country || null,
        phone: data.info?.companyInfo?.phone || null,
        legalAddress: data.info?.companyInfo?.legalAddress || null,
        incorporatedOn: data.info?.companyInfo?.incorporatedOn || null,
        type: data.info?.companyInfo?.type || null,
        email: data.info?.companyInfo?.email || null,
        beneficialOwners: data.info?.companyInfo?.beneficialOwners || [],
        beneficialOwnersCount: data.info?.companyInfo?.beneficialOwners?.length || 0,
      },

      // Fixed Info
      fixedInfo: {
        companyName: data.fixedInfo?.companyInfo?.companyName || null,
        registrationNumber: data.fixedInfo?.companyInfo?.registrationNumber || null,
        country: data.fixedInfo?.companyInfo?.country || null,
        legalAddress: data.fixedInfo?.companyInfo?.legalAddress || null,
        email: data.fixedInfo?.companyInfo?.email || null,
        beneficialOwners: data.fixedInfo?.companyInfo?.beneficialOwners || [],
        beneficialOwnersCount: data.fixedInfo?.companyInfo?.beneficialOwners?.length || 0,
      },

      // Documentos
      documents: {
        requiredIdDocs: data.requiredIdDocs || null,
        docSets: data.requiredIdDocs?.docSets || [],
        docSetsCount: data.requiredIdDocs?.docSets?.length || 0,
        imageReviewResults: data.requiredIdDocs?.docSets?.[0]?.imageReviewResults || [],
        imageReviewResultsCount: data.requiredIdDocs?.docSets?.[0]?.imageReviewResults?.length || 0,
      },

      // Review
      review: {
        reviewStatus: data.review?.reviewStatus || null,
        reviewResult: data.review?.reviewResult || null,
        reviewAnswer: data.review?.reviewResult?.reviewAnswer || null,
      },

      // Dados RAW completos (para análise)
      raw: data,
    };

    return NextResponse.json(debug, { status: 200 });
  } catch (error: any) {
    console.error('[DEBUG] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
