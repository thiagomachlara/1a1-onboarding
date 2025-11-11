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
        // Nota: CEIS, CEPIM e CNEP não estão disponíveis na biblioteca InfoSimples ainda
        default:
          return NextResponse.json(
            { success: false, error: 'Tipo de certidão PF não suportado' },
            { status: 400 }
          );
      }

      console.log('[UBO_EMIT] Resposta da InfoSimples:', { success: result.success });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Erro ao emitir certidão' },
          { status: 500 }
        );
      }

    } catch (apiError: any) {
      console.error('[UBO_EMIT] Erro na API InfoSimples:', apiError);
      return NextResponse.json(
        { success: false, error: `Erro na API: ${apiError.message}` },
        { status: 500 }
      );
    }

    // Salvar certidão no banco
    const { data: certificate, error: saveError } = await supabase
      .from('compliance_certificates')
      .insert({
        ubo_id: uboId,
        company_id: ubo.company_id,
        certificate_type_id: certificate_type,
        status: result.status || 'completed',
        file_url: result.pdfUrl,
        metadata: result.data || {},
        issued_at: new Date().toISOString(),
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
      certificate: {
        id: certificate.id,
        type: certType.name,
        status: certificate.status,
        pdfUrl: certificate.file_url,
        issuedAt: certificate.issued_at,
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
