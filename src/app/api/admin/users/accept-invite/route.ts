import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/users/accept-invite
 * Aceita convite e cria conta no Supabase Auth
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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

    // Verificar se já foi usado
    if (invite.used_at) {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado' },
        { status: 400 }
      );
    }

    // Verificar se expirou
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      );
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        role: invite.role,
      },
    });

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return NextResponse.json(
        { error: 'Erro ao criar conta: ' + authError.message },
        { status: 500 }
      );
    }

    // Ativar usuário em admin_users
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ 
        is_active: true,
        last_login_at: new Date().toISOString(),
      })
      .eq('email', invite.email);

    if (updateError) {
      console.error('Erro ao ativar usuário:', updateError);
    }

    // Marcar convite como usado
    const { error: markUsedError } = await supabase
      .from('admin_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (markUsedError) {
      console.error('Erro ao marcar convite como usado:', markUsedError);
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar convite' },
      { status: 500 }
    );
  }
}
