import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateWalletToken, generateWalletLink } from '@/lib/magic-links';

export const runtime = 'nodejs';

/**
 * POST /api/wallet/resend
 * 
 * Gera (ou regenera) link de wallet para applicant aprovado com contrato assinado
 * 
 * Body:
 * {
 *   "applicantId": "uuid"  // ID interno do Supabase
 *   OU
 *   "externalUserId": "cnpj_12345678000190"  // ID externo do Sumsub
 *   OU
 *   "document": "12345678000190"  // CNPJ ou CPF
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicantId, externalUserId, document } = body;

    if (!applicantId && !externalUserId && !document) {
      return NextResponse.json(
        { 
          error: 'Forneça applicantId, externalUserId ou document',
        },
        { status: 400 }
      );
    }

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
      const externalUserIdCnpj = `cnpj_${document.replace(/\D/g, '')}`;
      const externalUserIdCpf = `cpf_${document.replace(/\D/g, '')}`;
      query = query.or(`external_user_id.eq.${externalUserIdCnpj},external_user_id.eq.${externalUserIdCpf}`);
    }

    const { data: applicant, error } = await query.single();

    if (error || !applicant) {
      return NextResponse.json(
        { error: 'Applicant não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se applicant foi aprovado
    if (applicant.current_status !== 'approved' && applicant.review_answer !== 'GREEN') {
      return NextResponse.json(
        { 
          error: 'Applicant não está aprovado',
          currentStatus: applicant.current_status,
        },
        { status: 400 }
      );
    }

    // Verificar se contrato foi assinado
    if (!applicant.contract_signed_at) {
      return NextResponse.json(
        { 
          error: 'Contrato não foi assinado',
          message: 'O contrato precisa ser assinado antes de cadastrar a wallet'
        },
        { status: 400 }
      );
    }

    // Gerar token e link
    const token = await generateWalletToken(applicant.id);
    const walletLink = generateWalletLink(token);

    console.log('✅ Link de wallet gerado manualmente:', {
      applicantId: applicant.id,
      externalUserId: applicant.external_user_id,
      companyName: applicant.company_name,
      walletLink,
    });

    return NextResponse.json({
      success: true,
      walletLink,
      applicant: {
        id: applicant.id,
        externalUserId: applicant.external_user_id,
        type: applicant.applicant_type,
        name: applicant.company_name || applicant.full_name,
        email: applicant.email,
      },
      message: 'Link gerado com sucesso'
    });

  } catch (error: any) {
    console.error('Error resending wallet link:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar link de wallet' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/resend?applicantId=xxx
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const applicantId = searchParams.get('applicantId');
  const externalUserId = searchParams.get('externalUserId');
  const document = searchParams.get('document');

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ applicantId, externalUserId, document }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
