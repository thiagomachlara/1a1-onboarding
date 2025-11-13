import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendWhatsAppNotification,
  createApplicantReviewedNotification,
  type OnboardingNotification,
} from '@/lib/whatsapp-notifier';
import { generateContractToken, generateContractLink } from '@/lib/magic-links';

/**
 * POST /api/admin/resend-notification
 * 
 * Reenvia notificação de WhatsApp para um applicant específico
 * 
 * Body:
 * {
 *   "applicantId": "uuid",
 *   "event": "applicant_reviewed"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { applicantId, event } = await request.json();

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId is required' },
        { status: 400 }
      );
    }

    // Buscar dados do applicant
    const supabase = await createClient();
    const { data: applicant, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicantId)
      .single();

    if (error || !applicant) {
      return NextResponse.json(
        { error: 'Applicant not found' },
        { status: 404 }
      );
    }

    let notification: OnboardingNotification;

    // Criar notificação baseada no evento
    switch (event) {
      case 'applicant_reviewed': {
        // Gerar magic link se aprovado
        let contractLink: string | undefined;
        if (applicant.review_answer === 'GREEN') {
          const token = await generateContractToken(applicant.id);
          contractLink = generateContractLink(token);
        }

        notification = createApplicantReviewedNotification({
          externalUserId: applicant.external_user_id,
          verificationType: applicant.applicant_type,
          name: applicant.applicant_type === 'company' 
            ? applicant.company_name 
            : applicant.full_name,
          email: applicant.email,
          document: applicant.document_number,
          reviewAnswer: applicant.review_answer as 'GREEN' | 'RED' | 'YELLOW',
          rejectionReason: applicant.rejection_reason,
          contractLink,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Event type "${event}" not supported for resend` },
          { status: 400 }
        );
    }

    // Enviar notificação
    const result = await sendWhatsAppNotification(notification);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Notification resent successfully',
        applicant: {
          id: applicant.id,
          name: applicant.company_name || applicant.full_name,
          status: applicant.current_status,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Failed to resend notification',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Resend Notification] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
