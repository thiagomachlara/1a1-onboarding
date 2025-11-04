import { NextRequest, NextResponse } from 'next/server';
import { resetQuestionnaireForRefresh } from '@/lib/sumsub-api';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/kyb/refresh
 * 
 * Reseta o questionnaire de uma empresa para refresh de dados financeiros
 * 
 * Body: { applicantId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { applicantId } = await request.json();
    
    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log(`[KYB Refresh] Iniciando refresh para applicant: ${applicantId}`);
    
    // 1. Resetar questionnaire no Sumsub
    const result = await resetQuestionnaireForRefresh(applicantId);
    
    // 2. Atualizar status no Supabase
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('applicants')
      .update({
        refresh_requested_at: new Date().toISOString(),
        refresh_status: 'pending'
      })
      .eq('sumsub_applicant_id', applicantId);
    
    if (updateError) {
      console.error('[KYB Refresh] Erro ao atualizar Supabase:', updateError);
      // Não falhar a request se Supabase der erro
    }
    
    console.log('[KYB Refresh] Refresh solicitado com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Refresh solicitado com sucesso. A empresa receberá notificação para atualizar os dados.',
      data: result
    });
    
  } catch (error: any) {
    console.error('[KYB Refresh] Erro:', error);
    return NextResponse.json(
      { 
        error: 'Falha ao solicitar refresh',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kyb/refresh
 * 
 * Lista empresas que precisam de refresh (>180 dias desde aprovação)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Buscar empresas aprovadas há mais de 180 dias
    const { data: applicants, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('verification_type', 'company')
      .eq('review_status', 'approved')
      .order('approved_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Filtrar empresas que precisam de refresh
    const now = new Date();
    const applicantsNeedingRefresh = applicants?.filter(app => {
      if (!app.approved_at) return false;
      
      const approvedDate = new Date(app.approved_at);
      const daysSinceApproval = Math.floor(
        (now.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Precisa de refresh se:
      // 1. Passou 180 dias desde aprovação
      // 2. E (nunca foi feito refresh OU último refresh foi há mais de 180 dias)
      const needsRefresh = daysSinceApproval >= 180;
      
      if (app.refresh_requested_at) {
        const lastRefreshDate = new Date(app.refresh_requested_at);
        const daysSinceLastRefresh = Math.floor(
          (now.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastRefresh >= 180;
      }
      
      return needsRefresh;
    }) || [];
    
    // Adicionar campo de dias desde aprovação
    const enrichedApplicants = applicantsNeedingRefresh.map(app => {
      const approvedDate = new Date(app.approved_at);
      const daysSinceApproval = Math.floor(
        (now.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        ...app,
        days_since_approval: daysSinceApproval
      };
    });
    
    return NextResponse.json({
      success: true,
      count: enrichedApplicants.length,
      applicants: enrichedApplicants
    });
    
  } catch (error: any) {
    console.error('[KYB Refresh] Erro ao buscar applicants:', error);
    return NextResponse.json(
      { 
        error: 'Falha ao buscar empresas',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

