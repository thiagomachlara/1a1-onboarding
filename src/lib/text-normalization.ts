/**
 * Normalização profissional de texto para endereços
 * Converte para Title Case mantendo exceções e siglas
 */

// Palavras que devem permanecer em minúsculo (exceto se forem a primeira palavra)
const LOWERCASE_WORDS = [
  'de', 'da', 'do', 'das', 'dos',
  'e', 'ou',
  'em', 'na', 'no', 'nas', 'nos',
  'a', 'o', 'as', 'os',
  'para', 'com', 'sem', 'sob', 'sobre',
];

// Siglas e abreviações que devem permanecer em maiúsculo
const UPPERCASE_WORDS = [
  'CNPJ', 'CPF', 'RG', 'CEP', 'BR', 'SP', 'RJ', 'MG', 'PR', 'SC', 'RS',
  'BA', 'PE', 'CE', 'PA', 'GO', 'MS', 'MT', 'DF', 'ES', 'RN', 'PB',
  'MA', 'PI', 'AL', 'SE', 'RO', 'AC', 'AM', 'RR', 'AP', 'TO',
  'LTDA', 'SA', 'ME', 'EPP', 'EIRELI',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
];

// Abreviações que devem ter apenas primeira letra maiúscula
const ABBREVIATIONS: Record<string, string> = {
  'APT': 'Apt',
  'APTO': 'Apto',
  'ANDAR': 'Andar',
  'SALA': 'Sala',
  'SL': 'Sl',
  'CONJ': 'Conj',
  'CONJUNTO': 'Conjunto',
  'BL': 'Bl',
  'BLOCO': 'Bloco',
  'QD': 'Qd',
  'QUADRA': 'Quadra',
  'LT': 'Lt',
  'LOTE': 'Lote',
  'KM': 'Km',
  'COND': 'Cond',
  'CONDOMINIO': 'Condomínio',
  'ED': 'Ed',
  'EDIFICIO': 'Edifício',
  'RES': 'Res',
  'RESIDENCIAL': 'Residencial',
  'COM': 'Com',
  'COMERCIAL': 'Comercial',
  'TR': 'Tr',
  'TORRE': 'Torre',
  'N': 'Nº',
  'NUM': 'Nº',
  'NUMERO': 'Número',
  'S/N': 'S/N',
  'SN': 'S/N',
};

/**
 * Normaliza uma palavra individual
 */
function normalizeWord(word: string, isFirstWord: boolean): string {
  const upperWord = word.toUpperCase();
  
  // Verifica se é uma sigla que deve ficar em maiúsculo
  if (UPPERCASE_WORDS.includes(upperWord)) {
    return upperWord;
  }
  
  // Verifica se é uma abreviação conhecida
  if (ABBREVIATIONS[upperWord]) {
    return ABBREVIATIONS[upperWord];
  }
  
  // Verifica se é uma palavra que deve ficar em minúsculo (exceto se for a primeira)
  if (!isFirstWord && LOWERCASE_WORDS.includes(word.toLowerCase())) {
    return word.toLowerCase();
  }
  
  // Aplica Title Case padrão
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normaliza um texto completo para Title Case inteligente
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Remove espaços extras
  text = text.trim().replace(/\s+/g, ' ');
  
  // Divide em palavras mantendo pontuação
  const words = text.split(/(\s+|,|-|\/)/);
  
  let isFirstWord = true;
  
  const normalized = words.map((word) => {
    // Mantém espaços e pontuação
    if (/^\s+$/.test(word) || /^[,\-\/]$/.test(word)) {
      return word;
    }
    
    const result = normalizeWord(word, isFirstWord);
    isFirstWord = false;
    return result;
  });
  
  return normalized.join('');
}

/**
 * Normaliza um endereço completo
 */
export interface NormalizedAddress {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export function normalizeAddress(address: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): NormalizedAddress {
  return {
    logradouro: normalizeText(address.logradouro),
    numero: address.numero || '',
    complemento: normalizeText(address.complemento),
    bairro: normalizeText(address.bairro),
    cidade: normalizeText(address.cidade),
    estado: address.estado?.toUpperCase() || '',
    cep: address.cep || '',
  };
}
