import { createClient } from '@/lib/supabase/server';

export interface Permission {
  resource: string;
  action: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

/**
 * Busca o usuário admin atual da sessão
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient();
  
  // Buscar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  // Buscar dados do admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, email, full_name, role, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .single();
  
  return adminUser;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function checkPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const supabase = createClient();
  
  // Buscar role do usuário
  const { data: user } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('id', userId)
    .single();
  
  if (!user || !user.is_active) {
    return false;
  }
  
  // Super admin tem todas as permissões
  if (user.role === 'super_admin') {
    return true;
  }
  
  // Buscar permissões do role
  const { data: rolePermissions } = await supabase
    .from('admin_permissions')
    .select('permissions')
    .eq('role', user.role)
    .single();
  
  if (!rolePermissions) {
    return false;
  }
  
  // Verificar permissão específica
  const perms = rolePermissions.permissions as Record<string, any>;
  const [resource, action] = permission.resource.split('.');
  
  return perms[resource]?.[action] === true;
}

/**
 * Middleware para verificar permissão antes de executar ação
 */
export async function requirePermission(
  permission: Permission
): Promise<AdminUser> {
  const adminUser = await getCurrentAdminUser();
  
  if (!adminUser) {
    throw new Error('Não autenticado');
  }
  
  const hasPermission = await checkPermission(adminUser.id, permission);
  
  if (!hasPermission) {
    throw new Error('Permissão negada');
  }
  
  return adminUser;
}

/**
 * Verifica se o usuário tem acesso a um recurso específico
 */
export async function canAccessResource(
  resource: string,
  action: string
): Promise<boolean> {
  const adminUser = await getCurrentAdminUser();
  
  if (!adminUser) {
    return false;
  }
  
  return checkPermission(adminUser.id, { resource, action });
}
