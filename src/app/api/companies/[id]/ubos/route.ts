import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/companies/[id]/ubos
 * 
 * Lista todos os UBOs (Ultimate Beneficial Owners) de uma empresa
 * 
 * ⚡ OTIMIZAÇÃO: Busca dados do Supabase (não do Sumsub)
 * - Dados já sincronizados via webhook
 * - Tempo de resposta: <100ms (vs 5-10s do Sumsub)
 * - Não bloqueia renderização da UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: companyId } = await params;

    console.log('[UBOS] Buscando UBOs da empresa:', companyId);

    // Buscar UBOs do Supabase (não do Sumsub)
    const { data: ubos, error } = await supabase
      .from('beneficial_owners')
      .select('id, first_name, middle_name, last_name, tin, dob, mother_name, father_name, relation, share_size, email, phone, types, verification_status')
      .eq('company_id', companyId)
      .order('share_size', { ascending: false });

    if (error) {
      console.error('[UBOS] Erro ao buscar UBOs:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`[UBOS] Encontrados ${ubos?.length || 0} UBOs`);

    return NextResponse.json({
      success: true,
      ubos: (ubos || []).map(ubo => ({
        id: ubo.id,
        name: `${ubo.first_name} ${ubo.middle_name || ''} ${ubo.last_name}`.trim().replace(/\s+/g, ' '),
        firstName: ubo.first_name,
        middleName: ubo.middle_name,
        lastName: ubo.last_name,
        cpf: ubo.tin,
        dob: ubo.dob ? new Date(ubo.dob).toLocaleDateString('pt-BR') : undefined,
        motherName: ubo.mother_name,
        fatherName: ubo.father_name,
        role: ubo.relation || 'Sócio',
        shareSize: ubo.share_size || 0,
        email: ubo.email,
        phone: ubo.phone,
        types: ubo.types || [],
        verificationStatus: ubo.verification_status || 'pending',
      })),
    });

  } catch (error: any) {
    console.error('[UBOS] Erro no endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
