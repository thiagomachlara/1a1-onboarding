/**
 * Magic Links Generation and Validation
 * Sistema de links mágicos para contrato e wallet
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gera token único para contrato
 */
export async function generateContractToken(applicantId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

  const { error } = await supabase
    .from('applicants')
    .update({
      contract_token: token,
      contract_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', applicantId);

  if (error) {
    console.error('Error generating contract token:', error);
    throw new Error('Failed to generate contract token');
  }

  return token;
}

/**
 * Gera token único para wallet
 */
export async function generateWalletToken(applicantId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expira em 30 dias

  const { error } = await supabase
    .from('applicants')
    .update({
      wallet_token: token,
      wallet_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', applicantId);

  if (error) {
    console.error('Error generating wallet token:', error);
    throw new Error('Failed to generate wallet token');
  }

  return token;
}

/**
 * Valida token de contrato
 */
export async function validateContractToken(token: string) {
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('contract_token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Token inválido' };
  }

  // Verifica se já foi assinado
  if (data.contract_signed_at) {
    return { valid: false, error: 'Contrato já foi assinado' };
  }

  // Verifica se expirou
  const expiresAt = new Date(data.contract_token_expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Link expirado' };
  }

  return { valid: true, applicant: data };
}

/**
 * Valida token de wallet
 */
export async function validateWalletToken(token: string) {
  const { data, error } = await supabase
    .from('applicants')
    .select(`
      *,
      business_data (*)
    `)
    .eq('wallet_token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Token inválido' };
  }

  // Verifica se contrato foi assinado
  if (!data.contract_signed_at) {
    return { valid: false, error: 'Contrato ainda não foi assinado' };
  }

  // Verifica se wallet já foi cadastrada
  if (data.business_data?.[0]?.wallet_address) {
    return { valid: false, error: 'Wallet já foi cadastrada' };
  }

  // Verifica se expirou
  const expiresAt = new Date(data.wallet_token_expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Link expirado' };
  }

  return { valid: true, applicant: data };
}

/**
 * Marca contrato como assinado
 */
export async function signContract(
  applicantId: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const { error } = await supabase
    .from('applicants')
    .update({
      contract_signed_at: new Date().toISOString(),
      contract_ip: ip,
      contract_user_agent: userAgent,
    })
    .eq('id', applicantId);

  if (error) {
    console.error('Error signing contract:', error);
    throw new Error('Failed to sign contract');
  }
}

/**
 * Salva wallet cadastrada
 */
export async function saveWallet(
  applicantId: string,
  walletAddress: string
): Promise<void> {
  // Busca ou cria business_data
  const { data: businessData } = await supabase
    .from('business_data')
    .select('*')
    .eq('applicant_id', applicantId)
    .single();

  if (businessData) {
    // Atualiza wallet existente
    const { error } = await supabase
      .from('business_data')
      .update({
        wallet_address: walletAddress,
        wallet_verified: false, // Será verificado manualmente via Chainalysis
        updated_at: new Date().toISOString(),
      })
      .eq('applicant_id', applicantId);

    if (error) {
      console.error('Error updating wallet:', error);
      throw new Error('Failed to update wallet');
    }
  } else {
    // Cria novo business_data
    const { error } = await supabase
      .from('business_data')
      .insert({
        applicant_id: applicantId,
        wallet_address: walletAddress,
        wallet_verified: false,
      });

    if (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }
}

/**
 * Gera URL completa do magic link
 */
export function generateContractLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
  return `${baseUrl}/contract?token=${token}`;
}

/**
 * Gera URL completa do magic link de wallet
 */
export function generateWalletLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
  return `${baseUrl}/wallet?token=${token}`;
}

