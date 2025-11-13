import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendWhatsAppNotification,
  type OnboardingNotification,
} from '@/lib/whatsapp-notifier';

/**
 * POST /api/admin/retry-failed-webhooks
 * 
 * Reenvia webhooks que falharam
 * 
 * Body:
 * {
 *   "since": "2025-11-13T00:00:00Z",  // Opcional: reenviar apenas após essa data
 *   "event": "applicant_reviewed",    // Opcional: filtrar por tipo de evento
 *   "limit": 10                        // Opcional: limite de webhooks a reenviar
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { since, event, limit = 50 } = await request.json();

    const supabase = await createClient();
    
    // Buscar webhooks falhados
    let query = supabase
      .from('webhook_logs')
      .select('id, payload, created_at')
      .eq('success', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (since) {
      query = query.gte('created_at', since);
    }

    if (event) {
      query = query.eq('event_type', event);
    }

    const { data: failedLogs, error } = await query;

    if (error) {
      throw error;
    }

    if (!failedLogs || failedLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed webhooks to retry',
        results: {
          total: 0,
          success: 0,
          failed: 0,
        },
      });
    }

    // Reenviar cada webhook
    const results = {
      total: failedLogs.length,
      success: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const log of failedLogs) {
      try {
        const notification = log.payload as OnboardingNotification;
        
        console.log(`[Retry] Resending webhook for ${notification.applicant.id}...`);
        
        const result = await sendWhatsAppNotification(notification);
        
        if (result.success) {
          results.success++;
          results.details.push({
            applicantId: notification.applicant.id,
            event: notification.event,
            status: 'success',
          });
        } else {
          results.failed++;
          results.details.push({
            applicantId: notification.applicant.id,
            event: notification.event,
            status: 'failed',
            error: result.error,
          });
        }

        // Aguardar 500ms entre cada envio para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        results.details.push({
          logId: log.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Retried ${results.total} webhooks`,
      results,
    });
  } catch (error) {
    console.error('[Retry Failed Webhooks] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
