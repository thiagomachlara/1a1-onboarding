import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/companies/[id]/contract/download
 * 
 * Baixa o PDF do contrato assinado de uma empresa
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar empresa
    const { data: company, error } = await supabase
      .from('applicants')
      .select('contract_pdf_path, company_name, external_user_id')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    if (!company.contract_pdf_path) {
      return NextResponse.json(
        { error: 'Contrato não encontrado' },
        { status: 404 }
      );
    }

    // Baixar PDF do Storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('contracts')
      .download(company.contract_pdf_path);

    if (downloadError || !pdfData) {
      console.error('[Contract Download] Error:', downloadError);
      return NextResponse.json(
        { error: 'Erro ao baixar contrato' },
        { status: 500 }
      );
    }

    // Gerar nome do arquivo
    const fileName = `contrato_${company.company_name || company.external_user_id}_${Date.now()}.pdf`;

    // Retornar PDF
    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[Contract Download] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro ao baixar contrato' },
      { status: 500 }
    );
  }
}
