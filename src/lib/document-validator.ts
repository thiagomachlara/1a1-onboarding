/**
 * Utilitário para validação de CPF e CNPJ
 */

/**
 * Remove caracteres não numéricos de uma string
 */
export function removeNonNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formata CPF: 12345678900 → 123.456.789-00
 */
export function formatCPF(cpf: string): string {
  const numbers = removeNonNumeric(cpf);
  
  if (numbers.length !== 11) {
    return cpf;
  }
  
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ: 12345678000190 → 12.345.678/0001-90
 */
export function formatCNPJ(cnpj: string): string {
  const numbers = removeNonNumeric(cnpj);
  
  if (numbers.length !== 14) {
    return cnpj;
  }
  
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Valida CPF usando algoritmo oficial da Receita Federal
 */
export function validateCPF(cpf: string): boolean {
  const numbers = removeNonNumeric(cpf);
  
  // CPF deve ter 11 dígitos
  if (numbers.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numbers)) {
    return false;
  }
  
  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(9))) {
    return false;
  }
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(10))) {
    return false;
  }
  
  return true;
}

/**
 * Valida CNPJ usando algoritmo oficial da Receita Federal
 */
export function validateCNPJ(cnpj: string): boolean {
  const numbers = removeNonNumeric(cnpj);
  
  // CNPJ deve ter 14 dígitos
  if (numbers.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numbers)) {
    return false;
  }
  
  // Valida primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers.charAt(12))) {
    return false;
  }
  
  // Valida segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers.charAt(13))) {
    return false;
  }
  
  return true;
}

/**
 * Gera userId único baseado em CPF
 * Exemplo: 123.456.789-00 → cpf_12345678900
 */
export function generateUserIdFromCPF(cpf: string): string {
  const numbers = removeNonNumeric(cpf);
  return `cpf_${numbers}`;
}

/**
 * Gera userId único baseado em CNPJ
 * Exemplo: 12.345.678/0001-90 → cnpj_12345678000190
 */
export function generateUserIdFromCNPJ(cnpj: string): string {
  const numbers = removeNonNumeric(cnpj);
  return `cnpj_${numbers}`;
}

/**
 * Aplica máscara de CPF enquanto o usuário digita
 */
export function maskCPF(value: string): string {
  const numbers = removeNonNumeric(value);
  
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return numbers.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  }
  if (numbers.length <= 9) {
    return numbers.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
}

/**
 * Aplica máscara de CNPJ enquanto o usuário digita
 */
export function maskCNPJ(value: string): string {
  const numbers = removeNonNumeric(value);
  
  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 5) {
    return numbers.replace(/(\d{2})(\d{0,3})/, '$1.$2');
  }
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (numbers.length <= 12) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  }
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
}

