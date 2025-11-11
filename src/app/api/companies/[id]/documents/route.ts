import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/companies/[id]/documents
 * 
 * Lista todos os documentos de uma empresa
 * 
 * ⚡ OTIMIZAÇÃO: Busca documentos do Supabase (não do Sumsub)
 * - Documentos já foram baixados e armazenados no webhook
 * - Tempo de resposta: <1s (vs 5-10s do Sumsub)
 * - Não bloqueia renderização da UI
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[DOCUMENTS] Buscando documentos da empresa:', id);

    // Buscar empresa no banco
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name')
      .eq('id', id)
      .single();

    if (companyError || !company) {
      console.error('[DOCUMENTS] Empresa não encontrada:', companyError);
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Buscar documentos do Supabase (não do Sumsub)
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('[DOCUMENTS] Erro ao buscar documentos:', docsError);
      return NextResponse.json(
        { error: 'Erro ao buscar documentos', details: docsError.message },
        { status: 500 }
      );
    }

    console.log(`[DOCUMENTS] Encontrados ${documents?.length || 0} documentos`);

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        applicant_id: company.applicant_id,
        name: company.company_name,
      },
      documents: documents || [],
      total: documents?.length || 0,
    });

  } catch (error: any) {
    console.error('[DOCUMENTS] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/documents
 * 
 * Sincroniza documentos do Sumsub manualmente
 * 
 * Usado quando o usuário clica em "Sincronizar Documentos"
 * para re-baixar documentos do Sumsub e atualizar o armazenamento local
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[DOCUMENTS] Sincronizando documentos da empresa:', id);

    // Buscar empresa
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('applicant_id')
      .eq('id', id)
      .single();

    if (companyError || !company || !company.applicant_id) {
      return NextResponse.json(
        { error: 'Empresa não encontrada ou sem applicant_id' },
        { status: 404 }
      );
    }

    // Importar funções de download
    const { listDocuments, downloadDocument } = await import('@/lib/document-downloader');
    
    // Listar documentos do Sumsub
    const documents = await listDocuments(company.applicant_id);
    console.log(`[DOCUMENTS] Encontrados ${documents.length} documentos no Sumsub`);
    
    // Baixar e armazenar cada documento
    let successCount = 0;
    for (const doc of documents) {
      try {
        // Baixar arquivo
        const buffer = await downloadDocument(doc.image_id, doc.inspection_id);
        
        // Determinar extensão
        const fileExtension = 'pdf'; // Assumir PDF por padrão
        const fileName = `${doc.image_id}.${fileExtension}`;
        const filePath = `company-documents/${id}/${fileName}`;
        
        // Upload para Storage
        const { error: uploadError } = await supabase.storage
          .from('compliance-docs')
          .upload(filePath, buffer, {
            contentType: 'application/pdf',
            upsert: true,
          });
        
        if (uploadError) {
          console.error('[DOCUMENTS] Erro ao fazer upload:', uploadError);
          continue;
        }
        
        // Gerar URL pública
        const { data: urlData } = supabase.storage
          .from('compliance-docs')
          .getPublicUrl(filePath);
        
        // Salvar metadados
        await supabase
          .from('documents')
          .upsert({
            company_id: id,
            doc_type: doc.doc_set_type,
            image_id: doc.image_id,
            inspection_id: doc.inspection_id,
            file_name: fileName,
            file_type: fileExtension,
            status: doc.status || 'pending',
            review_answer: doc.review_answer,
            review_comment: doc.review_comment,
            download_url: urlData.publicUrl,
            uploaded_at: new Date().toISOString(),
          }, {
            onConflict: 'image_id',
          });
        
        successCount++;
        
        // Aguardar entre downloads
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`[DOCUMENTS] Erro ao processar ${doc.image_id}:`, error);
      }
    }

    console.log(`[DOCUMENTS] Sincronização concluída: ${successCount}/${documents.length}`);

    return NextResponse.json({
      success: true,
      message: 'Documentos sincronizados com sucesso',
      total: successCount,
    });

  } catch (error: any) {
    console.error('[DOCUMENTS] Erro na sincronização:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar documentos', details: error.message },
      { status: 500 }
    );
  }
}
