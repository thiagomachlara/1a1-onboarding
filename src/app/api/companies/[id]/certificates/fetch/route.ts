import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchCNDFederal, fetchCNDT } from '@/lib/government-certificates';

/**
 * POST /api/companies/[id]/certificates/fetch
 * 
 * Busca um certificado específico nas APIs governamentais e salva no banco
 * 
 * Body: { certificateType: 'CND_FEDERAL' | 'CNDT' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const companyId = params.id;
    const body = await request.json();
    const { certificateType } = body;

    if (!certificateType) {
      return NextResponse.json(
        { success: false, error: 'certificateType é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('document_number')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const cnpj = company.document_number;

    // Buscar certificado na API governamental apropriada
    let result;
    switch (certificateType) {
      case 'CND_FEDERAL':
        result = await fetchCNDFederal(cnpj);
        break;
      case 'CNDT':
        result = await fetchCNDT(cnpj);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de certificado não suportado' },
          { status: 400 }
        );
    }

    // Se houver PDF em base64, fazer upload para Supabase Storage
    let pdfUrl = null;
    let pdfStoragePath = null;

    if (result.queryData?.pdfBase64) {
      const pdfBuffer = Buffer.from(result.queryData.pdfBase64, 'base64');
      const fileName = `${cnpj}_${certificateType}_${Date.now()}.pdf`;
      const storagePath = `${companyId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compliance-docs')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (!uploadError && uploadData) {
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('compliance-docs')
          .getPublicUrl(storagePath);

        pdfUrl = urlData.publicUrl;
        pdfStoragePath = storagePath;
      }

      // Remover base64 do queryData antes de salvar (muito grande)
      delete result.queryData.pdfBase64;
    }

    // Salvar certificado no banco de dados
    const { data: certificate, error: insertError } = await supabase
      .from('compliance_certificates')
      .insert({
        company_id: companyId,
        certificate_type: certificateType,
        status: result.status,
        issue_date: result.issueDate,
        expiry_date: result.expiryDate,
        certificate_number: result.certificateNumber,
        protocol_number: result.protocolNumber,
        pdf_url: pdfUrl,
        pdf_storage_path: pdfStoragePath,
        query_data: result.queryData,
        error_message: result.errorMessage,
        fetched_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar certificado:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar certificado no banco de dados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate,
      result,
    });
  } catch (error: any) {
    console.error('Erro ao buscar certificado:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
