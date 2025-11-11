import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

/**
 * Gera assinatura HMAC SHA256 para autenticação na API Sumsub
 */
function generateSignature(method: string, path: string, timestamp: number): string {
  const data = timestamp + method.toUpperCase() + path;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Faz requisição autenticada para a API Sumsub
 */
async function sumsubRequest(method: string, path: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(method, path, timestamp);

  const headers: Record<string, string> = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * GET /api/companies/[id]/dossier
 * 
 * Retorna dossiê completo de uma empresa com todos os dados
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar empresa no banco com todos os dados
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select(`
        id, external_user_id, applicant_id, inspection_id, applicant_type,
        current_status, review_answer, document_number, full_name, email, phone,
        created_at, updated_at, first_verification_at, last_verification_at,
        approved_at, rejected_at, sumsub_level_name, sumsub_review_result,
        rejection_reason, company_name, contract_token, contract_token_expires_at,
        contract_signed_at, contract_ip, contract_user_agent, contract_pdf_url,
        wallet_token, wallet_token_expires_at, wallet_pdf_url, refresh_requested_at,
        refresh_status, ubo_name, risk_score, risk_level, risk_factors,
        manual_risk_override, officer_notes, wallet_address, whitelist_status,
        whitelist_pdf_url, last_sync_date, address, city, state, postal_code, country,
        enriched_street, enriched_number, enriched_complement, enriched_neighborhood,
        enriched_city, enriched_state, enriched_postal_code, enriched_source, enriched_at
      `)
      .eq('id', id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Buscar UBOs
    const { data: ubos } = await supabase
      .from('beneficial_owners')
      .select('*')
      .eq('company_id', id);

    // Buscar documentos salvos
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', id);

    // Buscar análises de risco
    const { data: riskAssessments } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Buscar notas
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    // Buscar logs de auditoria
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Buscar dados de wallet
    const { data: businessData, error: businessDataError } = await supabase
      .from('business_data')
      .select('wallet_address, wallet_verified, wallet_term_pdf_path, wallet_registered_at, wallet_ip')
      .eq('applicant_id', id)
      .single();

    console.log('[DOSSIER] Business data query:', { id, businessData, businessDataError });

    // Buscar último PDF de screening
    const { data: screeningPdf } = await supabase
      .from('verification_history')
      .select('metadata')
      .eq('applicant_id', id)
      .eq('event_type', 'screening_pdf_generated')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const screeningPdfUrl = screeningPdf?.metadata?.pdfUrl || null;

    // Buscar dados completos do Sumsub (se disponível)
    let sumsubData = null;
    if (company.applicant_id) {
      try {
        const path = `/resources/applicants/${company.applicant_id}/one`;
        sumsubData = await sumsubRequest('GET', path);
      } catch (error) {
        console.error('[DOSSIER] Erro ao buscar dados do Sumsub:', error);
      }
    }

    // Montar dossiê completo
    const dossier = {
      // Dados Cadastrais
      company: {
        id: company.id,
        applicant_id: company.applicant_id,
        company_name: company.company_name,
        document_number: company.document_number,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        postal_code: company.postal_code,
        country: company.country,
        current_status: company.current_status,
        applicant_type: company.applicant_type,
        created_at: company.created_at,
        updated_at: company.updated_at,
        last_sync_date: company.last_sync_date,
        // Endereço Enriquecido
        enriched_street: company.enriched_street,
        enriched_number: company.enriched_number,
        enriched_complement: company.enriched_complement,
        enriched_neighborhood: company.enriched_neighborhood,
        enriched_city: company.enriched_city,
        enriched_state: company.enriched_state,
        enriched_postal_code: company.enriched_postal_code,
        enriched_source: company.enriched_source,
        enriched_at: company.enriched_at,
        // Contrato
        contract_signed_at: company.contract_signed_at,
        contract_pdf_url: company.contract_pdf_url,
      },

      // UBOs (Sócios)
      ubos: ubos || [],

      // Documentos
      documents: documents || [],

      // Análise de Risco
      risk_assessment: riskAssessments?.[0] || {
        risk_score: company.risk_score || 0,
        risk_level: company.risk_level || 'low',
        risk_factors: company.risk_factors || [],
        manual_risk_override: company.manual_risk_override || false,
        officer_notes: company.officer_notes,
      },

      // Blockchain
      blockchain: {
        wallet_address: businessData?.wallet_address || null,
        wallet_term_pdf_path: businessData?.wallet_term_pdf_path || null,
        wallet_registered_at: businessData?.wallet_registered_at || null,
        wallet_ip: businessData?.wallet_ip || null,
        whitelist_status: 'pending', // TODO: Implementar lógica de whitelist_status
        whitelist_pdf_url: screeningPdfUrl,
      },

      // Notas do Compliance
      notes: notes || [],

      // Histórico de Auditoria
      audit_logs: auditLogs || [],

      // Dados raw do Sumsub (para referência)
      sumsub_data: sumsubData,
    };

    return NextResponse.json({
      success: true,
      dossier,
    });

  } catch (error: any) {
    console.error('[DOSSIER] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dossiê', details: error.message },
      { status: 500 }
    );
  }
}
