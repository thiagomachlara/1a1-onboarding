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
 * Faz requisição autenticada para a API Sumsub e retorna resposta binária (para PDFs)
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
  uboName?: string; // Nome do UBO (Ultimate Beneficial Owner)
  
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
      
      // UBO (Ultimate Beneficial Owner) - buscar primeiro UBO se disponível
      if (companyInfo.beneficialOwners && companyInfo.beneficialOwners.length > 0) {
        const firstUBO = companyInfo.beneficialOwners[0];
        if (firstUBO.firstName && firstUBO.lastName) {
          result.uboName = `${firstUBO.firstName} ${firstUBO.lastName}`.trim();
        }
        // Se email da empresa não estiver disponível, usar email do UBO
        if (!result.email && firstUBO.email) {
          result.email = firstUBO.email;
          console.log('📧 Email obtido do UBO (sócio)');
        }
      }
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

/**
 * Gera e baixa o Summary Report em PDF de um aplicante
 * 
 * @param applicantId - ID do aplicante no Sumsub
 * @param type - Tipo de aplicante ('individual' ou 'company')
 * @param lang - Idioma do relatório ('en' ou 'pt')
 * @returns Buffer contendo o PDF
 */
export async function getSummaryReportPDF(
  applicantId: string,
  type: 'individual' | 'company',
  lang: 'en' | 'pt' = 'pt'
): Promise<Buffer> {
  try {
    const reportType = type === 'individual' ? 'applicantReport' : 'companyReport';
    const path = `/resources/applicants/${applicantId}/summary/report?report=${reportType}&lang=${lang}`;
    
    console.log(`[Sumsub] Gerando Summary Report PDF para ${applicantId} (${type}, ${lang})`);
    const pdfBuffer = await sumsubRequestBinary('GET', path);
    console.log(`[Sumsub] Summary Report PDF gerado com sucesso (${pdfBuffer.length} bytes)`);
    
    return pdfBuffer;
  } catch (error) {
    console.error('[Sumsub] Erro ao gerar Summary Report PDF:', error);
    throw error;
  }
}


/**
 * Reseta apenas o questionnaire de um aplicante para refresh de dados financeiros
 * 
 * @param applicantId - ID do aplicante no Sumsub
 * @param levelName - Nome do level atual (padrão: kyb-onboarding-completo)
 * @returns Resposta da API Sumsub
 */
export async function resetQuestionnaireForRefresh(
  applicantId: string,
  levelName: string = 'kyb-onboarding-completo'
): Promise<any> {
  try {
    console.log(`[Sumsub] Resetando questionnaire para refresh - Applicant: ${applicantId}`);
    
    const path = `/resources/applicants/${applicantId}/moveToLevel`;
    
    const body = {
      name: levelName,
      docSets: [
        {
          idDocSetType: 'QUESTIONNAIRE'
        }
      ]
    };
    
    const response = await sumsubRequest('POST', path, body);
    console.log('[Sumsub] Questionnaire resetado com sucesso');
    
    return response;
  } catch (error) {
    console.error('[Sumsub] Erro ao resetar questionnaire:', error);
    throw error;
  }
}

/**
 * Gera access token para o SDK do Sumsub
 * 
 * @param externalUserId - ID externo do usuário (ex: cnpj_xxx ou unil-xxx)
 * @param levelName - Nome do level (padrão: kyb-onboarding-completo)
 * @returns Access token para o SDK
 */
export async function generateAccessToken(
  externalUserId: string,
  levelName: string = 'kyb-onboarding-completo'
): Promise<{ token: string; userId: string }> {
  try {
    console.log(`[Sumsub] Gerando access token - User: ${externalUserId}, Level: ${levelName}`);
    
    const path = `/resources/accessTokens?userId=${externalUserId}&levelName=${levelName}&ttlInSecs=600`;
    
    const response = await sumsubRequest('POST', path);
    console.log('[Sumsub] Access token gerado com sucesso');
    
    return response;
  } catch (error) {
    console.error('[Sumsub] Erro ao gerar access token:', error);
    throw error;
  }
}
