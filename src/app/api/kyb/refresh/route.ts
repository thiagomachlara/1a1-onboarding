import { NextRequest, NextResponse } from 'next/server';
import { getApplicantByApplicantId } from '@/lib/supabase-db';
import { resetQuestionnaireForRefresh } from '@/lib/sumsub-api';
import { generateRefreshToken } from '@/lib/jwt-utils';
import { sendWebhookNotification } from '@/lib/webhook-sender';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/kyb/refresh
 * 
 * Reseta o questionnaire de uma empresa para refresh de dados financeiros
 * Gera link com token e envia notificação via webhook
 * 
 * Body: { applicantId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicantId } = body;

    if (!applicantId) {
      return NextResponse.json(
        { success: false, error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }

    console.log('[Refresh] Iniciando refresh para applicant:', applicantId);

    // 1. Buscar dados do applicant no banco
    const applicant = await getApplicantByApplicantId(applicantId);

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Applicant não encontrado' },
        { status: 404 }
      );
    }

    console.log('[Refresh] Applicant encontrado:', {
      companyName: applicant.company_name,
      externalUserId: applicant.external_user_id,
    });

    // 2. Gerar token JWT (válido por 7 dias)
    const token = generateRefreshToken({
      applicantId: applicant.applicant_id,
      externalUserId: applicant.external_user_id,
      companyName: applicant.company_name,
      document: applicant.document,
    });

    // 3. Criar link completo
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
    const refreshLink = `${baseUrl}/refresh?token=${token}`;

    // 4. Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('[Refresh] Link gerado:', refreshLink);

    // 5. Resetar questionário no Sumsub
    try {
      await resetQuestionnaireForRefresh(
        applicant.applicant_id,
        'kyb-onboarding-completo'
      );
      console.log('[Refresh] Questionário resetado no Sumsub');
    } catch (error) {
      console.error('[Refresh] Erro ao resetar questionário:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao resetar questionário no Sumsub' },
        { status: 500 }
      );
    }

    // 6. Calcular dias desde aprovação
    const daysSinceApproval = applicant.approved_at 
      ? Math.floor((Date.now() - new Date(applicant.approved_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 7. Enviar notificação pro webhook Lovable
    const webhookPayload = {
      event: 'kyc_refresh_requested',
      timestamp: new Date().toISOString(),
      applicant: {
        id: applicant.applicant_id,
        externalUserId: applicant.external_user_id,
        companyName: applicant.company_name,
        document: applicant.document,
        email: applicant.email,
      },
      refresh: {
        link: refreshLink,
        expiresAt: expiresAt.toISOString(),
        requestedBy: 'compliance',
        daysSinceApproval,
      },
      message: `🔄 Atualização de KYC solicitada para ${applicant.company_name}`,
    };

    try {
      await sendWebhookNotification(webhookPayload);
      console.log('[Refresh] Webhook enviado com sucesso');
    } catch (error) {
      console.error('[Refresh] Erro ao enviar webhook:', error);
      // Não falha a requisição se webhook falhar
    }

    // 8. Atualizar banco de dados
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('applicants')
      .update({
        refresh_requested_at: new Date().toISOString(),
        refresh_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('applicant_id', applicantId);

    if (updateError) {
      console.error('[Refresh] Erro ao atualizar banco:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Refresh solicitado com sucesso',
      link: refreshLink,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error: any) {
    console.error('[Refresh] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
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
      .eq('applicant_type', 'company')
      .eq('current_status', 'approved')
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
