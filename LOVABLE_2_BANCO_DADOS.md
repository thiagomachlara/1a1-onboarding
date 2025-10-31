# 💾 Parte 2: Criar Tabela no Banco de Dados para Notificações

## 📋 Contexto

Agora que temos o endpoint criado, precisamos salvar todas as notificações recebidas no banco de dados para:
1. Manter histórico completo de todas as notificações
2. Permitir consultas e relatórios
3. Criar uma dashboard de visualização (próxima etapa)

## 🎯 Objetivo

Criar uma tabela `onboarding_notifications` que armazene todas as notificações recebidas do sistema de onboarding.

## 🗄️ Estrutura da Tabela

### Tabela: `onboarding_notifications`

```sql
CREATE TABLE onboarding_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações do evento
  event VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Informações do aplicante
  applicant_id VARCHAR(255) NOT NULL,
  applicant_type VARCHAR(20) NOT NULL CHECK (applicant_type IN ('individual', 'company')),
  applicant_name VARCHAR(255),
  applicant_email VARCHAR(255),
  applicant_document VARCHAR(50),
  
  -- Status da verificação
  status VARCHAR(50) NOT NULL,
  review_answer VARCHAR(20),
  
  -- Mensagens
  message TEXT NOT NULL,
  whatsapp_message TEXT NOT NULL,
  
  -- Payload completo (para referência)
  payload JSONB NOT NULL,
  
  -- Controle de envio para WhatsApp
  sent_to_whatsapp BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_error TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_onboarding_notifications_applicant_id ON onboarding_notifications(applicant_id);
CREATE INDEX idx_onboarding_notifications_status ON onboarding_notifications(status);
CREATE INDEX idx_onboarding_notifications_event ON onboarding_notifications(event);
CREATE INDEX idx_onboarding_notifications_created_at ON onboarding_notifications(created_at DESC);
CREATE INDEX idx_onboarding_notifications_sent_to_whatsapp ON onboarding_notifications(sent_to_whatsapp);
```

## 📊 Campos da Tabela

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | ID único da notificação |
| `event` | VARCHAR(50) | Sim | Tipo do evento (applicant_created, applicant_pending, etc.) |
| `timestamp` | TIMESTAMP | Sim | Data/hora do evento (vem do payload) |
| `applicant_id` | VARCHAR(255) | Sim | ID único do aplicante |
| `applicant_type` | VARCHAR(20) | Sim | Tipo: 'individual' ou 'company' |
| `applicant_name` | VARCHAR(255) | Não | Nome completo ou razão social |
| `applicant_email` | VARCHAR(255) | Não | Email do aplicante |
| `applicant_document` | VARCHAR(50) | Não | CPF ou CNPJ |
| `status` | VARCHAR(50) | Sim | Status atual (created, pending, approved, rejected, etc.) |
| `review_answer` | VARCHAR(20) | Não | Resultado da revisão (GREEN, RED, YELLOW) |
| `message` | TEXT | Sim | Mensagem resumida do evento |
| `whatsapp_message` | TEXT | Sim | Mensagem formatada para WhatsApp |
| `payload` | JSONB | Sim | Payload completo recebido (para referência) |
| `sent_to_whatsapp` | BOOLEAN | Sim | Se a mensagem foi enviada para o WhatsApp |
| `whatsapp_sent_at` | TIMESTAMP | Não | Data/hora do envio para WhatsApp |
| `whatsapp_error` | TEXT | Não | Mensagem de erro caso o envio falhe |
| `created_at` | TIMESTAMP | Sim | Data/hora de criação do registro |
| `updated_at` | TIMESTAMP | Sim | Data/hora da última atualização |

## 💻 Implementação no Código

### Criar função para salvar notificação:

```typescript
async function saveNotification(notification: OnboardingNotification) {
  const result = await db.query(`
    INSERT INTO onboarding_notifications (
      event,
      timestamp,
      applicant_id,
      applicant_type,
      applicant_name,
      applicant_email,
      applicant_document,
      status,
      review_answer,
      message,
      whatsapp_message,
      payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    notification.event,
    notification.timestamp,
    notification.applicant.id,
    notification.applicant.type,
    notification.applicant.name || null,
    notification.applicant.email || null,
    notification.applicant.document || null,
    notification.status,
    notification.reviewAnswer || null,
    notification.message,
    notification.whatsapp_message,
    JSON.stringify(notification)
  ]);
  
  return result.rows[0].id;
}
```

### Atualizar após envio para WhatsApp:

```typescript
async function markAsSentToWhatsApp(notificationId: string, success: boolean, error?: string) {
  await db.query(`
    UPDATE onboarding_notifications
    SET 
      sent_to_whatsapp = $1,
      whatsapp_sent_at = NOW(),
      whatsapp_error = $2,
      updated_at = NOW()
    WHERE id = $3
  `, [success, error || null, notificationId]);
}
```

## 🔄 Fluxo de Processamento

1. **Receber webhook** → Validar payload
2. **Salvar no banco** → Criar registro na tabela
3. **Enviar para WhatsApp** → Usar Maytapi (próximo passo)
4. **Atualizar registro** → Marcar como enviado ou registrar erro

## 📝 Checklist

- [ ] Criar tabela `onboarding_notifications` no banco de dados
- [ ] Criar índices para performance
- [ ] Implementar função `saveNotification()`
- [ ] Implementar função `markAsSentToWhatsApp()`
- [ ] Integrar salvamento no endpoint do webhook
- [ ] Testar inserção de dados

## 🧪 Como Testar

Após criar a tabela e as funções, teste inserindo uma notificação:

```typescript
const testNotification = {
  event: 'applicant_created',
  timestamp: new Date().toISOString(),
  applicant: {
    id: 'test_123',
    type: 'individual'
  },
  status: 'created',
  message: 'Teste',
  whatsapp_message: 'Teste de mensagem'
};

const notificationId = await saveNotification(testNotification);
console.log('Notification saved with ID:', notificationId);
```

Depois verifique no banco:

```sql
SELECT * FROM onboarding_notifications ORDER BY created_at DESC LIMIT 1;
```

---

**Após implementar esta parte, vamos para a Parte 3: Integração com Maytapi para enviar as mensagens para o WhatsApp!**

