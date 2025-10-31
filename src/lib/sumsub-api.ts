/**
 * Sumsub API Integration
 * 
 * Biblioteca para integração com a API do Sumsub para buscar dados completos de aplicantes.
 */

import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

/**
 * Gera assinatura HMAC SHA256 para autenticação na API Sumsub
 */
function generateSignature(method: string, path: string, timestamp: number, body?: string): string {
  const data = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Faz requisição autenticada para a API Sumsub
 */
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

/**
 * Dados completos de um aplicante
 */
export interface SumsubApplicantData {
  id: string;
  externalUserId: string;
  type: 'individual' | 'company';
  
  // Pessoa Física
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dob?: string; // Data de nascimento
  
  // Pessoa Jurídica
  companyName?: string;
  registrationNumber?: string; // CNPJ
  
  // Comum
  email?: string;
  phone?: string;
  country?: string;
  
  // Documentos
  idDocNumber?: string; // CPF ou documento de identidade
  
  // Status
  reviewStatus?: string;
  reviewAnswer?: string;
}

/**
 * Busca dados completos de um aplicante na API Sumsub
 */
export async function getApplicantData(applicantId: string): Promise<SumsubApplicantData> {
  try {
    const path = `/resources/applicants/${applicantId}/one`;
    const data = await sumsubRequest('GET', path);

    // Extrair dados baseado no tipo
    const type = data.type === 'company' ? 'company' : 'individual';
    
    let result: SumsubApplicantData = {
      id: data.id,
      externalUserId: data.externalUserId,
      type,
      reviewStatus: data.review?.reviewStatus,
      reviewAnswer: data.review?.reviewAnswer,
    };

    if (type === 'individual') {
      // Pessoa Física
      const info = data.info || {};
      result.firstName = info.firstName;
      result.lastName = info.lastName;
      result.fullName = info.firstName && info.lastName 
        ? `${info.firstName} ${info.lastName}` 
        : info.firstName || info.lastName;
      result.dob = info.dob;
      result.country = info.country;
      
      // Email e telefone
      result.email = info.email;
      result.phone = info.phone;
      
      // CPF (pode estar em idDocs)
      if (data.requiredIdDocs?.docSets) {
        for (const docSet of data.requiredIdDocs.docSets) {
          if (docSet.idDocSetType === 'IDENTITY') {
            const idDoc = docSet.types?.find((t: any) => t.idDocType === 'ID_CARD' || t.idDocType === 'DRIVERS');
            if (idDoc?.fields) {
              result.idDocNumber = idDoc.fields.find((f: any) => f.name === 'number')?.value;
            }
          }
        }
      }
    } else {
      // Pessoa Jurídica
      const companyInfo = data.info?.companyInfo || {};
      result.companyName = companyInfo.companyName;
      result.registrationNumber = companyInfo.registrationNumber; // CNPJ
      result.country = companyInfo.country;
      
      // Email e telefone (pode estar em info ou companyInfo)
      result.email = data.info?.email || companyInfo.email;
      result.phone = data.info?.phone || companyInfo.phone;
    }

    return result;
  } catch (error) {
    console.error('Error fetching Sumsub applicant data:', error);
    throw error;
  }
}

/**
 * Formata dados do aplicante para exibição
 */
export function formatApplicantData(data: SumsubApplicantData): string {
  if (data.type === 'individual') {
    return `
Nome: ${data.fullName || 'N/A'}
CPF: ${data.idDocNumber || 'N/A'}
Email: ${data.email || 'N/A'}
Telefone: ${data.phone || 'N/A'}
    `.trim();
  } else {
    return `
Empresa: ${data.companyName || 'N/A'}
CNPJ: ${data.registrationNumber || 'N/A'}
Email: ${data.email || 'N/A'}
Telefone: ${data.phone || 'N/A'}
    `.trim();
  }
}

