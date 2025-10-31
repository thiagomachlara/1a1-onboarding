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

  // Extrair informações do applicant (usando nova função)
  const name = extractName(data, verificationType);
  const email = data.info?.email || data.email;
  const phone = data.info?.phone || data.phone;
  
  // Extrair documento (diferente para PF e PJ)
  let document: string | undefined;
  if (verificationType === 'company') {
    // Para PJ: buscar CNPJ no companyInfo ou no externalUserId
    document = data.info?.companyInfo?.registrationNumber ||
               data.companyInfo?.registrationNumber ||
               extractDocumentFromExternalUserId(data.externalUserId);
  } else {
    // Para PF: buscar CPF no idDocs ou no externalUserId
    document = data.info?.idDocs?.[0]?.number || 
               data.idDocs?.[0]?.number ||
               extractDocumentFromExternalUserId(data.externalUserId);
  }

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
 * Handler para evento applicantReviewed
 */
async function handleApplicantReviewed(data: any) {
  const { externalUserId, reviewResult, reviewStatus } = data;
  
  console.log('Applicant reviewed:', {
    userId: externalUserId,
    result: reviewResult?.reviewAnswer,
    status: reviewStatus,
  });

  const verificationType = extractVerificationType(data);

  // Extrair informações do applicant (usando nova função)
  let name = extractName(data, verificationType);
  let email = data.info?.email || data.email;
  let phone = data.info?.phone || data.phone;
  let document = data.info?.idDocs?.[0]?.number || data.idDocs?.[0]?.number;
  
  // Buscar dados do banco se não vieram no payload
  const existingApplicant = await getApplicantByExternalUserId(externalUserId);
  if (existingApplicant) {
    name = name || existingApplicant.full_name;
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

  // Enviar notificação para WhatsApp
  const notification = createApplicantReviewedNotification({
    externalUserId,
    verificationType,
    name,
    email,
    document,
    reviewAnswer: reviewAnswer as 'GREEN' | 'RED' | 'YELLOW',
    reviewStatus,
    contractLink, // Adicionar magic link se aprovado
  });

  await sendWhatsAppNotification(notification);
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

