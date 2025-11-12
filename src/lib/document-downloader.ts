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
  added_date?: string;
  source?: string;
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
    
    // Endpoint correto para listar documentos/imagens
    const metadataPath = `/resources/applicants/${applicantId}/metadata/resources`;
    const metadataResponse = await sumsubRequest('GET', metadataPath);
    
    // Buscar inspectionId do applicant
    const applicantPath = `/resources/applicants/${applicantId}/one`;
    const applicantData = await sumsubRequest('GET', applicantPath);
    const inspectionId = applicantData.inspectionId;

    const documents: SumsubDocument[] = [];
    
    // A resposta tem formato: { items: [...], totalItems: N }
    if (metadataResponse.items && Array.isArray(metadataResponse.items)) {
      for (const item of metadataResponse.items) {
        // Pular documentos desativados
        if (item.deactivated) {
          console.log(`[DOCUMENTS] Pulando documento desativado: ${item.id}`);
          continue;
        }
        
        documents.push({
          doc_set_type: item.idDocDef?.idDocSubType || 'DOCUMENT',
          doc_type: item.idDocDef?.idDocType || 'UNKNOWN',
          image_id: item.id,
          inspection_id: inspectionId,
          status: item.reviewResult?.reviewAnswer === 'GREEN' ? 'approved' : 
                  item.reviewResult?.reviewAnswer === 'RED' ? 'rejected' : 'pending',
          review_answer: item.reviewResult?.reviewAnswer,
          review_comment: item.reviewResult?.moderationComment,
          file_name: item.fileMetadata?.fileName,
          file_type: item.fileMetadata?.fileType,
          added_date: item.addedDate,
          source: item.source,
        });
      }
    }

    console.log(`[DOCUMENTS] Encontrados ${documents.length} documentos (total disponível: ${metadataResponse.totalItems || 0})`);
    return documents;

  } catch (error) {
    console.error('[DOCUMENTS] Erro ao listar documentos:', error);
    throw error;
  }
}

/**
 * Baixa um documento específico
 * 
 * @param inspectionId - ID da inspeção no Sumsub
 * @param imageId - ID da imagem no Sumsub
 * @returns Buffer contendo o arquivo
 */
export async function downloadDocument(
  inspectionId: string,
  imageId: string
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
        const buffer = await downloadDocument(doc.inspection_id, doc.image_id);
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
