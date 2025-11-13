import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/admin-permissions';
import { logAdminAction, extractRequestInfo } from '@/lib/admin-audit';
import crypto from 'crypto';

/**
 * POST /api/admin/users/invite
 * Convida um novo usuário admin
 */
export async function POST(request: Request) {
  try {
    // Verificar permissão - apenas super_admin pode criar usuários
    const currentUser = await requirePermission({ resource: 'users', action: 'create' });
    
    if (currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Apenas Super Admin pode convidar novos usuários' },
        { status: 403 }
      );
    }
    
    const { email, full_name, role } = await request.json();
    
    // Validar dados
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email e role são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar role
    const validRoles = ['super_admin', 'compliance_officer', 'analyst', 'read_only'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe' },
        { status: 400 }
      );
    }
    
    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    // Criar convite
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .insert({
        email,
        role,
        invited_by: currentUser.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    
    if (inviteError) {
      throw inviteError;
    }
    
    // Criar usuário em admin_users (inativo até aceitar convite)
    const { data: newUser, error: userError } = await supabase
      .from('admin_users')
      .insert({
        email,
        full_name,
        role,
        is_active: false,
        created_by: currentUser.id,
      })
      .select()
      .single();
    
    if (userError) {
      throw userError;
    }
    
    // Registrar auditoria
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAdminAction({
      adminUserId: currentUser.id,
      action: 'create',
      resourceType: 'invite',
      resourceId: invite.id,
      newValue: { email, role },
      ipAddress,
      userAgent,
    });
    
    // TODO: Enviar email de convite
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/accept-invite?token=${token}`;
    
    console.log('🔗 Link de convite:', inviteLink);
    console.log('📧 Email:', email);
    console.log('👤 Role:', role);
    
    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email,
        role,
        expires_at: expiresAt,
        invite_link: inviteLink,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar convite:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar convite' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}
