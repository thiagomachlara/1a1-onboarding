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

    // Buscar metadados dos documentos do UBO
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
    
    // Debug: ver estrutura da resposta
    console.log('[DOCS-DEBUG-1] Tipo de data:', typeof data);
    console.log('[DOCS-DEBUG-2] É array?', Array.isArray(data));
    console.log('[DOCS-DEBUG-3] Chaves:', Object.keys(data || {}));
    console.log('[DOCS-DEBUG-4] Primeiros 300 chars:', JSON.stringify(data).substring(0, 300));
    
    // Tentar múltiplas estruturas possíveis
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.list?.items) {
      items = data.list.items;
    } else if (data.items) {
      items = data.items;
    } else if (data.documents) {
      items = data.documents;
    } else {
      console.log('[DOCS-ERROR] Estrutura desconhecida, retornando vazio');
      return NextResponse.json({ success: true, documents: [] });
    }
    
    console.log('[DOCS-DEBUG-5] Items encontrados:', items.length);
    
    // Validar que items é array
    if (!Array.isArray(items)) {
      console.log('[DOCS-ERROR] items não é array:', typeof items);
      return NextResponse.json({ success: true, documents: [] });
    }
    
    // Filtrar apenas documentos de imagem
    const documents = items.filter((item: any) => item.idDocType && item.imageId);

    return NextResponse.json({
      success: true,
      documents: documents.map((doc: any) => ({
        id: doc.imageId,
        type: doc.idDocType,
        doc_set_type: doc.idDocSetType,
        country: doc.country,
        inspection_id: applicantId,
      })),
    });
  } catch (error) {
    console.error('Erro ao processar documentos do UBO:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar documentos do UBO' },
      { status: 500 }
    );
  }
}
