import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/admin-permissions';

/**
 * GET /api/admin/users
 * Lista todos os usuários admin
 */
export async function GET(request: Request) {
  try {
    // Verificar permissão
    await requirePermission({ resource: 'users', action: 'view' });
    
    const supabase = createClient();
    
    // Buscar todos os usuários
    const { data: users, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        last_login_at,
        created_by
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar usuários' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}
