/**
 * Utilitário para enviar notificações de onboarding para o webhook do WhatsApp
 */

const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

export interface OnboardingNotification {
  event: 'applicant_created' | 'applicant_pending' | 'applicant_reviewed' | 'applicant_on_hold';
  timestamp: string;
  applicant: {
    id: string;
    type: 'individual' | 'company';
    name?: string;
    email?: string;
    document?: string; // CPF ou CNPJ
  };
  status: 'created' | 'pending' | 'approved' | 'rejected' | 'on_hold' | 'under_review';
  reviewAnswer?: 'GREEN' | 'RED' | 'YELLOW';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Formata mensagem para WhatsApp com emojis e formatação
 */
function formatWhatsAppMessage(notification: OnboardingNotification): string {
  const { event, applicant, status, reviewAnswer } = notification;
  
  // Emoji baseado no status
  let emoji = '📋';
  if (status === 'approved') emoji = '✅';
  if (status === 'rejected') emoji = '❌';
  if (status === 'pending') emoji = '⏳';
  if (status === 'on_hold') emoji = '⚠️';
  if (status === 'under_review') emoji = '🔍';

  // Título baseado no evento
  let title = '';
  switch (event) {
    case 'applicant_created':
      title = '🆕 *NOVO ONBOARDING INICIADO*';
      break;
    case 'applicant_pending':
      title = '⏳ *DOCUMENTOS ENVIADOS*';
      break;
    case 'applicant_reviewed':
      if (reviewAnswer === 'GREEN') {
        title = '✅ *ONBOARDING APROVADO*';
      } else if (reviewAnswer === 'RED') {
        title = '❌ *ONBOARDING REJEITADO*';
      } else {
        title = '🔍 *ONBOARDING EM REVISÃO*';
      }
      break;
    case 'applicant_on_hold':
      title = '⚠️ *ONBOARDING EM ESPERA*';
      break;
  }

  // Tipo de cliente
  const tipoCliente = applicant.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';

  // Montar mensagem
  let message = `${title}\n\n`;
  message += `*Tipo:* ${tipoCliente}\n`;
  
  if (applicant.name) {
    message += `*Nome:* ${applicant.name}\n`;
  }
  
  if (applicant.document) {
    const docLabel = applicant.type === 'individual' ? 'CPF' : 'CNPJ';
    message += `*${docLabel}:* ${applicant.document}\n`;
  }
  
  if (applicant.email) {
    message += `*Email:* ${applicant.email}\n`;
  }
  
  message += `*ID:* ${applicant.id}\n`;
  message += `*Data:* ${new Date(notification.timestamp).toLocaleString('pt-BR')}\n`;
  
  // Status detalhado
  message += `\n*Status:* ${emoji} ${getStatusLabel(status)}\n`;
  
  // Informações adicionais baseadas no status
  if (status === 'approved') {
    message += `\n✅ O cliente foi aprovado e já pode negociar USDT!`;
  } else if (status === 'rejected') {
    message += `\n❌ O onboarding foi rejeitado. Verifique os motivos no dashboard.`;
  } else if (status === 'pending') {
    message += `\n⏳ Aguardando análise da equipe de compliance.`;
  } else if (status === 'under_review') {
    message += `\n🔍 Documentos em análise. Pode ser necessário solicitar documentos adicionais.`;
  }

  return message;
}

/**
 * Retorna label amigável para o status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    created: 'Criado',
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    on_hold: 'Em Espera',
    under_review: 'Em Revisão',
  };
  return labels[status] || status;
}

/**
 * Envia notificação para o webhook do WhatsApp com retry
 */
export async function sendWhatsAppNotification(
  notification: OnboardingNotification,
  retryCount = 0
): Promise<{ success: boolean; error?: string }> {
  // Verificar se webhook está configurado
  if (!WHATSAPP_WEBHOOK_URL) {
    console.warn('WHATSAPP_WEBHOOK_URL not configured, skipping notification');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    // Formatar mensagem para WhatsApp
    const whatsappMessage = formatWhatsAppMessage(notification);

    // Payload para enviar ao webhook
    const payload = {
      ...notification,
      whatsapp_message: whatsappMessage,
    };

    // Fazer requisição para o webhook
    const response = await fetch(WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}`);
    }

    console.log('WhatsApp notification sent successfully:', notification.event);
    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return sendWhatsAppNotification(notification, retryCount + 1);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cria notificação para aplicante criado
 */
export function createApplicantCreatedNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
}): OnboardingNotification {
  return {
    event: 'applicant_created',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
    },
    status: 'created',
    message: 'Novo onboarding iniciado',
  };
}

/**
 * Cria notificação para aplicante pendente
 */
export function createApplicantPendingNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
}): OnboardingNotification {
  return {
    event: 'applicant_pending',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      email: data.email,
      document: data.document,
    },
    status: 'pending',
    message: 'Documentos enviados para análise',
  };
}

/**
 * Cria notificação para aplicante revisado
 */
export function createApplicantReviewedNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
  reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
  reviewStatus?: string;
}): OnboardingNotification {
  let status: OnboardingNotification['status'];
  
  if (data.reviewAnswer === 'GREEN') {
    status = 'approved';
  } else if (data.reviewAnswer === 'RED') {
    status = 'rejected';
  } else {
    status = 'under_review';
  }

  return {
    event: 'applicant_reviewed',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      email: data.email,
      document: data.document,
    },
    status,
    reviewAnswer: data.reviewAnswer,
    message: `Onboarding ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'em revisão'}`,
  };
}

/**
 * Cria notificação para aplicante em espera
 */
export function createApplicantOnHoldNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
}): OnboardingNotification {
  return {
    event: 'applicant_on_hold',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      email: data.email,
      document: data.document,
    },
    status: 'on_hold',
    message: 'Onboarding em espera - ação necessária',
  };
}

