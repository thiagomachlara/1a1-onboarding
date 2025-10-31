/**
 * BrasilAPI Integration
 * Consulta dados de CNPJ na Receita Federal via BrasilAPI
 */

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  uf: string;
  cep: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  email: string | null;
  ddd_telefone_1: string;
  ddd_telefone_2: string | null;
  cnae_fiscal: number;
  porte: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  qsa: Array<{
    nome_socio: string;
    cnpj_cpf_do_socio: string;
    codigo_qualificacao_socio: number;
    percentual_capital_social: number;
    data_entrada_sociedade: string;
    cpf_representante_legal: string | null;
    nome_representante_legal: string | null;
    codigo_qualificacao_representante_legal: number | null;
  }>;
}

/**
 * Consulta dados de CNPJ na BrasilAPI
 */
export async function consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
  try {
    // Remove formatação do CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ inválido');
    }

    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.error('CNPJ não encontrado na Receita Federal');
        return null;
      }
      throw new Error(`Erro ao consultar CNPJ: ${response.statusText}`);
    }

    const data: CNPJData = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao consultar BrasilAPI:', error);
    return null;
  }
}

/**
 * Formata endereço completo a partir dos dados do CNPJ
 */
export function formatarEndereco(data: CNPJData): string {
  const partes = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
    data.municipio,
    data.uf,
    `CEP ${data.cep}`,
  ].filter(Boolean);

  return partes.join(', ');
}

/**
 * Formata telefone no formato (XX) XXXXX-XXXX
 */
export function formatarTelefone(ddd: string): string | null {
  if (!ddd) return null;
  
  const numeros = ddd.replace(/\D/g, '');
  if (numeros.length < 10) return null;

  const dddPart = numeros.slice(0, 2);
  const numero = numeros.slice(2);

  if (numero.length === 8) {
    return `(${dddPart}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
  } else if (numero.length === 9) {
    return `(${dddPart}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  }

  return null;
}

