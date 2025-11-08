import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/companies/[id]/wallet-term/download
 * 
 * Baixa o PDF do termo de aceite de wallet de uma empresa
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar empresa
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('company_name, external_user_id')
      .eq('id', id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Buscar business_data para pegar o caminho do PDF
    const { data: businessData, error: businessError } = await supabase
      .from('business_data')
      .select('wallet_term_pdf_path')
      .eq('applicant_id', id)
      .single();

    if (businessError || !businessData) {
      return NextResponse.json(
        { error: 'Dados da empresa não encontrados' },
        { status: 404 }
      );
    }

    if (!businessData.wallet_term_pdf_path) {
      return NextResponse.json(
        { error: 'Termo de wallet não encontrado' },
        { status: 404 }
      );
    }

    // Baixar PDF do Storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('wallet-terms')
      .download(businessData.wallet_term_pdf_path);

    if (downloadError || !pdfData) {
      console.error('[Wallet Term Download] Error:', downloadError);
      return NextResponse.json(
        { error: 'Erro ao baixar termo de wallet' },
        { status: 500 }
      );
    }

    // Gerar nome do arquivo
    const fileName = `termo_wallet_${company.company_name || company.external_user_id}_${Date.now()}.pdf`;

    // Retornar PDF
    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[Wallet Term Download] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro ao baixar termo de wallet' },
      { status: 500 }
    );
  }
}
