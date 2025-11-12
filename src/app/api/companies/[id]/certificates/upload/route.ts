import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const certificateType = formData.get('certificate_type') as string;

    if (!file || !certificateType) {
      return NextResponse.json(
        { success: false, error: 'Arquivo e tipo de certidão são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos PDF são permitidos' },
        { status: 400 }
      );
    }

    // Buscar empresa para pegar CNPJ
    const { data: company, error: companyError } = await supabase
      .from('companies')
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

    // Upload do arquivo para Supabase Storage
    const fileName = `${certificateType}_${cnpj}_${Date.now()}.pdf`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-certificates')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('[UPLOAD] Erro ao fazer upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Erro ao fazer upload do arquivo' },
        { status: 500 }
      );
    }

    // Verificar se já existe certidão deste tipo
    const { data: existingCert } = await supabase
      .from('compliance_certificates')
      .select('id')
      .eq('company_id', companyId)
      .eq('certificate_type', certificateType)
      .single();

    if (existingCert) {
      // Atualizar certidão existente
      const { data: certificate, error: updateError } = await supabase
        .from('compliance_certificates')
        .update({
          pdf_storage_path: uploadData.path,
          status: 'obtida',
          issue_date: new Date().toISOString(),
          fetched_at: new Date().toISOString(),
        })
        .eq('id', existingCert.id)
        .select()
        .single();

      if (updateError) {
        console.error('[UPLOAD] Erro ao atualizar certidão:', updateError);
        return NextResponse.json(
          { success: false, error: 'Erro ao atualizar certidão' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        certificate,
        message: 'Certidão atualizada com sucesso',
      });
    } else {
      // Criar nova certidão
      const { data: certificate, error: insertError } = await supabase
        .from('compliance_certificates')
        .insert({
          company_id: companyId,
          certificate_type: certificateType,
          status: 'obtida',
          issue_date: new Date().toISOString(),
          pdf_storage_path: uploadData.path,
          fetched_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('[UPLOAD] Erro ao criar certidão:', insertError);
        return NextResponse.json(
          { success: false, error: 'Erro ao salvar certidão' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        certificate,
        message: 'Certidão enviada com sucesso',
      });
    }
  } catch (error: any) {
    console.error('[UPLOAD] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
