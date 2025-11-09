import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/invites/accept
 * Aceita um convite e ativa o usuário
 */
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .select('*')
      .eq('token', token)
      .single();
    
    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se convite já foi aceito
    if (invite.accepted_at) {
      return NextResponse.json(
        { error: 'Convite já foi aceito' },
        { status: 400 }
      );
    }
    
    // Verificar se convite expirou
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Convite expirado' },
        { status: 400 }
      );
    }
    
    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password,
    });
    
    if (authError) {
      return NextResponse.json(
        { error: `Erro ao criar conta: ${authError.message}` },
        { status: 400 }
      );
    }
    
    // Ativar usuário em admin_users
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ is_active: true })
      .eq('email', invite.email);
    
    if (updateError) {
      throw updateError;
    }
    
    // Marcar convite como aceito
    await supabase
      .from('admin_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
    
    return NextResponse.json({
      success: true,
      message: 'Convite aceito com sucesso',
      user: {
        email: invite.email,
        role: invite.role,
      },
    });
  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aceitar convite' },
      { status: 500 }
    );
  }
}
