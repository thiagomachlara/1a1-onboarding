import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/webhook-logs
 * 
 * Lista logs de webhooks com filtros
 * 
 * Query params:
 * - success: true/false (filtrar por sucesso/falha)
 * - event: tipo do evento
 * - limit: número de resultados (padrão: 50)
 * - since: timestamp ISO para filtrar logs após essa data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const successParam = searchParams.get('success');
    const event = searchParams.get('event');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since');

    const supabase = await createClient();
    
    let query = supabase
      .from('webhook_logs')
      .select(`
        id,
        event_type,
        response_status,
        error_message,
        retry_count,
        success,
        created_at,
        payload
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por sucesso/falha
    if (successParam !== null) {
      query = query.eq('success', successParam === 'true');
    }

    // Filtrar por tipo de evento
    if (event) {
      query = query.eq('event_type', event);
    }

    // Filtrar por data
    if (since) {
      query = query.gte('created_at', since);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Agrupar estatísticas
    const stats = {
      total: logs?.length || 0,
      success: logs?.filter(l => l.success).length || 0,
      failed: logs?.filter(l => !l.success).length || 0,
      by_event: {} as Record<string, { total: number; success: number; failed: number }>,
    };

    logs?.forEach(log => {
      if (!stats.by_event[log.event_type]) {
        stats.by_event[log.event_type] = { total: 0, success: 0, failed: 0 };
      }
      stats.by_event[log.event_type].total++;
      if (log.success) {
        stats.by_event[log.event_type].success++;
      } else {
        stats.by_event[log.event_type].failed++;
      }
    });

    return NextResponse.json({
      success: true,
      stats,
      logs: logs || [],
    });
  } catch (error) {
    console.error('[Webhook Logs] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
