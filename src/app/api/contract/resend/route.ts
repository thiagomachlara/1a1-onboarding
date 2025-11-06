import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateContractToken, generateContractLink } from '@/lib/magic-links';

export const runtime = 'nodejs';

/**
 * POST /api/contract/resend
 * 
 * Gera (ou regenera) link de contrato para applicant aprovado
 * 
 * Body:
 * {
 *   "applicantId": "uuid"  // ID interno do Supabase
 *   OU
 *   "externalUserId": "cnpj_12345678000190"  // ID externo do Sumsub
 *   OU
 *   "document": "12345678000190"  // CNPJ ou CPF
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "contractLink": "https://onboarding.1a1cripto.com/contract?token=xxx",
 *   "applicant": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicantId, externalUserId, document } = body;

    // Validar que pelo menos um identificador foi fornecido
    if (!applicantId && !externalUserId && !document) {
      return NextResponse.json(
        { 
          error: 'Forneça applicantId, externalUserId ou document',
          example: {
            applicantId: 'uuid',
            externalUserId: 'cnpj_12345678000190',
            document: '12345678000190'
          }
        },
        { status: 400 }
      );
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar applicant
    let query = supabase.from('applicants').select('*');

    if (applicantId) {
      query = query.eq('id', applicantId);
    } else if (externalUserId) {
      query = query.eq('external_user_id', externalUserId);
    } else if (document) {
      // Tentar com prefixo cnpj_ ou cpf_
      const externalUserIdCnpj = `cnpj_${document.replace(/\D/g, '')}`;
      const externalUserIdCpf = `cpf_${document.replace(/\D/g, '')}`;
      query = query.or(`external_user_id.eq.${externalUserIdCnpj},external_user_id.eq.${externalUserIdCpf}`);
    }

    const { data: applicant, error } = await query.single();

    if (error || !applicant) {
      return NextResponse.json(
        { 
          error: 'Applicant não encontrado',
          searched: { applicantId, externalUserId, document }
        },
        { status: 404 }
      );
    }

    // Verificar se applicant foi aprovado
    if (applicant.current_status !== 'approved' && applicant.review_answer !== 'GREEN') {
      return NextResponse.json(
        { 
          error: 'Applicant não está aprovado',
          currentStatus: applicant.current_status,
          reviewAnswer: applicant.review_answer,
          message: 'Apenas applicants aprovados (status=approved ou reviewAnswer=GREEN) podem receber link de contrato'
        },
        { status: 400 }
      );
    }

    // Verificar se contrato já foi assinado
    if (applicant.contract_signed_at) {
      return NextResponse.json(
        { 
          warning: 'Contrato já foi assinado',
          signedAt: applicant.contract_signed_at,
          message: 'Um novo link será gerado, mas o contrato anterior já está assinado'
        },
        { status: 200 }
      );
    }

    // Gerar token e link
    const token = await generateContractToken(applicant.id);
    const contractLink = generateContractLink(token);

    console.log('✅ Link de contrato gerado manualmente:', {
      applicantId: applicant.id,
      externalUserId: applicant.external_user_id,
      companyName: applicant.company_name,
      fullName: applicant.full_name,
      contractLink,
    });

    return NextResponse.json({
      success: true,
      contractLink,
      applicant: {
        id: applicant.id,
        externalUserId: applicant.external_user_id,
        type: applicant.applicant_type,
        name: applicant.company_name || applicant.full_name,
        email: applicant.email,
        phone: applicant.phone,
        document: applicant.document_number,
        status: applicant.current_status,
        reviewAnswer: applicant.review_answer,
        approvedAt: applicant.approved_at,
        contractSignedAt: applicant.contract_signed_at,
      },
      message: applicant.contract_signed_at 
        ? 'Novo link gerado (contrato já estava assinado)'
        : 'Link gerado com sucesso'
    });

  } catch (error) {
    console.error('Error resending contract link:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao gerar link de contrato',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contract/resend?applicantId=xxx
 * 
 * Alternativa via query params (para facilitar teste no navegador)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const applicantId = searchParams.get('applicantId');
  const externalUserId = searchParams.get('externalUserId');
  const document = searchParams.get('document');

  // Redirecionar para POST
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ applicantId, externalUserId, document }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
