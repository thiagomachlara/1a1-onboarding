import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-permissions';
import { getAuditLogs } from '@/lib/admin-audit';

/**
 * GET /api/admin/audit-logs
 * Lista logs de auditoria com filtros
 */
export async function GET(request: Request) {
  try {
    // Verificar permissão
    const currentUser = await requirePermission({ resource: 'audit_logs', action: 'view_all' });
    
    const { searchParams } = new URL(request.url);
    
    const params = {
      adminUserId: searchParams.get('admin_user_id') || undefined,
      resourceType: searchParams.get('resource_type') || undefined,
      action: searchParams.get('action') || undefined,
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };
    
    const logs = await getAuditLogs(params);
    
    return NextResponse.json({
      logs,
      pagination: {
        limit: params.limit,
        offset: params.offset,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar logs:', error);
    
    // Se não tem permissão para view_all, tentar view_own
    if (error.message === 'Permissão negada') {
      try {
        const currentUser = await requirePermission({ resource: 'audit_logs', action: 'view_own' });
        
        const { searchParams } = new URL(request.url);
        
        const params = {
          adminUserId: currentUser.id, // Forçar apenas logs do próprio usuário
          resourceType: searchParams.get('resource_type') || undefined,
          action: searchParams.get('action') || undefined,
          startDate: searchParams.get('start_date') || undefined,
          endDate: searchParams.get('end_date') || undefined,
          limit: parseInt(searchParams.get('limit') || '50'),
          offset: parseInt(searchParams.get('offset') || '0'),
        };
        
        const logs = await getAuditLogs(params);
        
        return NextResponse.json({
          logs,
          pagination: {
            limit: params.limit,
            offset: params.offset,
          },
        });
      } catch (innerError: any) {
        return NextResponse.json(
          { error: innerError.message || 'Erro ao buscar logs' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar logs' },
      { status: 500 }
    );
  }
}
