/**
 * Address Enrichment Library
 * 
 * Enriquece dados de endereço usando API dos Correios (ViaCEP)
 * 
 * IMPORTANTE: Não sobrescreve o endereço completo da Sumsub!
 * Apenas complementa com dados separados (bairro, cidade, estado) via CEP.
 */

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

export interface EnrichedAddressData {
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  street_type?: string; // Tipo de logradouro (Rua, Avenida, Praça, etc)
  source: 'viacep';
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
 * Enriquece endereço usando CEP via ViaCEP (API dos Correios)
 * 
 * Retorna APENAS dados complementares (bairro, cidade, estado, tipo de logradouro)
 * NÃO retorna o endereço completo para evitar sobrescrever dados da Sumsub
 */
export async function enrichAddressFromCEP(cep: string): Promise<EnrichedAddressData> {
  try {
    // Limpar CEP (remover pontos e hífens)
    const cleanCEP = cep.replace(/[^\d]/g, '');
    
    console.log(`[Address Enrichment] Consultando ViaCEP: ${cleanCEP}`);
    
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
    
    console.log(`[Address Enrichment] ✓ ViaCEP retornou: ${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`);
    
    return {
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      postal_code: data.cep.replace('-', ''),
      street_type: data.logradouro, // Ex: "Avenida Anita Garibaldi"
      source: 'viacep'
    };
  } catch (error) {
    console.error('[Address Enrichment] Erro ao consultar ViaCEP:', error);
    throw error;
  }
}

/**
 * Enriquece endereço usando CEP extraído do texto
 * 
 * Retorna apenas dados complementares para não sobrescrever endereço da Sumsub
 */
export async function enrichAddress(
  addressText: string
): Promise<EnrichedAddressData | null> {
  try {
    // Extrair CEP do texto
    const cep = extractCEP(addressText);
    
    if (!cep) {
      console.warn('[Address Enrichment] CEP não encontrado no endereço');
      return null;
    }
    
    // Consultar ViaCEP
    const enriched = await enrichAddressFromCEP(cep);
    return enriched;
    
  } catch (error) {
    console.error('[Address Enrichment] Falha ao enriquecer endereço:', error);
    return null;
  }
}
