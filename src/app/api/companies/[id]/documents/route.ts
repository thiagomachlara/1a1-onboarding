import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
 * Faz requisição autenticada para a API Sumsub
 */
async function sumsubRequest(method: string, path: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(method, path, timestamp);

  const headers: Record<string, string> = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * GET /api/companies/[id]/documents
 * 
 * Lista todos os documentos de uma empresa do Sumsub
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Buscar empresa no banco
    const { data: company, error } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    if (!company.applicant_id) {
      return NextResponse.json(
        { error: 'Empresa não possui applicant_id do Sumsub' },
        { status: 400 }
      );
    }

    // Buscar documentos do Sumsub
    const path = `/resources/applicants/${company.applicant_id}/one`;
    const data = await sumsubRequest('GET', path);

    // Extrair documentos
    const documents: any[] = [];
    
    if (data.requiredIdDocs?.docSets) {
      for (const docSet of data.requiredIdDocs.docSets) {
        const docSetType = docSet.idDocSetType;
        
        if (docSet.types) {
          for (const docType of docSet.types) {
            const idDocType = docType.idDocType;
            
            if (docType.imageIds) {
              for (const imageId of docType.imageIds) {
                documents.push({
                  doc_set_type: docSetType,
                  doc_type: idDocType,
                  image_id: imageId,
                  inspection_id: data.inspectionId,
                  status: docType.reviewStatus || 'pending',
                  review_answer: docType.reviewAnswer,
                  review_comment: docType.reviewComment,
                });
              }
            }
          }
        }
      }
    }

    // Buscar documentos já salvos no banco
    const { data: savedDocs } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', id);

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        applicant_id: company.applicant_id,
        name: company.company_name,
      },
      documents,
      saved_documents: savedDocs || [],
      total: documents.length,
    });

  } catch (error: any) {
    console.error('[DOCUMENTS] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos', details: error.message },
      { status: 500 }
    );
  }
}
