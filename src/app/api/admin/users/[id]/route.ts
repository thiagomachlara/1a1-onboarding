import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/admin-permissions';
import { logAdminAction, extractRequestInfo } from '@/lib/admin-audit';

/**
 * PATCH /api/admin/users/[id]
 * Atualiza dados de um usuário admin
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão
    const currentUser = await requirePermission({ resource: 'users', action: 'edit' });
    
    const { full_name, role, is_active } = await request.json();
    
    const supabase = createClient();
    
    // Buscar usuário atual
    const { data: oldUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !oldUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Não permitir que o usuário desative a si mesmo
    if (params.id === currentUser.id && is_active === false) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      );
    }
    
    // Preparar dados de atualização
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    // Registrar auditoria
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAdminAction({
      adminUserId: currentUser.id,
      action: 'update',
      resourceType: 'user',
      resourceId: params.id,
      oldValue: {
        full_name: oldUser.full_name,
        role: oldUser.role,
        is_active: oldUser.is_active,
      },
      newValue: {
        full_name: updatedUser.full_name,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
      },
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar usuário' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Desativa um usuário admin
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão
    const currentUser = await requirePermission({ resource: 'users', action: 'delete' });
    
    // Não permitir que o usuário delete a si mesmo
    if (params.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Você não pode deletar sua própria conta' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Buscar usuário
    const { data: user, error: fetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Desativar usuário (soft delete)
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('id', params.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Registrar auditoria
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAdminAction({
      adminUserId: currentUser.id,
      action: 'deactivate',
      resourceType: 'user',
      resourceId: params.id,
      oldValue: { is_active: true },
      newValue: { is_active: false },
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Usuário desativado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar usuário' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}
