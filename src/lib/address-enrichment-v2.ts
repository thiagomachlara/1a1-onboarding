/**
 * Address Enrichment V2
 * 
 * Enriquece endereços da Receita Federal com dados do ViaCEP
 * para incluir o tipo de logradouro (Rua, Avenida, etc)
 */

import { consultarCNPJ, type CNPJData } from './brasilapi';
import { consultarCEP, type ViaCepData } from './viacep';

export interface EnrichedAddress {
  logradouro: string; // Endereço completo com tipo (ex: "RUA XV DE NOVEMBRO")
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  fonte_primaria: 'receita' | 'viacep';
  fonte_secundaria: 'receita' | 'viacep' | null;
}

/**
 * Enriquece endereço da Receita Federal com dados do ViaCEP
 * 
 * Fluxo:
 * 1. Consulta Receita Federal (BrasilAPI) para obter dados básicos
 * 2. Consulta ViaCEP para obter o tipo de logradouro completo
 * 3. Mescla os dados, priorizando o logradouro do ViaCEP
 */
export async function enriquecerEndereco(cnpj: string): Promise<EnrichedAddress | null> {
  try {
    // 1. Consultar Receita Federal (BrasilAPI)
    console.log(`[Address Enrichment V2] Consultando Receita Federal para CNPJ: ${cnpj}`);
    const receitaData = await consultarCNPJ(cnpj);
    
    if (!receitaData) {
      console.error('[Address Enrichment V2] CNPJ não encontrado na Receita Federal');
      return null;
    }

    // 2. Consultar ViaCEP para enriquecer com tipo de logradouro
    console.log(`[Address Enrichment V2] Consultando ViaCEP para CEP: ${receitaData.cep}`);
    const viaCepData = await consultarCEP(receitaData.cep);

    // 3. Mesclar e Priorizar
    let logradouroFinal: string;
    let bairroFinal: string;
    let fonteSecundaria: 'viacep' | null = null;

    if (viaCepData && viaCepData.logradouro) {
      // ViaCEP retornou logradouro completo (com tipo)
      logradouroFinal = viaCepData.logradouro;
      bairroFinal = viaCepData.bairro || receitaData.bairro;
      fonteSecundaria = 'viacep';
      console.log(`[Address Enrichment V2] Usando logradouro do ViaCEP: "${logradouroFinal}"`);
    } else {
      // Fallback para dados da Receita Federal
      logradouroFinal = receitaData.logradouro;
      bairroFinal = receitaData.bairro;
      console.warn(`[Address Enrichment V2] ViaCEP não retornou dados, usando Receita Federal: "${logradouroFinal}"`);
    }

    return {
      logradouro: logradouroFinal,
      numero: receitaData.numero,
      complemento: receitaData.complemento || null,
      bairro: bairroFinal,
      cidade: receitaData.municipio,
      estado: receitaData.uf,
      cep: receitaData.cep,
      fonte_primaria: 'receita',
      fonte_secundaria: fonteSecundaria,
    };
  } catch (error) {
    console.error('[Address Enrichment V2] Erro ao enriquecer endereço:', error);
    return null;
  }
}

/**
 * Formata endereço enriquecido para exibição
 */
export function formatarEnderecoEnriquecido(data: EnrichedAddress): string {
  const partes = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
    `${data.cidade}/${data.estado}`,
    `CEP: ${data.cep}`,
  ].filter(Boolean);

  return partes.join(', ');
}
