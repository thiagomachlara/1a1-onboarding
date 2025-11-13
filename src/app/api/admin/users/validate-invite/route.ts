import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrador',
  compliance_officer: 'Compliance Officer',
  analyst: 'Analista',
  read_only: 'Somente Leitura',
};

/**
 * GET /api/admin/users/validate-invite
 * Valida token de convite
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
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

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      role_label: ROLE_LABELS[invite.role] || invite.role,
      expires_at: invite.expires_at,
    });
  } catch (error: any) {
    console.error('Erro ao validar convite:', error);
    return NextResponse.json(
      { error: 'Erro ao validar convite' },
      { status: 500 }
    );
  }
}
