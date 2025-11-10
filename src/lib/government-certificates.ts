/**
 * Biblioteca para integração com APIs governamentais de certificados de compliance
 * 
 * Certificados suportados:
 * - CND Federal (Certidão Negativa de Débitos Federais) - Receita Federal
 * - CNDT (Certidão Negativa de Débitos Trabalhistas) - TST
 * 
 * Nota: As APIs governamentais são gratuitas mas podem ter limitações de rate limit
 */

import axios from 'axios';

export interface CertificateResult {
  success: boolean;
  status: 'valid' | 'invalid' | 'pending' | 'error' | 'not_found';
  certificateType: string;
  issueDate?: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  protocolNumber?: string;
  pdfUrl?: string;
  queryData?: any;
  errorMessage?: string;
}

/**
 * Consulta CND Federal (Certidão Negativa de Débitos Federais)
 * 
 * A CND Federal é emitida pela Receita Federal e comprova a regularidade fiscal
 * da empresa perante a União (tributos federais e dívida ativa da União).
 * 
 * API: Receita Federal do Brasil
 * Documentação: https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/
 * 
 * @param cnpj - CNPJ da empresa (apenas números)
 * @returns Resultado da consulta com dados do certificado
 */
export async function fetchCNDFederal(cnpj: string): Promise<CertificateResult> {
  try {
    // Remove formatação do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return {
        success: false,
        status: 'error',
        certificateType: 'CND_FEDERAL',
        errorMessage: 'CNPJ inválido - deve conter 14 dígitos',
      };
    }

    // Endpoint da Receita Federal para emissão de CND
    // Nota: A Receita Federal não possui API pública REST documentada
    // A emissão é feita via formulário web em:
    // https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir
    
    // Para automação completa, seria necessário:
    // 1. Usar Puppeteer/Playwright para preencher o formulário
    // 2. Ou integrar com serviços pagos como Infosimples que já fazem isso
    
    // Por enquanto, retornamos status 'pending' indicando que precisa ser feito manualmente
    // ou aguardando implementação de scraping/automação
    
    return {
      success: true,
      status: 'pending',
      certificateType: 'CND_FEDERAL',
      queryData: {
        cnpj: cleanCNPJ,
        manualUrl: `https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir`,
        note: 'A emissão da CND Federal requer preenchimento manual do formulário da Receita Federal ou integração com serviço de automação.',
      },
    };
  } catch (error: any) {
    console.error('Erro ao buscar CND Federal:', error);
    return {
      success: false,
      status: 'error',
      certificateType: 'CND_FEDERAL',
      errorMessage: error.message || 'Erro desconhecido ao consultar CND Federal',
    };
  }
}

/**
 * Consulta CNDT (Certidão Negativa de Débitos Trabalhistas)
 * 
 * A CNDT é emitida pela Justiça do Trabalho e comprova a inexistência de
 * débitos inadimplidos perante a Justiça do Trabalho.
 * 
 * API: Tribunal Superior do Trabalho (TST)
 * Documentação: https://www.tst.jus.br/certidao
 * 
 * @param cnpj - CNPJ da empresa (apenas números)
 * @returns Resultado da consulta com dados do certificado
 */
export async function fetchCNDT(cnpj: string): Promise<CertificateResult> {
  try {
    // Remove formatação do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return {
        success: false,
        status: 'error',
        certificateType: 'CNDT',
        errorMessage: 'CNPJ inválido - deve conter 14 dígitos',
      };
    }

    // Endpoint do TST para emissão de CNDT
    // URL: https://cndt-certidao.tst.jus.br/gerarCertidao.faces
    
    // A CNDT pode ser emitida programaticamente via POST request
    // Vamos tentar fazer a requisição direta
    
        // A emissão da CNDT requer a resolução de um reCAPTCHA, o que impede a automação completa.
    // A melhor abordagem é redirecionar o usuário para o site do TST para emissão manual.
    return {
      success: true,
      status: 'pending',
      certificateType: 'CNDT',
      queryData: {
        cnpj: cleanCNPJ,
        manualUrl: 'https://www.tst.jus.br/certidao',
        note: 'A emissão da CNDT requer a resolução de um reCAPTCHA no site do TST.',
      },
    };


  } catch (error: any) {
    console.error('Erro ao buscar CNDT:', error);
    
    // Se o erro for de timeout ou rede, retornar pending ao invés de error
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        success: true,
        status: 'pending',
        certificateType: 'CNDT',
        errorMessage: 'Timeout ao consultar TST - tente novamente mais tarde',
        queryData: {
          manualUrl: 'https://www.tst.jus.br/certidao',
        },
      };
    }
    
    return {
      success: false,
      status: 'error',
      certificateType: 'CNDT',
      errorMessage: error.message || 'Erro desconhecido ao consultar CNDT',
    };
  }
}

/**
 * Valida se um certificado está dentro do prazo de validade
 * 
 * @param expiryDate - Data de expiração do certificado
 * @returns true se o certificado ainda é válido
 */
export function isCertificateValid(expiryDate: Date | string | null | undefined): boolean {
  if (!expiryDate) return false;
  
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return expiry > new Date();
}

/**
 * Calcula quantos dias faltam para o certificado expirar
 * 
 * @param expiryDate - Data de expiração do certificado
 * @returns Número de dias até a expiração (negativo se já expirou)
 */
export function daysUntilExpiry(expiryDate: Date | string | null | undefined): number | null {
  if (!expiryDate) return null;
  
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Retorna o nome amigável do tipo de certificado
 * 
 * @param certificateType - Tipo do certificado (CND_FEDERAL, CNDT, etc)
 * @returns Nome amigável em português
 */
export function getCertificateTypeName(certificateType: string): string {
  const names: Record<string, string> = {
    'CND_FEDERAL': 'CND Federal (Receita Federal)',
    'CNDT': 'CNDT (Débitos Trabalhistas)',
    'CND_ESTADUAL': 'CND Estadual',
    'CND_MUNICIPAL': 'CND Municipal',
  };
  
  return names[certificateType] || certificateType;
}

/**
 * Retorna a cor do badge baseado no status do certificado
 * 
 * @param status - Status do certificado
 * @returns Classes CSS do Tailwind para o badge
 */
export function getCertificateStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'valid': 'bg-green-100 text-green-800 border-green-300',
    'invalid': 'bg-red-100 text-red-800 border-red-300',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'error': 'bg-red-100 text-red-800 border-red-300',
    'not_found': 'bg-gray-100 text-gray-800 border-gray-300',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Retorna o texto amigável do status do certificado
 * 
 * @param status - Status do certificado
 * @returns Texto em português
 */
export function getCertificateStatusText(status: string): string {
  const texts: Record<string, string> = {
    'valid': 'Válido',
    'invalid': 'Inválido',
    'pending': 'Pendente',
    'error': 'Erro',
    'not_found': 'Não Encontrado',
  };
  
  return texts[status] || status;
}
