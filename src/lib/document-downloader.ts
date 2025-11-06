/**
 * Document Downloader Library
 * 
 * Funções para listar e baixar documentos do Sumsub
 */

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
 * Faz requisição autenticada para a API Sumsub e retorna Buffer
 */
async function sumsubRequestBinary(method: string, path: string): Promise<Buffer> {
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

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Interface para documento do Sumsub
 */
export interface SumsubDocument {
  doc_set_type: string;
  doc_type: string;
  image_id: string;
  inspection_id: string;
  status: string;
  review_answer?: string;
  review_comment?: string;
  file_name?: string;
  file_type?: string;
}

/**
 * Lista todos os documentos de um applicant
 * 
 * @param applicantId - ID do applicant no Sumsub
 * @returns Array de documentos
 */
export async function listDocuments(applicantId: string): Promise<SumsubDocument[]> {
  try {
    console.log(`[DOCUMENTS] Listando documentos do applicant ${applicantId}...`);
    
    const path = `/resources/applicants/${applicantId}/one`;
    const data = await sumsubRequest('GET', path);

    const documents: SumsubDocument[] = [];
    
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

    console.log(`[DOCUMENTS] Encontrados ${documents.length} documentos`);
    return documents;

  } catch (error) {
    console.error('[DOCUMENTS] Erro ao listar documentos:', error);
    throw error;
  }
}

/**
 * Baixa um documento específico
 * 
 * @param imageId - ID da imagem no Sumsub
 * @param inspectionId - ID da inspeção no Sumsub
 * @returns Buffer contendo o arquivo
 */
export async function downloadDocument(
  imageId: string,
  inspectionId: string
): Promise<Buffer> {
  try {
    console.log(`[DOCUMENTS] Baixando documento ${imageId}...`);
    
    const path = `/resources/inspections/${inspectionId}/resources/${imageId}`;
    const buffer = await sumsubRequestBinary('GET', path);
    
    console.log(`[DOCUMENTS] Documento baixado com sucesso (${buffer.length} bytes)`);
    return buffer;

  } catch (error) {
    console.error('[DOCUMENTS] Erro ao baixar documento:', error);
    throw error;
  }
}

/**
 * Baixa todos os documentos de um applicant
 * 
 * @param applicantId - ID do applicant no Sumsub
 * @returns Array de objetos com documento e buffer
 */
export async function downloadAllDocuments(
  applicantId: string
): Promise<Array<{ document: SumsubDocument; buffer: Buffer }>> {
  try {
    console.log(`[DOCUMENTS] Baixando todos os documentos do applicant ${applicantId}...`);
    
    const documents = await listDocuments(applicantId);
    const results: Array<{ document: SumsubDocument; buffer: Buffer }> = [];

    for (const doc of documents) {
      try {
        const buffer = await downloadDocument(doc.image_id, doc.inspection_id);
        results.push({ document: doc, buffer });
        
        // Aguardar 200ms entre downloads
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[DOCUMENTS] Erro ao baixar ${doc.image_id}:`, error);
      }
    }

    console.log(`[DOCUMENTS] ${results.length}/${documents.length} documentos baixados com sucesso`);
    return results;

  } catch (error) {
    console.error('[DOCUMENTS] Erro ao baixar todos os documentos:', error);
    throw error;
  }
}
