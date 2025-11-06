import { NextRequest, NextResponse } from 'next/server';
import { getApplicantData } from '@/lib/sumsub-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicantId = searchParams.get('applicantId');

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Buscando dados RAW para applicantId: ${applicantId}`);

    // Buscar dados completos do Sumsub
    const data = await getApplicantData(applicantId) as any;

    // Estrutura completa para análise
    const debug = {
      applicantId,
      timestamp: new Date().toISOString(),
      
      // Dados principais
      email_root: data.email || null,
      email_info: data.info?.email || null,
      email_companyInfo: data.info?.companyInfo?.email || null,
      
      // Informações da empresa
      companyInfo: {
        companyName: data.info?.companyInfo?.companyName || null,
        registrationNumber: data.info?.companyInfo?.registrationNumber || null,
        country: data.info?.companyInfo?.country || null,
        phone: data.info?.companyInfo?.phone || null,
        legalAddress: data.info?.companyInfo?.legalAddress || null,
        incorporatedOn: data.info?.companyInfo?.incorporatedOn || null,
        type: data.info?.companyInfo?.type || null,
        email: data.info?.companyInfo?.email || null,
        beneficialOwners: data.info?.companyInfo?.beneficialOwners || [],
        beneficialOwnersCount: data.info?.companyInfo?.beneficialOwners?.length || 0,
      },

      // Fixed Info
      fixedInfo: {
        companyName: data.fixedInfo?.companyInfo?.companyName || null,
        registrationNumber: data.fixedInfo?.companyInfo?.registrationNumber || null,
        country: data.fixedInfo?.companyInfo?.country || null,
        legalAddress: data.fixedInfo?.companyInfo?.legalAddress || null,
        email: data.fixedInfo?.companyInfo?.email || null,
        beneficialOwners: data.fixedInfo?.companyInfo?.beneficialOwners || [],
        beneficialOwnersCount: data.fixedInfo?.companyInfo?.beneficialOwners?.length || 0,
      },

      // Documentos
      documents: {
        requiredIdDocs: data.requiredIdDocs || null,
        docSets: data.requiredIdDocs?.docSets || [],
        docSetsCount: data.requiredIdDocs?.docSets?.length || 0,
        imageReviewResults: data.requiredIdDocs?.docSets?.[0]?.imageReviewResults || [],
        imageReviewResultsCount: data.requiredIdDocs?.docSets?.[0]?.imageReviewResults?.length || 0,
      },

      // Review
      review: {
        reviewStatus: data.review?.reviewStatus || null,
        reviewResult: data.review?.reviewResult || null,
        reviewAnswer: data.review?.reviewResult?.reviewAnswer || null,
      },

      // Dados RAW completos (para análise)
      raw: data,
    };

    return NextResponse.json(debug, { status: 200 });
  } catch (error: any) {
    console.error('[DEBUG] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
