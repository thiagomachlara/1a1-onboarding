import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/companies/[id]/certificates
 * 
 * Retorna todos os certificados de compliance de uma empresa
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: companyId } = await params;

    // Buscar tipos de certidões para PJ
    const { data: certificateTypes, error: typesError } = await supabase
      .from('compliance_certificate_types')
      .select('*')
      .eq('entity_type', 'PJ')
      .order('display_order');

    if (typesError) {
      console.error('Error fetching certificate types:', typesError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar tipos de certidões' },
        { status: 500 }
      );
    }

    // Buscar certificados da empresa
    const { data: certificates, error } = await supabase
      .from('compliance_certificates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar certificados:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar certificados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      certificateTypes: certificateTypes || [],
      certificates: certificates || [],
    });
  } catch (error: any) {
    console.error('Erro no endpoint de certificados:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
