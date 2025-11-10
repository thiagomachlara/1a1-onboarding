import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/companies/[id]/documents/upload
 * 
 * Upload de documentos de compliance para uma empresa
 * 
 * Aceita multipart/form-data com:
 * - file: arquivo PDF/imagem
 * - documentType: tipo do documento
 * - documentCategory: categoria
 * - description: descrição (opcional)
 * - issueDate: data de emissão (opcional)
 * - expiryDate: data de validade (opcional)
 * - documentNumber: número do documento (opcional)
 * - tags: tags separadas por vírgula (opcional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const documentCategory = formData.get('documentCategory') as string;
    const description = formData.get('description') as string | null;
    const issueDate = formData.get('issueDate') as string | null;
    const expiryDate = formData.get('expiryDate') as string | null;
    const documentNumber = formData.get('documentNumber') as string | null;
    const tagsString = formData.get('tags') as string | null;

    // Validações
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Arquivo é obrigatório' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento é obrigatório' },
        { status: 400 }
      );
    }

    if (!documentCategory) {
      return NextResponse.json(
        { success: false, error: 'Categoria é obrigatória' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de arquivo não suportado. Use PDF ou imagem.' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // Preparar nome do arquivo
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${companyId}/${documentType}_${timestamp}_${sanitizedFileName}`;

    // Upload para Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-docs')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Erro ao fazer upload do arquivo' },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('compliance-docs')
      .getPublicUrl(storagePath);

    // Processar tags
    const tags = tagsString
      ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];

    // Salvar metadados no banco de dados
    const { data: document, error: dbError } = await supabase
      .from('compliance_documents')
      .insert({
        company_id: companyId,
        document_type: documentType,
        category: documentCategory,
        file_name: sanitizedFileName,
        file_size: file.size,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
        mime_type: file.type,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notes: description || null,
        tags: tags.length > 0 ? tags : null,
        version: 1,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar metadados:', dbError);
      
      // Tentar deletar arquivo do storage se falhar ao salvar no banco
      await supabase.storage
        .from('compliance-docs')
        .remove([storagePath]);

      return NextResponse.json(
        { success: false, error: 'Erro ao salvar informações do documento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
