/**
 * Utilitário para enviar notificações de onboarding para o webhook do WhatsApp
 */

const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

export interface OnboardingNotification {
  event: 'applicant_created' | 'applicant_pending' | 'applicant_reviewed' | 'applicant_on_hold' | 'contract_signed' | 'wallet_registered';
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
  rejectionReason?: string; // Motivos de rejeição (rejectLabels)
  message: string;
  contractLink?: string; // Magic link para assinatura de contrato
  walletLink?: string; // Magic link para cadastro de wallet
  sumsubReportUrl?: string; // Link para Summary Report PDF do Sumsub
  walletAddress?: string; // Endereço da wallet cadastrada
  metadata?: Record<string, any>;
}

/**
 * Formata cabeçalho padrão da mensagem
 */
function buildHeader(notification: OnboardingNotification): string {
  const { applicant, timestamp } = notification;
  const tipoCliente = applicant.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';
  const docLabel = applicant.type === 'individual' ? 'CPF' : 'CNPJ';
  
  let message = `${getEventTitle(notification)}\n\n`;
  message += `*Tipo:* ${tipoCliente}\n`;
  
  if (applicant.name) {
    message += `*Nome:* ${applicant.name}\n`;
  }
  
  if (applicant.document) {
    message += `*${docLabel}:* ${applicant.document}\n`;
  }
  
  message += `*Data:* ${new Date(timestamp).toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  })}\n`;
  
  return message;
}

/**
 * Retorna título baseado no evento
 */
function getEventTitle(notification: OnboardingNotification): string {
  const { event, reviewAnswer } = notification;
  
  switch (event) {
    case 'applicant_created':
      return '🆕 *NOVO ONBOARDING INICIADO*';
    case 'applicant_pending':
      return '⏳ *DOCUMENTOS ENVIADOS*';
    case 'applicant_reviewed':
      if (reviewAnswer === 'GREEN') {
        return '✅ *ONBOARDING APROVADO*';
      } else if (reviewAnswer === 'RED') {
        return '❌ *ONBOARDING REJEITADO*';
      } else {
        return '🔍 *ONBOARDING EM REVISÃO*';
      }
    case 'applicant_on_hold':
      return '⚠️ *ONBOARDING EM ESPERA*';
    case 'contract_signed':
      return '✅ *CONTRATO ASSINADO*';
    case 'wallet_registered':
      return '💼 *WALLET CADASTRADA*';
    default:
      return '📋 *NOTIFICAÇÃO*';
  }
}

/**
 * Mensagem para onboarding aprovado
 */
function buildApplicantApprovedMessage(notification: OnboardingNotification): string {
  let message = `\n✅ Cliente aprovado e pode negociar USDT!\n`;
  
  // Link do Summary Report
  if (notification.sumsubReportUrl) {
    message += `\n📄 *Dossiê completo (Sumsub):*`;
    message += `\n${notification.sumsubReportUrl}`;
  }
  
  // Link de contrato
  if (notification.contractLink) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n📄 *PRÓXIMA ETAPA: CONTRATO*`;
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n\n👉 *Link para assinatura:*`;
    message += `\n${notification.contractLink}`;
    message += `\n\n⏰ *Válido por:* 7 dias`;
    message += `\n\n💬 Copie e envie o link para o cliente.`;
  }
  
  return message;
}

/**
 * Mensagem para onboarding rejeitado
 */
function buildApplicantRejectedMessage(notification: OnboardingNotification): string {
  let message = `\n❌ Onboarding foi rejeitado.\n`;
  
  // Motivos de rejeição
  if (notification.rejectionReason) {
    message += `\n📝 *Motivos da rejeição:*`;
    
    const reasons = notification.rejectionReason.split(', ').map(reason => {
      const translations: Record<string, string> = {
        'DOCUMENT_TEMPLATE': '📄 Documento não corresponde ao template',
        'COMPROMISED_PERSONS': '⚠️ Pessoa comprometida (PEP, sanções)',
        'FRAUDULENT_PATTERNS': '🚫 Padrões fraudulentos detectados',
        'SPAM': '🚫 Spam ou tentativa de fraude',
        'GRAPHIC_EDITOR': '✏️ Documento editado digitalmente',
        'FOREIGNER': '🌍 Estrangeiro (fora da jurisdição)',
        'BLACKLIST': '⛔ Presente em lista negra',
        'SELFIE_MISMATCH': '🤳 Selfie não corresponde ao documento',
        'ID_INVALID': '🆔 Documento inválido ou expirado',
        'PROBLEMATIC_APPLICANT_DATA': '⚠️ Dados problemáticos',
        'ADDITIONAL_DOCUMENT_REQUIRED': '📄 Documento adicional necessário',
        'AGE_REQUIREMENT_MISMATCH': '📅 Idade não atende requisitos',
        'DOCUMENT_PAGE_MISSING': '📄 Página do documento faltando',
        'DOCUMENT_DAMAGED': '💥 Documento danificado ou ilegível',
        'REGULATIONS_VIOLATIONS': '⚠️ Violações regulatórias',
        'INCONSISTENT_PROFILE': '🔄 Perfil inconsistente',
        'PROOF_OF_ADDRESS_INVALID': '🏠 Comprovante de endereço inválido',
      };
      
      return translations[reason] || `• ${reason}`;
    });
    
    message += `\n${reasons.join('\n')}`;
  }
  
  // Link do Summary Report
  if (notification.sumsubReportUrl) {
    message += `\n\n📄 *Dossiê completo (Sumsub):*`;
    message += `\n${notification.sumsubReportUrl}`;
  }
  
  message += `\n\n💬 Entrar em contato com o cliente.`;
  
  return message;
}

/**
 * Mensagem para documentos pendentes
 */
function buildApplicantPendingMessage(notification: OnboardingNotification): string {
  let message = `\n⏳ Aguardando análise de compliance.\n`;
  
  // Link do Summary Report
  if (notification.sumsubReportUrl) {
    message += `\n📄 *Dossiê completo (Sumsub):*`;
    message += `\n${notification.sumsubReportUrl}`;
  }
  
  message += `\n\n💬 Revisar documentos e aprovar/rejeitar.`;
  
  return message;
}

/**
 * Mensagem para contrato assinado
 */
function buildContractSignedMessage(notification: OnboardingNotification): string {
  let message = `\n✅ Contrato assinado com sucesso!\n`;
  
  // Link de wallet
  if (notification.walletLink) {
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n💼 *PRÓXIMA ETAPA: WALLET*`;
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n\n👉 *Link para cadastro:*`;
    message += `\n${notification.walletLink}`;
    message += `\n\n⏰ *Válido por:* 30 dias`;
    message += `\n\n💬 Copie e envie o link para o cliente.`;
  }
  
  return message;
}

/**
 * Mensagem para wallet cadastrada
 */
function buildWalletRegisteredMessage(notification: OnboardingNotification): string {
  let message = '';
  
  // Endereço da wallet
  if (notification.walletAddress) {
    message += `\n💼 *Endereço TRC-20:*`;
    message += `\n\`${notification.walletAddress}\``;
    
    // Screening Chainalysis
    if (notification.metadata?.chainalysisScreening) {
      const screening = notification.metadata.chainalysisScreening;
      message += `\n\n🔍 *Screening Chainalysis:*`;
      
      // Decisão
      let decisionEmoji = '✅';
      let decisionText = 'APROVADA';
      if (screening.decision === 'REJECTED') {
        decisionEmoji = '❌';
        decisionText = 'REJEITADA';
      } else if (screening.decision === 'MANUAL_REVIEW') {
        decisionEmoji = '⚠️';
        decisionText = 'REVISÃO MANUAL';
      }
      message += `\n• Decisão: ${decisionEmoji} ${decisionText}`;
      
      // Nível de risco
      if (screening.riskLevel) {
        let riskEmoji = '🟢';
        if (screening.riskLevel === 'Medium') riskEmoji = '🟡';
        if (screening.riskLevel === 'High' || screening.riskLevel === 'Severe') riskEmoji = '🔴';
        message += `\n• Risco: ${riskEmoji} ${screening.riskLevel}`;
      }
      
      // Sancionada
      if (screening.isSanctioned) {
        message += `\n• ⚠️ WALLET SANCIONADA`;
      }
      
      // Link do PDF
      if (screening.pdfUrl) {
        message += `\n\n📄 *Relatório completo:*`;
        message += `\n${screening.pdfUrl}`;
      }
    }
    
    message += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n✅ *ONBOARDING COMPLETO*`;
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    message += `\n\n🎉 Cliente pronto para negociar!`;
    message += `\n\n💬 Liberar acesso à plataforma OTC.`;
  }
  
  return message;
}

/**
 * Formata mensagem para WhatsApp com emojis e formatação
 */
function formatWhatsAppMessage(notification: OnboardingNotification): string {
  const { event, reviewAnswer } = notification;
  
  // Cabeçalho padrão (sempre)
  let message = buildHeader(notification);
  
  // Mensagem específica por evento
  switch (event) {
    case 'applicant_reviewed':
      if (reviewAnswer === 'GREEN') {
        message += buildApplicantApprovedMessage(notification);
      } else if (reviewAnswer === 'RED') {
        message += buildApplicantRejectedMessage(notification);
      } else {
        message += buildApplicantPendingMessage(notification);
      }
      break;
      
    case 'applicant_pending':
      message += buildApplicantPendingMessage(notification);
      break;
      
    case 'contract_signed':
      message += buildContractSignedMessage(notification);
      break;
      
    case 'wallet_registered':
      message += buildWalletRegisteredMessage(notification);
      break;
      
    case 'applicant_created':
      message += `\n🆕 Novo cliente iniciou o onboarding.`;
      break;
      
    case 'applicant_on_hold':
      message += `\n⚠️ Onboarding em espera. Pode ser necessário solicitar documentos adicionais.`;
      if (notification.sumsubReportUrl) {
        message += `\n\n📄 *Dossiê completo (Sumsub):*`;
        message += `\n${notification.sumsubReportUrl}`;
      }
      break;
  }

  return message;
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
    // Formatar mensagem
    const message = formatWhatsAppMessage(notification);

    // Enviar para webhook
    const response = await fetch(WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        event: notification.event,
        applicantId: notification.applicant.id,
        timestamp: notification.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    console.log('[WHATSAPP] Notification sent successfully:', {
      event: notification.event,
      applicantId: notification.applicant.id,
    });

    return { success: true };
  } catch (error) {
    console.error('[WHATSAPP] Error sending notification:', error);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`[WHATSAPP] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
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
 * Helper functions para criar notificações
 */

export function createApplicantCreatedNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
}): OnboardingNotification {
  return {
    event: 'applicant_created',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      email: data.email,
      document: data.document,
    },
    status: 'created',
    message: 'Novo onboarding iniciado',
  };
}

export function createApplicantPendingNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
  sumsubReportUrl?: string;
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
    sumsubReportUrl: data.sumsubReportUrl,
  };
}

export function createApplicantReviewedNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
  reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
  rejectionReason?: string;
  contractLink?: string;
  sumsubReportUrl?: string;
}): OnboardingNotification {
  let status: 'approved' | 'rejected' | 'under_review' = 'under_review';
  let message = 'Onboarding em revisão';

  if (data.reviewAnswer === 'GREEN') {
    status = 'approved';
    message = 'Onboarding aprovado';
  } else if (data.reviewAnswer === 'RED') {
    status = 'rejected';
    message = 'Onboarding rejeitado';
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
    rejectionReason: data.rejectionReason,
    message,
    contractLink: data.contractLink,
    sumsubReportUrl: data.sumsubReportUrl,
  };
}

export function createApplicantOnHoldNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  email?: string;
  document?: string;
  sumsubReportUrl?: string;
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
    message: 'Onboarding em espera',
    sumsubReportUrl: data.sumsubReportUrl,
  };
}

export function createContractSignedNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  document?: string;
  walletLink?: string;
}): OnboardingNotification {
  return {
    event: 'contract_signed',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      document: data.document,
    },
    status: 'approved',
    message: 'Contrato assinado com sucesso',
    walletLink: data.walletLink, // ✅ Usar walletLink específico
  };
}

export function createWalletRegisteredNotification(data: {
  externalUserId: string;
  verificationType: 'individual' | 'company';
  name?: string;
  document?: string;
  walletAddress?: string;
  metadata?: Record<string, any>;
}): OnboardingNotification {
  return {
    event: 'wallet_registered',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      document: data.document,
    },
    status: 'approved',
    message: 'Wallet cadastrada com sucesso',
    walletAddress: data.walletAddress,
    metadata: data.metadata,
  };
}

export function createWalletScreeningNotification(
  data: {
    externalUserId: string;
    verificationType: 'individual' | 'company';
    name?: string;
    document?: string;
    walletAddress?: string;
  },
  screening: {
    decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    riskLevel?: string;
    isSanctioned?: boolean;
    pdfUrl?: string;
  }
): OnboardingNotification {
  return {
    event: 'wallet_registered',
    timestamp: new Date().toISOString(),
    applicant: {
      id: data.externalUserId,
      type: data.verificationType,
      name: data.name,
      document: data.document,
    },
    status: 'approved',
    message: 'Wallet cadastrada e screening realizado',
    walletAddress: data.walletAddress,
    metadata: {
      chainalysisScreening: screening,
    },
  };
}
