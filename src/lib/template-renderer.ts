export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * Renderiza um template substituindo variáveis
 */
export function renderTemplate(
  templateContent: string,
  variables: TemplateVariables
): string {
  let rendered = templateContent;
  
  // Substituir variáveis no formato {{variavel}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }
  
  // Verificar se há variáveis não substituídas
  const unreplacedVars = rendered.match(/\{\{[^}]+\}\}/g);
  if (unreplacedVars) {
    console.warn('⚠️ Variáveis não substituídas:', unreplacedVars);
  }
  
  return rendered;
}

/**
 * Extrai todas as variáveis de um template
 */
export function extractVariables(templateContent: string): string[] {
  const matches = templateContent.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(match => match.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Valida se um template tem todas as variáveis definidas
 */
export function validateTemplate(
  templateContent: string,
  definedVariables: string[]
): { valid: boolean; errors: string[] } {
  const usedVariables = extractVariables(templateContent);
  const errors: string[] = [];
  
  // Verificar variáveis não definidas
  for (const variable of usedVariables) {
    if (!definedVariables.includes(variable)) {
      errors.push(`Variável não definida: {{${variable}}}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Prepara variáveis para renderização de contrato
 */
export function prepareContractVariables(applicant: any, signedAt: string, ip: string, userAgent: string): TemplateVariables {
  const isIndividual = applicant.applicant_type === 'individual';
  
  return {
    nome: applicant.company_name || applicant.full_name || 'Não informado',
    documento: applicant.document_number || 'Não informado',
    doc_label: isIndividual ? 'CPF' : 'CNPJ',
    tipo_cliente: isIndividual ? 'Pessoa Física' : 'Pessoa Jurídica',
    email: applicant.email || 'Não informado',
    telefone: applicant.phone || 'Não informado',
    data_assinatura: new Date(signedAt).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'long',
      timeStyle: 'medium',
    }),
    ip,
    user_agent: userAgent,
  };
}

/**
 * Prepara variáveis para renderização de termo de wallet
 */
export function prepareWalletTermVariables(
  applicant: any,
  walletAddress: string,
  signedAt: string,
  ip: string,
  userAgent: string
): TemplateVariables {
  const isIndividual = applicant.applicant_type === 'individual';
  
  return {
    nome: applicant.company_name || applicant.full_name || 'Não informado',
    documento: applicant.document_number || 'Não informado',
    doc_label: isIndividual ? 'CPF' : 'CNPJ',
    wallet_address: walletAddress,
    data_assinatura: new Date(signedAt).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'long',
      timeStyle: 'medium',
    }),
    ip,
    user_agent: userAgent,
  };
}
