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
 * Extrai tipo de verificação do externalUserId
 */
function extractVerificationType(externalUserId: string): 'individual' | 'company' {
  // Novo formato com CPF/CNPJ
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
  
  const verificationType = extractVerificationType(data.externalUserId);
  const documentNumber = extractDocumentFromExternalUserId(data.externalUserId);

  // Salvar no Supabase
  try {
    const applicantData: Applicant = {
      external_user_id: data.externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: 'created',
      document_number: documentNumber || undefined,
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
  
  const verificationType = extractVerificationType(data.externalUserId);

  // Extrair informações do applicant (se disponível)
  const applicantInfo = data.applicantInfo || {};
  const name = applicantInfo.firstName 
    ? `${applicantInfo.firstName} ${applicantInfo.lastName || ''}`.trim()
    : undefined;
  const email = applicantInfo.email;
  const phone = applicantInfo.phone;
  const document = applicantInfo.idDocs?.[0]?.number;

  // Atualizar no Supabase
  try {
    const existingApplicant = await getApplicantByExternalUserId(data.externalUserId);
    
    const applicantData: Applicant = {
      external_user_id: data.externalUserId,
      applicant_id: data.applicantId,
      inspection_id: data.inspectionId,
      applicant_type: verificationType,
      current_status: 'pending',
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

  const verificationType = extractVerificationType(externalUserId);

  // Extrair informações do applicant
  const applicantInfo = data.applicantInfo || {};
  const name = applicantInfo.firstName 
    ? `${applicantInfo.firstName} ${applicantInfo.lastName || ''}`.trim()
    : undefined;
  const email = applicantInfo.email;
  const phone = applicantInfo.phone;
  const document = applicantInfo.idDocs?.[0]?.number;

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

  // Enviar notificação para WhatsApp
  const notification = createApplicantReviewedNotification({
    externalUserId,
    verificationType,
    name,
    email,
    document,
    reviewAnswer: reviewAnswer as 'GREEN' | 'RED' | 'YELLOW',
    reviewStatus,
  });

  await sendWhatsAppNotification(notification);
}

/**
 * Handler para evento applicantOnHold
 */
async function handleApplicantOnHold(data: any) {
  console.log('Applicant on hold:', data.externalUserId);
  
  const verificationType = extractVerificationType(data.externalUserId);

  // Extrair informações do applicant
  const applicantInfo = data.applicantInfo || {};
  const name = applicantInfo.firstName 
    ? `${applicantInfo.firstName} ${applicantInfo.lastName || ''}`.trim()
    : undefined;
  const email = applicantInfo.email;
  const phone = applicantInfo.phone;
  const document = applicantInfo.idDocs?.[0]?.number;

  // Atualizar no Supabase
  try {
    const existingApplicant = await getApplicantByExternalUserId(data.externalUserId);
    
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

