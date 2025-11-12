import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/companies/[id]/documents
 * 
 * Lista todos os documentos de uma empresa (empresa + UBOs)
 * 
 * ⚡ OTIMIZAÇÃO: Busca documentos do Supabase (não do Sumsub)
 * - Documentos já foram baixados e armazenados durante sincronização
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

    // Buscar documentos da empresa e UBOs
    const { data: documents, error: docsError } = await supabase
      .from('sumsub_documents')
      .select(`
        *,
        beneficial_owners (
          id,
          first_name,
          middle_name,
          last_name
        )
      `)
      .eq('company_id', id)
      .is('deleted_at', null)
      .order('synced_at', { ascending: false });

    if (docsError) {
      console.error('[DOCUMENTS] Erro ao buscar documentos:', docsError);
      return NextResponse.json(
        { error: 'Erro ao buscar documentos', details: docsError.message },
        { status: 500 }
      );
    }

    // Separar documentos por fonte
    const companyDocs = documents?.filter(d => d.source === 'company') || [];
    const uboDocs = documents?.filter(d => d.source === 'ubo') || [];

    console.log(`[DOCUMENTS] Encontrados ${companyDocs.length} docs da empresa e ${uboDocs.length} docs de UBOs`);

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        applicant_id: company.applicant_id,
        name: company.company_name,
      },
      documents: {
        company: companyDocs,
        ubos: uboDocs,
        all: documents || [],
      },
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
 * Usado quando o usuário clica em "Sincronizar"
 * para re-baixar documentos do Sumsub e atualizar o armazenamento local
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[DOCUMENTS] Sincronizando documentos da empresa:', id);

    // Buscar empresa e UBOs
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name')
      .eq('id', id)
      .single();

    if (companyError || !company || !company.applicant_id) {
      return NextResponse.json(
        { error: 'Empresa não encontrada ou sem applicant_id' },
        { status: 404 }
      );
    }

    const { data: ubos } = await supabase
      .from('beneficial_owners')
      .select('id, applicant_id, first_name, middle_name, last_name')
      .eq('company_id', id);

    // Importar funções de download
    const { listDocuments, downloadDocument } = await import('@/lib/document-downloader');
    
    let totalSuccess = 0;

    // 1. Sincronizar documentos da EMPRESA
    console.log('[DOCUMENTS] Sincronizando documentos da empresa...');
    const companyDocs = await listDocuments(company.applicant_id);
    console.log(`[DOCUMENTS] Encontrados ${companyDocs.length} documentos da empresa no Sumsub`);
    
    for (const doc of companyDocs) {
      try {
        const success = await syncDocument(doc, id, null, 'company', company.applicant_id);
        if (success) totalSuccess++;
      } catch (error) {
        console.error(`[DOCUMENTS] Erro ao processar documento da empresa ${doc.image_id}:`, error);
      }
    }

    // 2. Sincronizar documentos dos UBOs
    if (ubos && ubos.length > 0) {
      console.log(`[DOCUMENTS] Sincronizando documentos de ${ubos.length} UBOs...`);
      
      for (const ubo of ubos) {
        if (!ubo.applicant_id) continue;
        
        try {
          const uboDocs = await listDocuments(ubo.applicant_id);
          console.log(`[DOCUMENTS] Encontrados ${uboDocs.length} documentos do UBO ${ubo.first_name} ${ubo.last_name}`);
          
          for (const doc of uboDocs) {
            try {
              const success = await syncDocument(doc, id, ubo.id, 'ubo', ubo.applicant_id);
              if (success) totalSuccess++;
            } catch (error) {
              console.error(`[DOCUMENTS] Erro ao processar documento do UBO ${doc.image_id}:`, error);
            }
          }
        } catch (error) {
          console.error(`[DOCUMENTS] Erro ao listar documentos do UBO ${ubo.id}:`, error);
        }
      }
    }

    console.log(`[DOCUMENTS] Sincronização concluída: ${totalSuccess} documentos`);

    return NextResponse.json({
      success: true,
      message: 'Documentos sincronizados com sucesso',
      total: totalSuccess,
    });

  } catch (error: any) {
    console.error('[DOCUMENTS] Erro na sincronização:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar documentos', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Função auxiliar para sincronizar um documento
 */
async function syncDocument(
  doc: any,
  companyId: string,
  uboId: string | null,
  source: 'company' | 'ubo',
  applicantId: string
): Promise<boolean> {
  try {
    const { downloadDocument } = await import('@/lib/document-downloader');
    
    // Baixar arquivo
    const buffer = await downloadDocument(doc.image_id, doc.inspection_id);
    
    // Determinar extensão
    const fileExtension = 'pdf'; // Assumir PDF por padrão
    const fileName = `${doc.image_id}.${fileExtension}`;
    const filePath = source === 'company' 
      ? `company-documents/${companyId}/${fileName}`
      : `ubo-documents/${uboId}/${fileName}`;
    
    // Upload para Storage
    const { error: uploadError } = await supabase.storage
      .from('compliance-docs')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('[DOCUMENTS] Erro ao fazer upload:', uploadError);
      return false;
    }
    
    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('compliance-docs')
      .getPublicUrl(filePath);
    
    // Gerar tags
    const tags = generateTags(doc, source);
    
    // Salvar metadados
    const { error: dbError } = await supabase
      .from('sumsub_documents')
      .upsert({
        company_id: companyId,
        ubo_id: uboId,
        source: source,
        applicant_id: applicantId,
        image_id: doc.image_id,
        inspection_id: doc.inspection_id,
        doc_set_type: doc.doc_set_type,
        doc_type: doc.doc_type,
        status: doc.status || 'pending',
        review_answer: doc.review_answer,
        review_comment: doc.review_comment,
        file_name: fileName,
        file_type: fileExtension,
        storage_path: filePath,
        download_url: urlData.publicUrl,
        tags: tags,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: 'image_id',
      });
    
    if (dbError) {
      console.error('[DOCUMENTS] Erro ao salvar no banco:', dbError);
      return false;
    }
    
    // Aguardar entre downloads
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return true;
    
  } catch (error) {
    console.error('[DOCUMENTS] Erro ao sincronizar documento:', error);
    return false;
  }
}

/**
 * Gera tags para um documento
 */
function generateTags(doc: any, source: 'company' | 'ubo'): string[] {
  const tags: string[] = [];
  
  // Tag de origem
  tags.push(source === 'company' ? 'Empresa' : 'UBO');
  
  // Tags baseadas no tipo de documento
  const docTypeMap: Record<string, string[]> = {
    'COMPANY_DOC': ['Documento da Empresa', 'PJ'],
    'IDENTITY': ['Documento de Identidade', 'RG', 'CNH'],
    'SELFIE': ['Selfie', 'Foto'],
    'PROOF_OF_RESIDENCE': ['Comprovante de Residência'],
    'COMPANY_REGISTRATION': ['Registro da Empresa', 'Contrato Social'],
    'ARTICLES_OF_INCORPORATION': ['Estatuto Social'],
    'SHAREHOLDERS_REGISTRY': ['Registro de Acionistas'],
    'CERTIFICATE_OF_INCUMBENCY': ['Certidão de Incumbência'],
    'BANK_STATEMENT': ['Extrato Bancário'],
  };
  
  if (doc.doc_set_type && docTypeMap[doc.doc_set_type]) {
    tags.push(...docTypeMap[doc.doc_set_type]);
  }
  
  if (doc.doc_type && docTypeMap[doc.doc_type]) {
    tags.push(...docTypeMap[doc.doc_type]);
  }
  
  // Tag de status
  if (doc.review_answer === 'GREEN') {
    tags.push('Aprovado');
  } else if (doc.review_answer === 'RED') {
    tags.push('Rejeitado');
  } else if (doc.review_answer === 'YELLOW') {
    tags.push('Revisão Pendente');
  }
  
  // Remover duplicatas
  return [...new Set(tags)];
}
