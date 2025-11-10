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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: companyId } = await params;
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
                // A busca automática da CNDT foi desativada devido à necessidade de resolver um reCAPTCHA.
        // O sistema agora redireciona o usuário para o site do TST para emissão manual.
        result = {
          success: true,
          status: 'pending',
          certificateType: certificateType.toUpperCase(),
          queryData: {
            manualUrl: `https://www.tst.jus.br/certidao`,
            note: 'A emissão deste certificado requer interação manual no site do órgão emissor.',
          },
        };
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

    // Verificar se já existe um certificado deste tipo para esta empresa
    const { data: existingCert } = await supabase
      .from('compliance_certificates')
      .select('id')
      .eq('company_id', companyId)
      .eq('certificate_type', certificateType)
      .single();

    let certificate;
    let dbError;

    if (existingCert) {
      // Atualizar certificado existente
      const { data, error } = await supabase
        .from('compliance_certificates')
        .update({
          status: result.status,
          issue_date: result.issueDate,
          expiry_date: result.expiryDate,
          certificate_number: result.certificateNumber,
          protocol_number: result.protocolNumber,
          pdf_url: pdfUrl,
          pdf_storage_path: pdfStoragePath,
          query_data: result.queryData,
          error_message: result.errorMessage,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', existingCert.id)
        .select()
        .single();
      
      certificate = data;
      dbError = error;
    } else {
      // Criar novo certificado
      const { data, error } = await supabase
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
      
      certificate = data;
      dbError = error;
    }

    if (dbError) {
      console.error('Erro ao salvar certificado:', dbError);
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
