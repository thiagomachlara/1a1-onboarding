import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/companies/[id]/compliance-documents
 * 
 * Lista todos os documentos de compliance de uma empresa
 * 
 * Query params:
 * - category: filtrar por categoria (opcional)
 * - type: filtrar por tipo (opcional)
 * - includeOldVersions: incluir versões antigas (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const includeOldVersions = searchParams.get('includeOldVersions') === 'true';

    // Construir query
    let query = supabase
      .from('compliance_documents')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    // Filtros opcionais
    if (category) {
      query = query.eq('document_category', category);
    }

    if (type) {
      query = query.eq('document_type', type);
    }

    if (!includeOldVersions) {
      query = query.eq('is_current_version', true);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Erro ao buscar documentos:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar documentos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0,
    });
  } catch (error: any) {
    console.error('Erro no endpoint de documentos:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/compliance-documents
 * 
 * Soft delete de um documento
 * 
 * Body: { documentId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o documento pertence à empresa
    const { data: document, error: fetchError } = await supabase
      .from('compliance_documents')
      .select('id, company_id')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    if (document.company_id !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Documento não pertence a esta empresa' },
        { status: 403 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('compliance_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (deleteError) {
      console.error('Erro ao deletar documento:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Erro ao deletar documento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento deletado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao deletar documento:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
