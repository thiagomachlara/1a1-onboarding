import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  sendWhatsAppNotification,
  createApplicantCreatedNotification,
  createApplicantPendingNotification,
  createApplicantReviewedNotification,
  createApplicantOnHoldNotification,
} from '@/lib/whatsapp-notifier';
import {
  upsertApplicant,
  getApplicantByExternalUserId,
  addVerificationHistory,
  extractDocumentFromExternalUserId,
  type Applicant,
} from '@/lib/supabase-db';
import { consultarCNPJ, formatarEndereco, formatarTelefone } from '@/lib/brasilapi';
import { enrichAddress } from '@/lib/address-enrichment';
import { getApplicantData, getSummaryReportPDF } from '@/lib/sumsub-api';
import {
  generateContractToken,
  generateContractLink,
  generateWalletToken,
} from '@/lib/magic-links';

const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET!;

/**
 * Verifica a assinatura do webhook do Sumsub
 */
function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', SUMSUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Extrai tipo de verificação do payload do Sumsub
 * Prioriza o campo applicantType do payload, depois o prefixo do externalUserId
 */
function extractVerificationType(data: any): 'individual' | 'company' {
  // 1. Tentar usar applicantType do payload (fonte mais confiável)
  if (data.applicantType) {
    return data.applicantType === 'company' ? 'company' : 'individual';
  }
  
  // 2. Fallback para prefixo do externalUserId
  const externalUserId = data.externalUserId || '';
  
  if (externalUserId.startsWith('cpf_')) {
    return 'individual';
  }
  if (externalUserId.startsWith('cnpj_')) {
    return 'company';
  }
  
  // Formato antigo (retrocompatibilidade)
  if (externalUserId.startsWith('individual_')) {
    return 'individual';
  }
  if (externalUserId.startsWith('company_')) {
    return 'company';
  }
  
  return 'individual'; // fallback
}

/**
 * Extrai nome completo (PF) ou razão social (PJ) do payload
 */
function extractName(data: any, verificationType: 'individual' | 'company'): string | undefined {
  if (verificationType === 'company') {
    // Para PJ: buscar companyName
    return data.info?.companyInfo?.companyName || 
           data.companyInfo?.companyName ||
           data.info?.company?.companyName;
  } else {
    // Para PF: buscar firstName + lastName
    const firstName = data.info?.firstName || data.firstName || '';
    const lastName = data.info?.lastName || data.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || undefined;
  }
}

/**
 * Enriquece dados do webhook com informações completas da API Sumsub
 */
async function enrichWithSumsubData(
  applicantId: string,
  verificationType: 'individual' | 'company',
  webhookData: any
) {
  try {
    const sumsubData = await getApplicantData(applicantId);
    console.log('✅ Dados completos obtidos da API Sumsub');
    
    return {
      name: verificationType === 'company' ? sumsubData.companyName : sumsubData.fullName,
      email: sumsubData.email,
      phone: sumsubData.phone,
      document: verificationType === 'company' ? sumsubData.registrationNumber : sumsubData.idDocNumber,
      sumsubData,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar dados do Sumsub, usando fallback:', error);
    
    // Fallback para dados do webhook (incompletos)
    const name = extractName(webhookData, verificationType);
    const email = webhookData.info?.email || webhookData.email;
    const phone = webhookData.info?.phone || webhookData.phone;
    
    let document: string | undefined;
    if (verificationType === 'company') {
      document = webhookData.info?.companyInfo?.registrationNumber ||
                 webhookData.companyInfo?.registrationNumber ||
                 extractDocumentFromExternalUserId(webhookData.externalUserId);
    } else {
      document = webhookData.info?.idDocs?.[0]?.number || 
                 webhookData.idDocs?.[0]?.number ||
                 extractDocumentFromExternalUserId(webhookData.externalUserId);
    }
    
    return { name, email, phone, document, sumsubData: null };
  }
}

/**
 * GET endpoint para validação do webhook pelo Sumsub
 * Retorna 200 OK para permitir que o Sumsub valide a URL
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Sumsub webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

/**
 * Webhook endpoint para receber notificações do Sumsub
 * POST /api/sumsub/webhook
 * 
 * Tipos de eventos:
 * - applicantCreated: Aplicante criado
 * - applicantPending: Verificação pendente
 * - applicantReviewed: Verificação revisada (aprovada/rejeitada)
 * - applicantOnHold: Verificação em espera
 */
export async function POST(request: NextRequest) {
  try {
    // Obter payload e assinatura
    const payload = await request.text();
    const signature = request.headers.get('x-payload-digest') || '';

    // Verificar assinatura
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse do payload
    const data = JSON.parse(payload);
    const { type, applicantId, inspectionId, correlationId, externalUserId, reviewStatus, reviewResult } = data;

    console.log('Webhook received:', {
      type,
      applicantId,
      externalUserId,
      reviewStatus,
      reviewResult,
    });

    // Processar diferentes tipos de eventos
    switch (type) {
      case 'applicantCreated':
        await handleApplicantCreated(data);
        break;
      
      case 'applicantPending':
        await handleApplicantPending(data);
        break;
      
      case 'applicantReviewed':
        await handleApplicantReviewed(data);
        break;
      
      case 'applicantOnHold':
        await handleApplicantOnHold(data);
        break;
      
      default:
        console.log('Unhandled webhook type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handler para evento applicantCreated
 */
async function handleApplicantCreated(data: any) {
  console.log('Applicant created:', data.externalUserId);
  
  const verificationType = extractVerificationType(data);
  const documentNumber = extractDocumentFromExternalUserId(data.externalUserId);

  // Se for PJ, consultar BrasilAPI para pegar razão social
  let companyName: string | undefined;
  if (verificationType === 'company' && documentNumber) {
    try {
      const cnpjData = await consultarCNPJ(documentNumber);
      if (cnpjData) {
        companyName = cnpjData.razao_social;
        console.log('✅ Dados da empresa obtidos via BrasilAPI:', companyName);
      }
    } catch (error) {
      console.error('❌ Erro ao consultar BrasilAPI:', error);
    }
  }

  // Salvar no Supabase
  try {
    const applicantData: Applicant = {
      external_user_id: data.externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: 'created',
      document_number: documentNumber || undefined,
      company_name: companyName,
      sumsub_level_name: data.levelName,
    };

    const applicant = await upsertApplicant(applicantData);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id!,
      event_type: 'applicantCreated',
      new_status: 'created',
      webhook_payload: data,
    });

    console.log('✅ Applicant saved to database:', applicant.id);
  } catch (error) {
    console.error('❌ Failed to save applicant to database:', error);
  }

  // Enviar notificação para WhatsApp
  const notification = createApplicantCreatedNotification({
    externalUserId: data.externalUserId,
    verificationType,
  });

  await sendWhatsAppNotification(notification);
}

/**
 * Handler para evento applicantPending
 */
async function handleApplicantPending(data: any) {
  console.log('Applicant pending:', data.externalUserId);
  
  const verificationType = extractVerificationType(data);

  // 🆕 Buscar dados completos na API Sumsub
  const enrichedData = await enrichWithSumsubData(data.applicantId, verificationType, data);
  const { name, email, phone, document } = enrichedData;

  // Atualizar no Supabase
  try {
    const existingApplicant = await getApplicantByExternalUserId(data.externalUserId);
    
    const applicantData: Applicant = {
      external_user_id: data.externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: 'pending',
      full_name: verificationType === 'individual' ? name : undefined,
      company_name: verificationType === 'company' ? name : undefined,
      email: email,
      phone: phone,
      ubo_name: enrichedData.sumsubData?.uboName,
      document_number: document,
      first_verification_at: existingApplicant?.first_verification_at || new Date().toISOString(),
      last_verification_at: new Date().toISOString(),
      sumsub_level_name: data.levelName,
    };

    const applicant = await upsertApplicant(applicantData);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id!,
      event_type: 'applicantPending',
      old_status: existingApplicant?.current_status,
      new_status: 'pending',
      webhook_payload: data,
    });

    console.log('✅ Applicant updated in database:', applicant.id);
  } catch (error) {
    console.error('❌ Failed to update applicant in database:', error);
  }

  // Enviar notificação para WhatsApp
  const notification = createApplicantPendingNotification({
    externalUserId: data.externalUserId,
    verificationType,
    name,
    email,
    document,
  });

  await sendWhatsAppNotification(notification);
}

/**
 * Enriquece endereço de empresa com BrasilAPI
 */
async function enrichCompanyAddress(applicantId: string, cnpj: string, originalAddress?: string | null) {
  try {
    console.log(`[Address Enrichment] Starting enrichment for company: ${cnpj}`);
    const enrichedAddress = await enrichAddress(cnpj, originalAddress || undefined);
    
    // Atualizar campos enriched_* no banco
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase
      .from('applicants')
      .update({
        enriched_street: enrichedAddress.street,
        enriched_number: enrichedAddress.number,
        enriched_complement: enrichedAddress.complement,
        enriched_neighborhood: enrichedAddress.neighborhood,
        enriched_city: enrichedAddress.city,
        enriched_state: enrichedAddress.state,
        enriched_postal_code: enrichedAddress.postal_code,
        enriched_source: enrichedAddress.source,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', applicantId);
    
    console.log(`[Address Enrichment] Success:`, enrichedAddress);
  } catch (error) {
    console.error(`[Address Enrichment] Failed:`, error);
    // Não falhar o processo se enriquecimento falhar
  }
}

/**
 * Handler para evento applicantReviewed
 */
async function handleApplicantReviewed(data: any) {
  const { externalUserId, reviewResult, reviewStatus, correlationId } = data;
  
  console.log('📥 Webhook applicantReviewed recebido:', {
    userId: externalUserId,
    result: reviewResult?.reviewAnswer,
    status: reviewStatus,
    correlationId,
    timestamp: new Date().toISOString(),
  });

  const verificationType = extractVerificationType(data);

  // 🆕 Buscar dados completos na API Sumsub
  const enrichedData = await enrichWithSumsubData(data.applicantId, verificationType, data);
  let { name, email, phone, document } = enrichedData;
  
  // Buscar dados do banco como fallback adicional
  const existingApplicant = await getApplicantByExternalUserId(externalUserId);
  
  // 🆕 CORREÇÃO: Verificar estado anterior para prevenir notificações duplicadas
  const wasAlreadyApproved = existingApplicant?.current_status === 'approved';
  const wasAlreadyRejected = existingApplicant?.current_status === 'rejected';
  
  console.log('📊 Estado anterior do applicant:', {
    currentStatus: existingApplicant?.current_status,
    wasAlreadyApproved,
    wasAlreadyRejected,
    hasContractToken: !!existingApplicant?.contract_token,
    contractSigned: !!existingApplicant?.contract_signed_at,
  });
  if (existingApplicant) {
    name = name || existingApplicant.full_name || existingApplicant.company_name;
    email = email || existingApplicant.email;
    phone = phone || existingApplicant.phone;
    document = document || existingApplicant.document_number;
  }

  const reviewAnswer = reviewResult?.reviewAnswer || 'YELLOW';
  const rejectionReason = reviewResult?.rejectLabels?.join(', ');

  // Determinar status baseado no reviewAnswer
  let currentStatus: 'approved' | 'rejected' | 'pending' = 'pending';
  let approvedAt: string | undefined;
  let rejectedAt: string | undefined;

  if (reviewAnswer === 'GREEN') {
    currentStatus = 'approved';
    approvedAt = new Date().toISOString();
  } else if (reviewAnswer === 'RED') {
    currentStatus = 'rejected';
    rejectedAt = new Date().toISOString();
  }

  // Atualizar no Supabase
  try {
    const existingApplicant = await getApplicantByExternalUserId(externalUserId);
    
    const applicantData: Applicant = {
      external_user_id: externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: currentStatus,
      review_answer: reviewAnswer as 'GREEN' | 'RED' | 'YELLOW',
      full_name: name,
      email: email,
      phone: phone,
      ubo_name: enrichedData.sumsubData?.uboName,
      document_number: document || extractDocumentFromExternalUserId(externalUserId) || undefined,
      first_verification_at: existingApplicant?.first_verification_at || new Date().toISOString(),
      last_verification_at: new Date().toISOString(),
      approved_at: approvedAt,
      rejected_at: rejectedAt,
      sumsub_level_name: data.levelName,
      sumsub_review_result: reviewResult,
      rejection_reason: rejectionReason,
    };

    const applicant = await upsertApplicant(applicantData);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id!,
      event_type: 'applicantReviewed',
      old_status: existingApplicant?.current_status,
      new_status: currentStatus,
      review_answer: reviewAnswer as 'GREEN' | 'RED' | 'YELLOW',
      rejection_reason: rejectionReason,
      webhook_payload: data,
    });

    console.log('✅ Applicant reviewed and saved:', applicant.id);
    
    // 🆕 Enriquecer endereço (apenas para empresas)
    if (verificationType === 'company' && applicant.id && document) {
      await enrichCompanyAddress(applicant.id, document, applicant.address);
    }
  } catch (error) {
    console.error('❌ Failed to save reviewed applicant:', error);
  }

  // Se aprovado, gerar magic link para contrato
  let contractLink: string | undefined;
  if (reviewAnswer === 'GREEN') {
    try {
      const applicant = await getApplicantByExternalUserId(externalUserId);
      if (applicant?.id) {
        const token = await generateContractToken(applicant.id);
        contractLink = generateContractLink(token);
        console.log('✅ Magic link gerado para contrato:', contractLink);
      }
    } catch (error) {
      console.error('❌ Erro ao gerar magic link:', error);
    }
  }

  // 🆕 Gerar e armazenar Summary Report PDF do Sumsub
  let sumsubReportUrl: string | undefined;
  try {
    console.log('[Sumsub Report] Gerando Summary Report PDF...');
    
    // 1. Gerar PDF via API Sumsub
    const pdfBuffer = await getSummaryReportPDF(
      data.applicantId,
      verificationType,
      'pt'
    );
    
    // 2. Fazer upload para Supabase Storage
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortId = data.applicantId.substring(0, 8);
    const fileName = `sumsub_${verificationType}_${shortId}_${timestamp}.pdf`;
    const filePath = `sumsub-reports/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screening-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
    
    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }
    
    console.log('[Sumsub Report] PDF uploaded:', filePath);
    
    // 3. Gerar URL assinada (válida por 1 ano)
    const { data: signedUrlData } = await supabase.storage
      .from('screening-reports')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 ano
    
    if (!signedUrlData?.signedUrl) {
      throw new Error('Erro ao gerar URL assinada');
    }
    
    const fullUrl = signedUrlData.signedUrl;
    
    // 4. Criar link curto
    const { createShortLink, buildShortUrl } = await import('@/lib/pdf-short-links');
    const linkShortId = await createShortLink(fullUrl, 'sumsub');
    const shortLink = buildShortUrl(linkShortId);
    
    sumsubReportUrl = shortLink;
    console.log('[Sumsub Report] Link curto gerado:', sumsubReportUrl);
    
  } catch (error) {
    console.error('[Sumsub Report] Erro ao gerar Summary Report:', error);
    // Não bloquear o fluxo se falhar
  }

  // 🆕 CORREÇÃO: Só enviar notificação se houver mudança de estado
  const isNowApproved = reviewAnswer === 'GREEN';
  const isNowRejected = reviewAnswer === 'RED';
  
  let shouldNotify = false;
  let notificationReason = '';
  
  if (isNowApproved && !wasAlreadyApproved) {
    shouldNotify = true;
    notificationReason = 'Nova aprovação';
  } else if (isNowRejected && !wasAlreadyRejected) {
    shouldNotify = true;
    notificationReason = 'Nova rejeição';
  } else if (isNowApproved && wasAlreadyApproved) {
    shouldNotify = false;
    notificationReason = 'Já estava aprovado - pulando notificação duplicada';
  } else if (isNowRejected && wasAlreadyRejected) {
    shouldNotify = false;
    notificationReason = 'Já estava rejeitado - pulando notificação duplicada';
  } else {
    // Status YELLOW ou outros
    shouldNotify = true;
    notificationReason = 'Mudança de estado';
  }
  
  console.log('🔔 Decisão de notificação:', {
    shouldNotify,
    reason: notificationReason,
    reviewAnswer,
    wasAlreadyApproved,
    wasAlreadyRejected,
  });
  
  if (shouldNotify) {
    // Enviar notificação para WhatsApp
    const notification = createApplicantReviewedNotification({
      externalUserId,
      verificationType,
      name,
      email,
      document,
      reviewAnswer: reviewAnswer as 'GREEN' | 'RED' | 'YELLOW',
      reviewStatus,
      rejectionReason,
      contractLink,
      sumsubReportUrl,
    });

    await sendWhatsAppNotification(notification);
    console.log('✅ Notificação enviada:', { externalUserId, reviewAnswer });
  } else {
    console.log('⏭️  Notificação pulada:', { externalUserId, reason: notificationReason });
  }
}

/**
 * Handler para evento applicantOnHold
 */
async function handleApplicantOnHold(data: any) {
  console.log('Applicant on hold:', data.externalUserId);
  
  const verificationType = extractVerificationType(data);

  // Extrair informações do applicant (usando nova função)
  let name = extractName(data, verificationType);
  let email = data.info?.email || data.email;
  let phone = data.info?.phone || data.phone;
  let document = data.info?.idDocs?.[0]?.number || data.idDocs?.[0]?.number;
  
  // Buscar dados do banco se não vieram no payload
  const existingApplicant = await getApplicantByExternalUserId(data.externalUserId);
  if (existingApplicant) {
    name = name || existingApplicant.full_name;
    email = email || existingApplicant.email;
    phone = phone || existingApplicant.phone;
    document = document || existingApplicant.document_number;
  }

  // Atualizar no Supabase
  try {
    
    const applicantData: Applicant = {
      external_user_id: data.externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: 'onHold',
      full_name: name,
      email: email,
      phone: phone,
      document_number: document || extractDocumentFromExternalUserId(data.externalUserId) || undefined,
      first_verification_at: existingApplicant?.first_verification_at || new Date().toISOString(),
      last_verification_at: new Date().toISOString(),
      sumsub_level_name: data.levelName,
    };

    const applicant = await upsertApplicant(applicantData);

    // Adicionar ao histórico
    await addVerificationHistory({
      applicant_id: applicant.id!,
      event_type: 'applicantOnHold',
      old_status: existingApplicant?.current_status,
      new_status: 'onHold',
      webhook_payload: data,
    });

    console.log('✅ Applicant on hold saved:', applicant.id);
  } catch (error) {
    console.error('❌ Failed to save on hold applicant:', error);
  }

  // Enviar notificação para WhatsApp
  const notification = createApplicantOnHoldNotification({
    externalUserId: data.externalUserId,
    verificationType,
    name,
    email,
    document,
  });

  await sendWhatsAppNotification(notification);
}

