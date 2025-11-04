/**
 * Envia notificação para webhook externo (Lovable)
 */
export async function sendWebhookNotification(payload: any): Promise<void> {
  const webhookUrl = process.env.LOVABLE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[Webhook] URL não configurada, pulando envio');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }

    console.log('[Webhook] Notificação enviada com sucesso');
  } catch (error) {
    console.error('[Webhook] Erro ao enviar notificação:', error);
    throw error;
  }
}
