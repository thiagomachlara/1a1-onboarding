import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { id: companyId } = await params;

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
