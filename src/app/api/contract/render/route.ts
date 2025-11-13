import { createClient } from '@/lib/supabase/server';
import { renderTemplate, prepareContractVariables } from '@/lib/template-renderer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Buscar dados do applicant pelo token
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('contract_token', token)
      .single();

    if (applicantError || !applicant) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 404 }
      );
    }

    // Buscar template ativo de contrato
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('template_type', 'contract')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template de contrato não encontrado' },
        { status: 500 }
      );
    }

    // Preparar variáveis do contrato
    const isIndividual = applicant.applicant_type === 'individual';
    
    const variables = {
      nome: applicant.company_name || applicant.full_name || 'Não informado',
      documento: applicant.document_number || 'Não informado',
      doc_label: isIndividual ? 'CPF' : 'CNPJ',
      tipo_cliente: isIndividual ? 'Pessoa Física' : 'Pessoa Jurídica',
      email: applicant.email || 'Não informado',
      representante_legal: !isIndividual && applicant.legal_representative 
        ? `Representante Legal: ${applicant.legal_representative}`
        : '',
      data_assinatura: applicant.contract_signed_at 
        ? new Date(applicant.contract_signed_at).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'long',
            timeStyle: 'medium',
          })
        : '',
      ip_assinatura: applicant.contract_signed_ip || ''
    };

    // Renderizar template
    const renderedContract = renderTemplate(template.content, variables);

    // Retornar contrato renderizado + dados do applicant
    return NextResponse.json({
      contract: renderedContract,
      applicant: {
        id: applicant.id,
        name: applicant.company_name || applicant.full_name,
        document: applicant.document_number,
        email: applicant.email,
        type: applicant.applicant_type,
        isSigned: !!applicant.contract_signed_at,
        signedAt: applicant.contract_signed_at,
        signedIp: applicant.contract_signed_ip
      },
      template: {
        id: template.id,
        version: template.version,
        title: template.title
      }
    });

  } catch (error) {
    console.error('[CONTRACT-RENDER] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao renderizar contrato' },
      { status: 500 }
    );
  }
}
