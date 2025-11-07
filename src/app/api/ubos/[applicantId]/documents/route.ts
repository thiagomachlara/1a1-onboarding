import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

function createSignature(method: string, url: string, timestamp: number, body?: string) {
  const data = timestamp + method + url + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicantId: string }> }
) {
  try {
    const { applicantId } = await params;

    // Buscar dados completos do UBO (mesma lógica da empresa)
    const path = `/resources/applicants/${applicantId}/one`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createSignature('GET', path, timestamp);

    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });

    if (!response.ok) {
      console.error('Erro ao buscar dados do UBO:', await response.text());
      return NextResponse.json(
        { error: 'Erro ao buscar dados do UBO' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extrair documentos de requiredIdDocs.docSets (mesma lógica da empresa)
    const documents = [];
    const docSets = data.requiredIdDocs?.docSets || [];
    
    for (const docSet of docSets) {
      const imageResults = docSet.imageReviewResults || [];
      for (const doc of imageResults) {
        if (doc.imageId && doc.idDocType) {
          documents.push({
            id: doc.imageId,
            type: doc.idDocType,
            doc_set_type: docSet.idDocSetType,
            country: doc.country,
            inspection_id: applicantId,
          });
        }
      }
    }

    console.log(`[UBO-DOCS] ${applicantId}: ${documents.length} documentos encontrados`);

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Erro ao processar documentos do UBO:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar documentos do UBO' },
      { status: 500 }
    );
  }
}
