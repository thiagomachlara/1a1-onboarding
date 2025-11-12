import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { infosimples } from '@/lib/infosimples';

/**
 * POST /api/companies/[id]/certificates/emit
 * Emite uma certidão via API da InfoSimples
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: companyId } = await params;
    const body = await request.json();
    const { certificate_type } = body;

    // Buscar dados da empresa
    console.log('[EMIT] Buscando empresa:', companyId);
    const { data: company, error: companyError } = await supabase
      .from('applicants')
      .select('document_number, full_name, company_name')
      .eq('id', companyId)
      .single();
    
    console.log('[EMIT] Resultado da busca:', { company, companyError });

    if (companyError || !company) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }
    
    // Determinar o CNPJ (document_number) e nome da empresa
    const cnpj = company.document_number;
    const companyName = company.company_name || company.full_name;

    if (!certificate_type) {
      return NextResponse.json(
        { success: false, error: 'Tipo de certidão não informado' },
        { status: 400 }
      );
    }
    
    const { data: certType, error: certTypeError } = await supabase
      .from('compliance_certificate_types')
      .select('*')
      .eq('id', certificate_type)
      .single();

    if (certTypeError || !certType) {
      return NextResponse.json(
        { success: false, error: 'Tipo de certidão não encontrado' },
        { status: 404 }
      );
    }

    if (!certType.infosimples_service) {
      return NextResponse.json(
        { success: false, error: 'Esta certidão não está disponível via API' },
        { status: 400 }
      );
    }

    // Chamar API da InfoSimples baseado no tipo de certidão
    let result;
    // CNPJ já foi extraído acima

    try {
      switch (certificate_type) {
        case 'qsa':
          result = await infosimples.consultarCNPJ(cnpj);
          break;
        case 'cnd_federal':
        case 'pf_cnd_federal':
          result = await infosimples.emitirCNDFederal({ cnpj, preferencia_emissao: '2via' });
          break;
        case 'cndt':
        case 'pf_cndt':
          result = await infosimples.emitirCNDT({ cnpj });
          break;
        case 'trf':
        case 'pf_trf':
          result = await infosimples.emitirCertidaoTRF({ cnpj, nome: companyName });
          break;
        case 'mte':
          result = await infosimples.emitirCertidaoMTE(cnpj);
          break;
        case 'fgts':
          result = await infosimples.emitirCRFFGTS(cnpj);
          break;
        case 'cvm_processos':
        case 'pf_cvm_processos':
          result = await infosimples.consultarProcessosCVM({ cnpj });
          break;
        case 'protestos':
        case 'pf_protestos':
          result = await infosimples.consultarProtestos({ cnpj });
          break;
        case 'cheques_sem_fundo':
        case 'pf_cheques_sem_fundo':
          result = await infosimples.consultarChequesSemFundo({ cnpj });
          break;
        case 'improbidade':
        case 'pf_improbidade':
          result = await infosimples.consultarImprobidade({ cnpj, nome: companyName });
          break;
        // Certidões PF devem ser emitidas via /api/ubos/[id]/certificates/emit
        default:
          return NextResponse.json(
            { success: false, error: 'Tipo de certidão não suportado' },
            { status: 400 }
          );
      }
    } catch (apiError: any) {
      console.error('Erro ao chamar InfoSimples API:', apiError);
      return NextResponse.json(
        { success: false, error: `Erro na API: ${apiError.message}` },
        { status: 500 }
      );
    }

    // Verificar se a consulta foi bem-sucedida
    if (!infosimples.isSuccess(result)) {
      return NextResponse.json(
        {
          success: false,
          error: infosimples.getErrorMessage(result),
          code: result.code,
        },
        { status: 400 }
      );
    }

    // Baixar PDF do site_receipt (se disponível e for realmente um PDF)
    let pdfStoragePath = null;
    let htmlUrl = null;
    if (result.site_receipts && result.site_receipts.length > 0) {
      try {
        const receiptUrl = result.site_receipts[0];
        const pdfBuffer = await infosimples.baixarPDF(receiptUrl);

        // Apenas salvar se for um PDF real (não HTML)
        if (pdfBuffer) {
          // Salvar PDF no Supabase Storage
          const fileName = `${certificate_type}_${cnpj}_${Date.now()}.pdf`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('compliance-certificates')
            .upload(fileName, pdfBuffer, {
              contentType: 'application/pdf',
            });

          if (uploadError) {
            console.error('Erro ao fazer upload do PDF:', uploadError);
          } else {
            pdfStoragePath = uploadData.path;
            console.log('[INFO] PDF salvo com sucesso:', pdfStoragePath);
          }
        } else {
          // Se não for PDF, salvar URL do HTML para visualização
          htmlUrl = receiptUrl;
          console.log('[INFO] site_receipt não contém PDF, salvando URL do HTML:', htmlUrl);
        }
      } catch (pdfError) {
        console.error('Erro ao processar PDF:', pdfError);
      }
    }

    // Determinar status baseado nos dados retornados
    let status = 'obtida';
    if (result.data && result.data.length > 0) {
      const data = result.data[0];
      // Lógica para determinar se é regular/irregular baseado nos dados
      // Isso varia por tipo de certidão
      if (data.situacao === 'REGULAR' || data.status === 'REGULAR') {
        status = 'regular';
      } else if (data.situacao === 'IRREGULAR' || data.status === 'IRREGULAR') {
        status = 'irregular';
      }
    }

    // Salvar certidão no banco de dados
    const { data: certificate, error: dbError } = await supabase
      .from('compliance_certificates')
      .insert({
        company_id: companyId,
        certificate_type,
        status,
        issue_date: new Date().toISOString(),
        pdf_storage_path: pdfStoragePath,
        html_url: htmlUrl,
        query_data: result.data[0] || {},
        infosimples_service: certType.infosimples_service,
        infosimples_price: result.header.price,
        infosimples_response: result,
        source: certType.source,
        manual_url: certType.manual_url,
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar certidão no banco:', dbError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar certidão no banco de dados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate,
      infosimples: {
        price: result.header.price,
        billable: result.header.billable,
      },
    });
  } catch (error: any) {
    console.error('Erro em POST /api/companies/[id]/certificates/emit:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
