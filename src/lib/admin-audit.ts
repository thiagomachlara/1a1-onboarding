import { createClient } from '@/lib/supabase/server';

export interface AuditLogParams {
  adminUserId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'activate' | 'deactivate';
  resourceType: 'company' | 'note' | 'wallet' | 'user' | 'template' | 'invite';
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra uma ação no log de auditoria
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  const {
    adminUserId,
    action,
    resourceType,
    resourceId,
    oldValue,
    newValue,
    ipAddress,
    userAgent,
  } = params;
  
  const supabase = await createClient();
  
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
    // Não lançar erro para não interromper a operação principal
  }
}

/**
 * Extrai IP e User-Agent de uma Request
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs(params: {
  adminUserId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin_users!admin_audit_log_admin_user_id_fkey (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false });
  
  if (params.adminUserId) {
    query = query.eq('admin_user_id', params.adminUserId);
  }
  
  if (params.resourceType) {
    query = query.eq('resource_type', params.resourceType);
  }
  
  if (params.action) {
    query = query.eq('action', params.action);
  }
  
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  
  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }
  
  if (params.limit) {
    query = query.limit(params.limit);
  }
  
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Erro ao buscar logs: ${error.message}`);
  }
  
  return data;
}
