/**
 * ViaCEP Integration
 * Consulta dados de CEP via ViaCEP
 */

export interface ViaCepData {
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
  erro?: boolean;
}

/**
 * Consulta dados de CEP na ViaCEP
 */
export async function consultarCEP(cep: string): Promise<ViaCepData | null> {
  try {
    // Remove formatação do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      throw new Error('CEP inválido');
    }

    const response = await fetch(
      `https://viacep.com.br/ws/${cepLimpo}/json/`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Erro ao consultar ViaCEP:', response.statusText);
      return null;
    }

    const data: ViaCepData = await response.json();
    
    // ViaCEP retorna {erro: true} quando CEP não é encontrado
    if (data.erro) {
      console.error('CEP não encontrado na ViaCEP');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao consultar ViaCEP:', error);
    return null;
  }
}
