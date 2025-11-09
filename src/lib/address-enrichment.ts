/**
 * Address Enrichment Library
 * 
 * Enriquece dados de endereço usando APIs externas (BrasilAPI e ViaCEP)
 */

interface BrasilAPIResponse {
  uf: string;
  cep: string;
  qsa: any[];
  cnpj: string;
  pais: string | null;
  email: string | null;
  porte: string;
  bairro: string;
  numero: string;
  ddd_fax: string;
  municipio: string;
  logradouro: string;
  cnae_fiscal: number;
  codigo_pais: number | null;
  complemento: string;
  codigo_porte: number;
  razao_social: string;
  nome_fantasia: string;
  capital_social: number;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  opcao_pelo_mei: boolean;
  descricao_situacao_cadastral: string;
  codigo_municipio: string;
  situacao_especial: string;
  opcao_pelo_simples: boolean;
  situacao_cadastral: number;
  data_opcao_pelo_mei: string | null;
  data_exclusao_do_mei: string | null;
  cnae_fiscal_descricao: string;
  codigo_municipio_ibge: number;
  data_inicio_atividade: string;
}

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface EnrichedAddress {
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  source: 'brasilapi' | 'viacep';
}

/**
 * Enriquece endereço usando CNPJ via BrasilAPI
 */
export async function enrichAddressFromCNPJ(cnpj: string): Promise<EnrichedAddress> {
  try {
    // Limpar CNPJ (remover pontos, barras e hífens)
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    // Consultar BrasilAPI
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (!response.ok) {
      throw new Error(`BrasilAPI returned ${response.status}: ${response.statusText}`);
    }
    
    const data: BrasilAPIResponse = await response.json();
    
    return {
      street: data.logradouro,
      number: data.numero || null,
      complement: data.complemento || null,
      neighborhood: data.bairro,
      city: data.municipio,
      state: data.uf,
      postal_code: data.cep,
      source: 'brasilapi'
    };
  } catch (error) {
    console.error('Error enriching address from CNPJ:', error);
    throw error;
  }
}

/**
 * Extrai CEP de um texto de endereço
 */
export function extractCEP(address: string): string | null {
  if (!address) return null;
  
  // Padrões de CEP brasileiro
  const patterns = [
    /\b\d{2}\.\d{3}-\d{3}\b/,  // Formato: 80.045-125
    /\b\d{5}-\d{3}\b/,          // Formato: 80045-125
    /\b\d{8}\b/,                // Formato: 80045125
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      // Normalizar para formato sem pontos e hífens
      return match[0].replace(/[.-]/g, '');
    }
  }
  
  return null;
}

/**
 * Enriquece endereço usando CEP via ViaCEP
 */
export async function enrichAddressFromCEP(cep: string): Promise<EnrichedAddress> {
  try {
    // Limpar CEP (remover pontos e hífens)
    const cleanCEP = cep.replace(/[^\d]/g, '');
    
    // Consultar ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error(`ViaCEP returned ${response.status}: ${response.statusText}`);
    }
    
    const data: ViaCEPResponse = await response.json();
    
    // ViaCEP retorna erro como campo no JSON
    if ('erro' in data) {
      throw new Error('CEP not found in ViaCEP');
    }
    
    return {
      street: data.logradouro,
      number: null, // ViaCEP não retorna número
      complement: data.complemento || null,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      postal_code: data.cep.replace('-', ''),
      source: 'viacep'
    };
  } catch (error) {
    console.error('Error enriching address from CEP:', error);
    throw error;
  }
}

/**
 * Estratégia híbrida: tenta BrasilAPI primeiro, depois ViaCEP
 */
export async function enrichAddress(
  cnpj: string,
  addressText?: string
): Promise<EnrichedAddress> {
  try {
    // Primeira tentativa: BrasilAPI (CNPJ)
    console.log(`[Address Enrichment] Trying BrasilAPI with CNPJ: ${cnpj}`);
    const enriched = await enrichAddressFromCNPJ(cnpj);
    console.log(`[Address Enrichment] Success with BrasilAPI`);
    return enriched;
  } catch (error) {
    console.warn(`[Address Enrichment] BrasilAPI failed:`, error);
    
    // Fallback: ViaCEP (CEP extraído do texto)
    if (addressText) {
      const cep = extractCEP(addressText);
      if (cep) {
        try {
          console.log(`[Address Enrichment] Trying ViaCEP with CEP: ${cep}`);
          const enriched = await enrichAddressFromCEP(cep);
          console.log(`[Address Enrichment] Success with ViaCEP`);
          return enriched;
        } catch (viacepError) {
          console.error(`[Address Enrichment] ViaCEP also failed:`, viacepError);
        }
      }
    }
    
    throw new Error('Failed to enrich address with both BrasilAPI and ViaCEP');
  }
}
