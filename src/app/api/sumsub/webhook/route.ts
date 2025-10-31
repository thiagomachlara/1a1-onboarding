import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;

/**
 * Verifica a assinatura do webhook do Sumsub
 */
function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
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
  
  // TODO: Salvar no Supabase
  // - Criar registro na tabela de verificações
  // - Status: 'created'
  // - Timestamp de criação
}

/**
 * Handler para evento applicantPending
 */
async function handleApplicantPending(data: any) {
  console.log('Applicant pending:', data.externalUserId);
  
  // TODO: Atualizar no Supabase
  // - Status: 'pending'
  // - Timestamp de submissão
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

  // TODO: Atualizar no Supabase
  // - Status: reviewResult.reviewAnswer (GREEN, RED, etc.)
  // - reviewStatus: reviewStatus (completed, etc.)
  // - Timestamp de revisão
  // - Detalhes da revisão

  // TODO: Enviar e-mail de notificação
  // - Se aprovado (GREEN): e-mail de boas-vindas
  // - Se rejeitado (RED): e-mail explicando motivo
  // - Se precisa de revisão: e-mail solicitando documentos adicionais
}

/**
 * Handler para evento applicantOnHold
 */
async function handleApplicantOnHold(data: any) {
  console.log('Applicant on hold:', data.externalUserId);
  
  // TODO: Atualizar no Supabase
  // - Status: 'on_hold'
  // - Timestamp
  // - Motivo (se disponível)
}

