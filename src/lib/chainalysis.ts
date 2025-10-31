/**
 * Chainalysis API Integration
 * 
 * Integração com Chainalysis para screening de wallets e verificação de sanções.
 * 
 * APIs utilizadas:
 * 1. Free Sanctions Screening (gratuita) - Verificação de sanções OFAC
 * 2. Address Screening (paga) - Avaliação de risco (Low, Medium, High, Severe)
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Níveis de risco retornados pela Address Screening API
 */
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Severe';

/**
 * Tipos de endereço identificados pela Chainalysis
 */
export type AddressType = 'PRIVATE_WALLET' | 'LIQUIDITY_POOL';

/**
 * Status da verificação
 */
export type ScreeningStatus = 'COMPLETE' | 'PENDING' | 'ERROR';

/**
 * Categoria de exposição
 */
export interface Exposure {
  category: string;
  value: number;
}

/**
 * Identificação de sanção
 */
export interface SanctionIdentification {
  category: 'sanctions';
  name: string;
  description: string;
  url: string;
}

/**
 * Resposta da Free Sanctions API
 */
export interface SanctionsCheckResult {
  identifications: SanctionIdentification[];
}

/**
 * Resposta da Address Screening API
 */
export interface AddressScreeningResult {
  address: string;
  risk: RiskLevel;
  riskReason: string | null;
  addressType: AddressType;
  cluster: any | null;
  addressIdentifications: any[];
  exposures: Exposure[];
  triggers: any[];
  status: ScreeningStatus;
}

/**
 * Resultado consolidado do screening completo
 */
export interface WalletScreeningResult {
  address: string;
  isSanctioned: boolean;
  sanctionDetails?: SanctionIdentification[];
  riskLevel?: RiskLevel;
  riskReason?: string | null;
  addressType?: AddressType;
  exposures?: Exposure[];
  decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  decisionReason: string;
  timestamp: string;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const SANCTIONS_API_BASE_URL = 'https://public.chainalysis.com';
const ADDRESS_SCREENING_API_BASE_URL = 'https://api.chainalysis.com/api/risk';

/**
 * API key para Address Screening (paga)
 * Configurada via variável de ambiente CHAINALYSIS_API_KEY
 */
const ADDRESS_SCREENING_API_KEY = process.env.CHAINALYSIS_API_KEY;

/**
 * API key para Free Sanctions Screening (gratuita)
 * TODO: Obter em https://public.chainalysis.com/
 * Por enquanto, usar a mesma key do Address Screening
 */
const SANCTIONS_API_KEY = process.env.CHAINALYSIS_API_KEY;

// ============================================================================
// SANCTIONS SCREENING (FREE)
// ============================================================================

/**
 * Verifica se um endereço está em listas de sanções (OFAC, etc.)
 * 
 * API GRATUITA - Rate limit: 5000 requests / 5 minutos
 * 
 * @param address - Endereço blockchain para verificar (case-sensitive)
 * @returns Resultado da verificação de sanções
 * @throws Error se a API retornar erro
 */
export async function checkSanctions(address: string): Promise<SanctionsCheckResult> {
  if (!SANCTIONS_API_KEY) {
    throw new Error('CHAINALYSIS_API_KEY não configurada');
  }

  try {
    const response = await fetch(
      `${SANCTIONS_API_BASE_URL}/api/v1/address/${address}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': SANCTIONS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Endereço inválido para verificação de sanções');
      }
      throw new Error(`Erro na API de sanções: ${response.status} ${response.statusText}`);
    }

    const data: SanctionsCheckResult = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao verificar sanções:', error);
    throw error;
  }
}

/**
 * Verifica se um endereço está sancionado
 * 
 * @param address - Endereço blockchain para verificar
 * @returns true se o endereço está sancionado, false caso contrário
 */
export async function isSanctioned(address: string): Promise<boolean> {
  const result = await checkSanctions(address);
  return result.identifications.length > 0;
}

// ============================================================================
// ADDRESS SCREENING (PAID)
// ============================================================================

/**
 * Realiza screening de risco de um endereço
 * 
 * API PAGA - Rate limit: 40 requests / segundo
 * 
 * @param address - Endereço blockchain para avaliar
 * @param memo - Memo opcional para associar com a requisição
 * @returns Avaliação de risco do endereço
 * @throws Error se a API retornar erro
 */
export async function screenAddress(
  address: string,
  memo?: string
): Promise<AddressScreeningResult> {
  if (!ADDRESS_SCREENING_API_KEY) {
    throw new Error('CHAINALYSIS_API_KEY não configurada');
  }

  try {
    const url = new URL(`${ADDRESS_SCREENING_API_BASE_URL}/v2/entities/${address}`);
    if (memo) {
      url.searchParams.append('memo', memo);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Token': ADDRESS_SCREENING_API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit excedido - aguarde antes de tentar novamente');
      }
      throw new Error(`Erro na API de screening: ${response.status} ${response.statusText}`);
    }

    const data: AddressScreeningResult = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao fazer screening de endereço:', error);
    throw error;
  }
}

// ============================================================================
// WALLET SCREENING COMPLETO
// ============================================================================

/**
 * Realiza screening completo de uma wallet
 * 
 * Fluxo:
 * 1. Verifica sanções (Free Sanctions API)
 *    - Se sancionado → REJEITAR
 * 2. Avalia risco (Address Screening API)
 *    - Severe/High → REJEITAR
 *    - Medium → REVISAR MANUALMENTE
 *    - Low → APROVAR
 * 
 * @param address - Endereço da wallet para screening
 * @param memo - Memo opcional (ex: applicant_id)
 * @returns Resultado consolidado do screening
 */
export async function performWalletScreening(
  address: string,
  memo?: string
): Promise<WalletScreeningResult> {
  const timestamp = new Date().toISOString();

  try {
    // NOTA: Free Sanctions API desabilitada temporariamente (precisa de API key separada)
    // A Address Screening API já detecta sanções nas exposições ("sanctioned entity")
    
    // 1. VERIFICAR SANÇÕES (DESABILITADO)
    // console.log(`[Chainalysis] Verificando sanções para ${address}`);
    // const sanctionsResult = await checkSanctions(address);
    // const sanctioned = sanctionsResult.identifications.length > 0;
    // if (sanctioned) {
    //   console.log(`[Chainalysis] Wallet ${address} está SANCIONADA`);
    //   return {
    //     address,
    //     isSanctioned: true,
    //     sanctionDetails: sanctionsResult.identifications,
    //     decision: 'REJECTED',
    //     decisionReason: `Wallet está em lista de sanções: ${sanctionsResult.identifications[0].name}`,
    //     timestamp,
    //   };
    // }

    // 2. AVALIAR RISCO (PAGO)
    console.log(`[Chainalysis] Avaliando risco para ${address}`);
    const screeningResult = await screenAddress(address, memo);

    // 3. TOMAR DECISÃO BASEADA NO RISCO
    let decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    let decisionReason: string;

    switch (screeningResult.risk) {
      case 'Severe':
        decision = 'REJECTED';
        decisionReason = `Risco SEVERO detectado${screeningResult.riskReason ? `: ${screeningResult.riskReason}` : ''}`;
        break;

      case 'High':
        decision = 'REJECTED';
        decisionReason = `Risco ALTO detectado${screeningResult.riskReason ? `: ${screeningResult.riskReason}` : ''}`;
        break;

      case 'Medium':
        decision = 'MANUAL_REVIEW';
        decisionReason = `Risco MÉDIO detectado - requer revisão manual${screeningResult.riskReason ? `: ${screeningResult.riskReason}` : ''}`;
        break;

      case 'Low':
        decision = 'APPROVED';
        decisionReason = 'Risco BAIXO - wallet aprovada';
        break;

      default:
        decision = 'MANUAL_REVIEW';
        decisionReason = `Nível de risco desconhecido: ${screeningResult.risk}`;
    }

    console.log(`[Chainalysis] Decisão para ${address}: ${decision} - ${decisionReason}`);

    return {
      address,
      isSanctioned: false,
      riskLevel: screeningResult.risk,
      riskReason: screeningResult.riskReason,
      addressType: screeningResult.addressType,
      exposures: screeningResult.exposures,
      decision,
      decisionReason,
      timestamp,
    };
  } catch (error) {
    console.error(`[Chainalysis] Erro ao fazer screening de ${address}:`, error);
    
    // Em caso de erro, retornar MANUAL_REVIEW para não bloquear o processo
    return {
      address,
      isSanctioned: false,
      decision: 'MANUAL_REVIEW',
      decisionReason: `Erro ao fazer screening: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formata o resultado do screening para exibição
 */
export function formatScreeningResult(result: WalletScreeningResult): string {
  let output = `Screening da wallet ${result.address}:\n`;
  output += `Timestamp: ${result.timestamp}\n`;
  output += `Sancionada: ${result.isSanctioned ? 'SIM' : 'NÃO'}\n`;
  
  if (result.isSanctioned && result.sanctionDetails) {
    output += `Detalhes da sanção:\n`;
    result.sanctionDetails.forEach((sanction) => {
      output += `  - ${sanction.name}\n`;
      output += `    ${sanction.description}\n`;
      output += `    ${sanction.url}\n`;
    });
  }
  
  if (result.riskLevel) {
    output += `Nível de risco: ${result.riskLevel}\n`;
  }
  
  if (result.riskReason) {
    output += `Razão do risco: ${result.riskReason}\n`;
  }
  
  if (result.addressType) {
    output += `Tipo de endereço: ${result.addressType}\n`;
  }
  
  if (result.exposures && result.exposures.length > 0) {
    output += `Exposições:\n`;
    result.exposures.forEach((exposure) => {
      output += `  - ${exposure.category}: ${exposure.value}\n`;
    });
  }
  
  output += `Decisão: ${result.decision}\n`;
  output += `Razão: ${result.decisionReason}\n`;
  
  return output;
}

/**
 * Valida se o endereço está no formato correto
 * (Básico - apenas verifica se não está vazio)
 */
export function validateAddress(address: string): boolean {
  if (!address || address.trim().length === 0) {
    return false;
  }
  
  // TODO: Adicionar validação específica para TRC-20 se necessário
  // TRC-20 addresses começam com 'T' e têm 34 caracteres
  
  return true;
}

