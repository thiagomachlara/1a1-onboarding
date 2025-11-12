import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { infosimples } from '@/lib/infosimples';

/**
 * POST /api/ubos/[id]/certificates/emit
 * 
 * Emite uma certidão PF de um UBO via API da InfoSimples
 * 
 * Similar à API de certidões PJ, mas usando dados do UBO (CPF em vez de CNPJ)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: uboId } = await params;
    const body = await request.json();
    const { certificate_type } = body;

    console.log('[UBO_EMIT] Emitindo certidão:', { uboId, certificate_type });

    // Buscar dados do UBO
    const { data: ubo, error: uboError } = await supabase
      .from('beneficial_owners')
      .select('tin, first_name, last_name, company_id')
      .eq('id', uboId)
      .single();

    if (uboError || !ubo) {
      console.error('[UBO_EMIT] UBO não encontrado:', uboError);
      return NextResponse.json(
        { success: false, error: 'UBO não encontrado' },
        { status: 404 }
      );
    }

    if (!ubo.tin) {
      return NextResponse.json(
        { success: false, error: 'UBO sem CPF cadastrado' },
        { status: 400 }
      );
    }

    // Buscar tipo de certidão
    const { data: certType, error: certTypeError } = await supabase
      .from('compliance_certificate_types')
      .select('*')
      .eq('id', certificate_type)
      .single();

    if (certTypeError || !certType) {
      console.error('[UBO_EMIT] Tipo de certidão não encontrado:', certTypeError);
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

    // Preparar dados
    const cpf = ubo.tin.replace(/\D/g, ''); // Remove formatação
    const nome = `${ubo.first_name} ${ubo.last_name}`.trim();

    // Chamar API da InfoSimples baseado no tipo de certidão
    let result;

    try {
      console.log('[UBO_EMIT] Chamando InfoSimples:', { certificate_type, cpf });

      switch (certificate_type) {
        case 'pf_cnd_federal':
          result = await infosimples.emitirCNDFederal(cpf);
          break;
        case 'pf_cndt':
          result = await infosimples.emitirCNDT(cpf);
          break;
        case 'pf_trf':
          result = await infosimples.emitirCertidaoTRF({ cpf, nome });
          break;
        case 'pf_cvm_processos':
          result = await infosimples.consultarProcessosCVM({ cpf });
          break;
        case 'pf_protestos':
          result = await infosimples.consultarProtestos({ cpf });
          break;
        case 'pf_cheques_sem_fundo':
          result = await infosimples.consultarChequesSemFundo({ cpf });
          break;
        case 'pf_improbidade':
          result = await infosimples.consultarImprobidade({ cpf, nome });
          break;
        case 'pf_cpf':
          result = await infosimples.consultarCPF(cpf);
          break;
        case 'pf_antecedentes':
          result = await infosimples.emitirAntecedentesCriminais(cpf, nome);
          break;
        case 'pf_mandados':
          result = await infosimples.consultarMandadosPrisao(cpf, nome);
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Tipo de certidão PF não suportado' },
            { status: 400 }
          );
      }

      console.log('[UBO_EMIT] Resposta da InfoSimples:', { code: result.code });

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

    } catch (apiError: any) {
      console.error('[UBO_EMIT] Erro na API InfoSimples:', apiError);
      return NextResponse.json(
        { success: false, error: `Erro na API: ${apiError.message}` },
        { status: 500 }
      );
    }

    // Baixar PDF do site_receipt (se disponível)
    let pdfStoragePath = null;
    let htmlUrl = null;
    if (result.site_receipts && result.site_receipts.length > 0) {
      try {
        const receiptUrl = result.site_receipts[0];
        const pdfBuffer = await infosimples.baixarPDF(receiptUrl);

        // Apenas salvar se for um PDF real (não HTML)
        if (pdfBuffer) {
          // Salvar PDF no Supabase Storage
          const fileName = `${certificate_type}_${cpf}_${Date.now()}.pdf`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('compliance-certificates')
            .upload(fileName, pdfBuffer, {
              contentType: 'application/pdf',
            });

          if (uploadError) {
            console.error('[UBO_EMIT] Erro ao fazer upload do PDF:', uploadError);
          } else {
            pdfStoragePath = uploadData.path;
            console.log('[UBO_EMIT] PDF salvo com sucesso:', pdfStoragePath);
          }
        } else {
          // Se não for PDF, salvar URL do HTML para visualização
          htmlUrl = receiptUrl;
          console.log('[UBO_EMIT] site_receipt não contém PDF, salvando URL do HTML:', htmlUrl);
        }
      } catch (pdfError) {
        console.error('[UBO_EMIT] Erro ao processar PDF:', pdfError);
      }
    }

    // Determinar status baseado nos dados retornados
    let status = 'obtida';
    if (result.data && result.data.length > 0) {
      const hasIssues = result.data.some((item: any) => 
        item.situacao === 'IRREGULAR' || 
        item.status === 'IRREGULAR' ||
        item.pendencias?.length > 0
      );
      status = hasIssues ? 'irregular' : 'regular';
    }

    // Salvar certidão no banco
    const { data: certificate, error: saveError } = await supabase
      .from('compliance_certificates')
      .insert({
        ubo_id: uboId,
        company_id: ubo.company_id,
        certificate_type: certificate_type,
        status: status,
        pdf_storage_path: pdfStoragePath,
        html_url: htmlUrl,
        query_data: result.data[0] || {},
        infosimples_service: certType.infosimples_service,
        infosimples_price: result.header.price,
        infosimples_response: result,
        source: certType.source,
        manual_url: certType.manual_url,
        issue_date: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('[UBO_EMIT] Erro ao salvar certidão:', saveError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar certidão no banco' },
        { status: 500 }
      );
    }

    console.log('[UBO_EMIT] Certidão emitida e salva com sucesso:', certificate.id);

    return NextResponse.json({
      success: true,
      certificate,
      infosimples: {
        price: result.header.price,
        billable: result.header.billable,
      },
    });

  } catch (error: any) {
    console.error('[UBO_EMIT] Erro no endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
