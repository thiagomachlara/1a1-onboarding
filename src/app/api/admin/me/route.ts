import { NextResponse } from 'next/server';
import { getCurrentAdminUser } from '@/lib/admin-permissions';

/**
 * GET /api/admin/me
 * Retorna dados do usuário admin atual
 */
export async function GET() {
  try {
    const adminUser = await getCurrentAdminUser();
    
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      user: adminUser,
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuário atual:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}
