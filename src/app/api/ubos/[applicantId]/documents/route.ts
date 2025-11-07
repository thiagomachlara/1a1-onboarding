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

    // Buscar documentos usando endpoint correto (mesmo da empresa)
    const path = `/resources/applicants/${applicantId}/metadata/resources`;
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
      console.error('Erro ao buscar documentos do UBO:', await response.text());
      return NextResponse.json(
        { error: 'Erro ao buscar documentos do UBO' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extrair documentos de items[] (mesma lógica da empresa)
    const documents = [];
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        documents.push({
          id: item.id,
          preview_id: item.previewId,
          inspection_id: applicantId,
          file_name: item.fileMetadata?.fileName || 'documento.pdf',
          file_type: item.fileMetadata?.fileType || 'unknown',
          file_size: item.fileMetadata?.fileSize || 0,
          doc_type: item.idDocDef?.idDocType || 'UNKNOWN',
          doc_sub_type: item.idDocDef?.idDocSubType || null,
          country: item.idDocDef?.country || null,
          added_date: item.addedDate,
          review_answer: item.reviewResult?.reviewAnswer || 'pending',
          reject_labels: item.reviewResult?.rejectLabels || [],
          review_reject_type: item.reviewResult?.reviewRejectType || null,
          moderator_comment: item.reviewResult?.moderationComment || null,
          source: item.source || 'fileupload',
          deactivated: item.deactivated || false,
        });
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
