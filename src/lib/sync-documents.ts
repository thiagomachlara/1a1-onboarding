import { createClient } from '@supabase/supabase-js';
import { listDocuments, downloadDocument } from './document-downloader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SyncDocumentResult {
  totalSuccess: number;
  totalErrors: number;
  companyDocs: number;
  uboDocs: number;
}

/**
 * Sincroniza um documento individual
 */
async function syncDocument(
  doc: any,
  companyId: string,
  uboId: string | null,
  source: 'company' | 'ubo',
  applicantId: string
): Promise<boolean> {
  try {
    // Verificar se documento já existe
    const { data: existing } = await supabase
      .from('sumsub_documents')
      .select('id')
      .eq('image_id', doc.image_id)
      .single();

    if (existing) {
      console.log(`[SYNC-DOC] Documento ${doc.image_id} já existe, pulando...`);
      return true;
    }

    // Fazer download do documento
    const buffer = await downloadDocument(doc.inspection_id, doc.image_id);
    
    // Determinar tipo de arquivo a partir do fileMetadata da API
    const fileType = doc.file_type || 'jpeg'; // 'jpeg', 'png', 'pdf', etc
    const mimeType = fileType === 'pdf' ? 'application/pdf' : `image/${fileType}`;
    const extension = fileType;
    const fileName = `${doc.doc_type}_${doc.image_id}.${extension}`;
    
    // Upload para Supabase Storage
    const storagePath = `${companyId}/${source}/${uboId || 'company'}/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-docs')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[SYNC-DOC] Erro ao fazer upload do documento ${doc.image_id}:`, uploadError);
      return false;
    }

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('compliance-docs')
      .getPublicUrl(storagePath);

    // Gerar tags automáticas
    const tags = [
      doc.doc_set_type,
      doc.doc_type,
      source,
      doc.status || 'pending',
    ].filter(Boolean);

    // Salvar metadados no banco
    const { error: dbError } = await supabase
      .from('sumsub_documents')
      .insert({
        company_id: companyId,
        ubo_id: uboId,
        source,
        applicant_id: applicantId,
        image_id: doc.image_id,
        inspection_id: doc.inspection_id,
        doc_set_type: doc.doc_set_type,
        doc_type: doc.doc_type,
        status: doc.status || 'pending',
        review_answer: doc.review_answer,
        review_comment: doc.review_comment,
        file_name: fileName,
        file_type: mimeType,
        file_size: buffer.byteLength,
        storage_path: storagePath,
        download_url: urlData.publicUrl,
        tags,
        metadata: {
          original_doc: doc,
        },
      });

    if (dbError) {
      console.error(`[SYNC-DOC] Erro ao salvar metadados do documento ${doc.image_id}:`, dbError);
      return false;
    }

    console.log(`[SYNC-DOC] ✓ Documento ${doc.doc_type} sincronizado com sucesso`);
    return true;

  } catch (error) {
    console.error(`[SYNC-DOC] Erro ao sincronizar documento ${doc.image_id}:`, error);
    return false;
  }
}

/**
 * Sincroniza todos os documentos de uma empresa e seus UBOs
 */
export async function syncAllDocuments(companyId: string): Promise<SyncDocumentResult> {
  const result: SyncDocumentResult = {
    totalSuccess: 0,
    totalErrors: 0,
    companyDocs: 0,
    uboDocs: 0,
  };

  try {
    // Buscar empresa e UBOs
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name')
      .eq('id', companyId)
      .single();

    if (companyError || !company || !company.applicant_id) {
      throw new Error('Empresa não encontrada ou sem applicant_id');
    }

    const { data: ubos } = await supabase
      .from('beneficial_owners')
      .select('id, applicant_id, first_name, middle_name, last_name')
      .eq('company_id', companyId);

    // 1. Sincronizar documentos da EMPRESA
    console.log('[SYNC-DOCS] Sincronizando documentos da empresa...');
    const companyDocs = await listDocuments(company.applicant_id);
    console.log(`[SYNC-DOCS] Encontrados ${companyDocs.length} documentos da empresa no Sumsub`);
    
    for (const doc of companyDocs) {
      const success = await syncDocument(doc, companyId, null, 'company', company.applicant_id);
      if (success) {
        result.totalSuccess++;
        result.companyDocs++;
      } else {
        result.totalErrors++;
      }
    }

    // 2. Sincronizar documentos dos UBOs
    if (ubos && ubos.length > 0) {
      console.log(`[SYNC-DOCS] Sincronizando documentos de ${ubos.length} UBOs...`);
      
      for (const ubo of ubos) {
        if (!ubo.applicant_id) {
          console.log(`[SYNC-DOCS] UBO ${ubo.id} sem applicant_id, pulando...`);
          continue;
        }

        const uboDocs = await listDocuments(ubo.applicant_id);
        console.log(`[SYNC-DOCS] Encontrados ${uboDocs.length} documentos do UBO ${ubo.first_name} ${ubo.last_name}`);
        
        for (const doc of uboDocs) {
          const success = await syncDocument(doc, companyId, ubo.id, 'ubo', ubo.applicant_id);
          if (success) {
            result.totalSuccess++;
            result.uboDocs++;
          } else {
            result.totalErrors++;
          }
        }
      }
    }

    console.log(`[SYNC-DOCS] ✓ Sincronização concluída: ${result.totalSuccess} sucessos, ${result.totalErrors} erros`);
    return result;

  } catch (error) {
    console.error('[SYNC-DOCS] Erro ao sincronizar documentos:', error);
    throw error;
  }
}
