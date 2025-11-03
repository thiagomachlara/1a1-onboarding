import { createClient } from '@supabase/supabase-js';

// Cliente Supabase (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Usar service role key para operações server-side (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Tipos de dados
 */
export interface Applicant {
  id?: string;
  external_user_id: string;
  applicant_id?: string;
  inspection_id?: string;
  applicant_type: 'individual' | 'company';
  current_status: 'created' | 'pending' | 'approved' | 'rejected' | 'onHold';
  review_answer?: 'GREEN' | 'RED' | 'YELLOW';
  document_number?: string;
  full_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  ubo_name?: string; // Nome do UBO (Ultimate Beneficial Owner) para PJ
  created_at?: string;
  updated_at?: string;
  first_verification_at?: string;
  last_verification_at?: string;
  approved_at?: string;
  rejected_at?: string;
  sumsub_level_name?: string;
  sumsub_review_result?: any;
  rejection_reason?: string;
}

export interface VerificationHistory {
  id?: string;
  applicant_id: string;
  event_type: string;
  old_status?: string;
  new_status?: string;
  review_answer?: 'GREEN' | 'RED' | 'YELLOW';
  rejection_reason?: string;
  webhook_payload?: any;
  metadata?: any;
  created_at?: string;
}

export interface BusinessData {
  id?: string;
  applicant_id: string;
  wallet_address?: string;
  wallet_network?: 'TRC20' | 'ERC20' | 'BEP20';
  wallet_verified?: boolean;
  wallet_verified_at?: string;
  contract_signed?: boolean;
  contract_signed_at?: string;
  contract_document_url?: string;
  contract_ip_address?: string;
  daily_limit?: number;
  monthly_limit?: number;
  per_transaction_limit?: number;
  tier?: 'basic' | 'standard' | 'premium' | 'vip';
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Cria ou atualiza um applicant
 */
export async function upsertApplicant(data: Applicant) {
  try {
    const { data: result, error } = await supabase
      .from('applicants')
      .upsert(data, {
        onConflict: 'external_user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting applicant:', error);
      throw error;
    }

    console.log('Applicant upserted:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to upsert applicant:', error);
    throw error;
  }
}

/**
 * Busca um applicant por external_user_id
 */
export async function getApplicantByExternalUserId(externalUserId: string) {
  try {
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('external_user_id', externalUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error getting applicant:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicant:', error);
    return null;
  }
}

/**
 * Busca um applicant por applicant_id (Sumsub ID)
 */
export async function getApplicantByApplicantId(applicantId: string) {
  try {
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('applicant_id', applicantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting applicant:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicant:', error);
    return null;
  }
}

/**
 * Adiciona um registro ao histórico de verificação
 */
export async function addVerificationHistory(data: VerificationHistory) {
  try {
    const { data: result, error } = await supabase
      .from('verification_history')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error adding verification history:', error);
      throw error;
    }

    console.log('Verification history added:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to add verification history:', error);
    throw error;
  }
}

/**
 * Cria ou atualiza business_data
 */
export async function upsertBusinessData(data: BusinessData) {
  try {
    const { data: result, error } = await supabase
      .from('business_data')
      .upsert(data, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting business data:', error);
      throw error;
    }

    console.log('Business data upserted:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to upsert business data:', error);
    throw error;
  }
}

/**
 * Lista applicants com filtros opcionais
 */
export async function listApplicants(filters?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('current_status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('applicant_type', filters.type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing applicants:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to list applicants:', error);
    return [];
  }
}

/**
 * Busca histórico de verificação de um applicant
 */
export async function getVerificationHistory(applicantId: string) {
  try {
    const { data, error } = await supabase
      .from('verification_history')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting verification history:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get verification history:', error);
    return [];
  }
}

/**
 * Busca dados completos de um applicant (com business_data)
 */
export async function getApplicantFull(externalUserId: string) {
  try {
    const { data, error } = await supabase
      .from('v_applicants_full')
      .select('*')
      .eq('external_user_id', externalUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting full applicant:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get full applicant:', error);
    return null;
  }
}

/**
 * Busca estatísticas de verificação
 */
export async function getVerificationStats() {
  try {
    const { data, error } = await supabase
      .from('v_verification_stats')
      .select('*');

    if (error) {
      console.error('Error getting verification stats:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get verification stats:', error);
    return [];
  }
}

/**
 * Extrai documento (CPF/CNPJ) do external_user_id
 */
export function extractDocumentFromExternalUserId(externalUserId: string): string | null {
  // Formato: cpf_12345678900 ou cnpj_12345678000190
  const match = externalUserId.match(/^(cpf|cnpj)_(\d+)$/);
  return match ? match[2] : null;
}



/**
 * Busca applicants aprovados
 */
export async function getApprovedApplicants(limit = 100) {
  return listApplicants({ status: 'approved', limit });
}

/**
 * Busca applicants rejeitados
 */
export async function getRejectedApplicants(limit = 100) {
  return listApplicants({ status: 'rejected', limit });
}

/**
 * Busca applicants pendentes
 */
export async function getPendingApplicants(limit = 100) {
  return listApplicants({ status: 'pending', limit });
}

/**
 * Busca applicants por tipo (PF ou PJ)
 */
export async function getApplicantsByType(type: 'individual' | 'company', limit = 100) {
  return listApplicants({ type, limit });
}

/**
 * Busca applicants com wallet cadastrada
 */
export async function getApplicantsWithWallet() {
  try {
    const { data, error } = await supabase
      .from('v_applicants_full')
      .select('*')
      .not('wallet_address', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting applicants with wallet:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicants with wallet:', error);
    return [];
  }
}

/**
 * Busca applicants com contrato assinado
 */
export async function getApplicantsWithContract() {
  try {
    const { data, error } = await supabase
      .from('v_applicants_full')
      .select('*')
      .eq('contract_signed', true)
      .order('contract_signed_at', { ascending: false });

    if (error) {
      console.error('Error getting applicants with contract:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicants with contract:', error);
    return [];
  }
}

/**
 * Busca applicants por tier
 */
export async function getApplicantsByTier(tier: 'basic' | 'standard' | 'premium' | 'vip') {
  try {
    const { data, error } = await supabase
      .from('v_applicants_full')
      .select('*')
      .eq('tier', tier)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting applicants by tier:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicants by tier:', error);
    return [];
  }
}

/**
 * Atualiza wallet de um applicant
 */
export async function updateWallet(
  applicantId: string,
  walletAddress: string,
  walletNetwork: 'TRC20' | 'ERC20' | 'BEP20'
) {
  try {
    const { data, error } = await supabase
      .from('business_data')
      .upsert({
        applicant_id: applicantId,
        wallet_address: walletAddress,
        wallet_network: walletNetwork,
        wallet_verified: false,
      }, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }

    console.log('Wallet updated for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to update wallet:', error);
    throw error;
  }
}

/**
 * Marca wallet como verificada
 */
export async function verifyWallet(applicantId: string) {
  try {
    const { data, error } = await supabase
      .from('business_data')
      .update({
        wallet_verified: true,
        wallet_verified_at: new Date().toISOString(),
      })
      .eq('applicant_id', applicantId)
      .select()
      .single();

    if (error) {
      console.error('Error verifying wallet:', error);
      throw error;
    }

    console.log('Wallet verified for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to verify wallet:', error);
    throw error;
  }
}

/**
 * Marca contrato como assinado
 */
export async function signContract(
  applicantId: string,
  contractDocumentUrl: string,
  ipAddress?: string
) {
  try {
    const { data, error } = await supabase
      .from('business_data')
      .upsert({
        applicant_id: applicantId,
        contract_signed: true,
        contract_signed_at: new Date().toISOString(),
        contract_document_url: contractDocumentUrl,
        contract_ip_address: ipAddress,
      }, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error signing contract:', error);
      throw error;
    }

    console.log('Contract signed for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to sign contract:', error);
    throw error;
  }
}

/**
 * Atualiza tier de um applicant
 */
export async function updateTier(
  applicantId: string,
  tier: 'basic' | 'standard' | 'premium' | 'vip'
) {
  try {
    const { data, error } = await supabase
      .from('business_data')
      .upsert({
        applicant_id: applicantId,
        tier,
      }, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating tier:', error);
      throw error;
    }

    console.log('Tier updated for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to update tier:', error);
    throw error;
  }
}

/**
 * Atualiza limites de transação
 */
export async function updateLimits(
  applicantId: string,
  limits: {
    daily_limit?: number;
    monthly_limit?: number;
    per_transaction_limit?: number;
  }
) {
  try {
    const { data, error } = await supabase
      .from('business_data')
      .upsert({
        applicant_id: applicantId,
        ...limits,
      }, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating limits:', error);
      throw error;
    }

    console.log('Limits updated for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to update limits:', error);
    throw error;
  }
}

/**
 * Adiciona tags a um applicant
 */
export async function addTags(applicantId: string, tags: string[]) {
  try {
    // Busca tags existentes
    const { data: existing, error: fetchError } = await supabase
      .from('business_data')
      .select('tags')
      .eq('applicant_id', applicantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const existingTags = existing?.tags || [];
    const newTags = Array.from(new Set([...existingTags, ...tags]));

    const { data, error } = await supabase
      .from('business_data')
      .upsert({
        applicant_id: applicantId,
        tags: newTags,
      }, {
        onConflict: 'applicant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding tags:', error);
      throw error;
    }

    console.log('Tags added for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to add tags:', error);
    throw error;
  }
}

/**
 * Remove tags de um applicant
 */
export async function removeTags(applicantId: string, tags: string[]) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('business_data')
      .select('tags')
      .eq('applicant_id', applicantId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const existingTags = existing?.tags || [];
    const newTags = existingTags.filter((tag: string) => !tags.includes(tag));

    const { data, error } = await supabase
      .from('business_data')
      .update({ tags: newTags })
      .eq('applicant_id', applicantId)
      .select()
      .single();

    if (error) {
      console.error('Error removing tags:', error);
      throw error;
    }

    console.log('Tags removed for applicant:', applicantId);
    return data;
  } catch (error) {
    console.error('Failed to remove tags:', error);
    throw error;
  }
}

/**
 * Busca applicants por tag
 */
export async function getApplicantsByTag(tag: string) {
  try {
    const { data, error } = await supabase
      .from('v_applicants_full')
      .select('*')
      .contains('tags', [tag])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting applicants by tag:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicants by tag:', error);
    return [];
  }
}

/**
 * Conta total de applicants
 */
export async function countApplicants(filters?: { status?: string; type?: string }) {
  try {
    let query = supabase
      .from('applicants')
      .select('*', { count: 'exact', head: true });

    if (filters?.status) {
      query = query.eq('current_status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('applicant_type', filters.type);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting applicants:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to count applicants:', error);
    return 0;
  }
}

/**
 * Busca applicants criados em um período
 */
export async function getApplicantsByDateRange(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting applicants by date range:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get applicants by date range:', error);
    return [];
  }
}

