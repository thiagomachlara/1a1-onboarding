# 🤖 PARTE 1: Webhook de Onboarding + Integração Maytapi

**Cole este prompt no Lovable.dev:**

---

Preciso implementar um **webhook endpoint** para receber notificações em tempo real sobre verificações KYC/KYB de clientes e enviar essas notificações para um grupo específico do WhatsApp via **Maytapi**.

## 📋 Contexto

Temos um sistema externo de onboarding de clientes (verificação KYC/KYB via Sumsub) que envia notificações sobre cada etapa do processo. Precisamos:

1. Receber essas notificações via webhook
2. Processar as informações
3. Enviar mensagens formatadas para o WhatsApp usando a API do Maytapi

## 🎯 O que precisa ser feito

### 1. Criar Endpoint de Webhook

**URL:** `/api/webhooks/onboarding-notifications`  
**Método:** `POST`  
**Content-Type:** `application/json`

### 2. Integração com Maytapi

**Informações importantes:**
- Já usamos Maytapi no sistema para WhatsApp
- O grupo já existe e está tagueado como "interno" na aba "Gestão"
- **Group ID:** `120363420918764713@g.us`
- **Nome do Grupo:** "1A1 - Onboardings"

## 📦 Estrutura do Payload que vamos receber

```typescript
interface OnboardingNotification {
  event: 'applicant_created' | 'applicant_pending' | 'applicant_reviewed' | 'applicant_on_hold';
  timestamp: string; // ISO 8601 format
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
  whatsapp_message: string; // Mensagem já formatada com emojis
  metadata?: Record<string, any>;
}
```

## 📝 Exemplos de Payloads

### Exemplo 1: Novo onboarding iniciado
```json
{
  "event": "applicant_created",
  "timestamp": "2025-10-30T20:45:00.000Z",
  "applicant": {
    "id": "individual_1730323500_abc123",
    "type": "individual"
  },
  "status": "created",
  "message": "Novo onboarding iniciado",
  "whatsapp_message": "🆕 *NOVO ONBOARDING INICIADO*\n\n*Tipo:* Pessoa Física\n*ID:* individual_1730323500_abc123\n*Data:* 30/10/2025 20:45\n\n*Status:* 📋 Criado"
}
```

### Exemplo 2: Onboarding aprovado
```json
{
  "event": "applicant_reviewed",
  "timestamp": "2025-10-30T21:00:00.000Z",
  "applicant": {
    "id": "individual_1730323500_abc123",
    "type": "individual",
    "name": "João Silva",
    "email": "joao.silva@example.com",
    "document": "123.456.789-00"
  },
  "status": "approved",
  "reviewAnswer": "GREEN",
  "message": "Onboarding aprovado",
  "whatsapp_message": "✅ *ONBOARDING APROVADO*\n\n*Tipo:* Pessoa Física\n*Nome:* João Silva\n*CPF:* 123.456.789-00\n*Email:* joao.silva@example.com\n*ID:* individual_1730323500_abc123\n*Data:* 30/10/2025 21:00\n\n*Status:* ✅ Aprovado\n\n✅ O cliente foi aprovado e já pode negociar USDT!"
}
```

### Exemplo 3: Onboarding rejeitado
```json
{
  "event": "applicant_reviewed",
  "timestamp": "2025-10-30T21:15:00.000Z",
  "applicant": {
    "id": "company_1730323600_xyz789",
    "type": "company",
    "name": "Empresa XYZ Ltda",
    "email": "contato@empresaxyz.com.br",
    "document": "12.345.678/0001-90"
  },
  "status": "rejected",
  "reviewAnswer": "RED",
  "message": "Onboarding rejeitado",
  "whatsapp_message": "❌ *ONBOARDING REJEITADO*\n\n*Tipo:* Pessoa Jurídica\n*Nome:* Empresa XYZ Ltda\n*CNPJ:* 12.345.678/0001-90\n*Email:* contato@empresaxyz.com.br\n*ID:* company_1730323600_xyz789\n*Data:* 30/10/2025 21:15\n\n*Status:* ❌ Rejeitado\n\n❌ O onboarding foi rejeitado. Verifique os motivos no dashboard."
}
```

## 🔧 Implementação Necessária

### Passo 1: Criar o Endpoint

Criar endpoint `POST /api/webhooks/onboarding-notifications` que:
1. Recebe o payload JSON
2. Valida os campos obrigatórios
3. Salva a notificação no banco de dados (para histórico)
4. Envia mensagem para o WhatsApp via Maytapi

### Passo 2: Validação do Payload

Validar que existem os campos obrigatórios:
- `event`
- `timestamp`
- `applicant.id`
- `applicant.type`
- `status`
- `whatsapp_message`

### Passo 3: Salvar no Banco de Dados

Criar tabela `onboarding_notifications` com os campos:
- `id` (UUID, primary key)
- `event` (string)
- `applicant_id` (string)
- `applicant_type` (string: 'individual' ou 'company')
- `applicant_name` (string, nullable)
- `applicant_email` (string, nullable)
- `applicant_document` (string, nullable)
- `status` (string)
- `review_answer` (string, nullable)
- `message` (text)
- `whatsapp_message` (text)
- `payload` (jsonb - payload completo)
- `sent_to_whatsapp` (boolean, default false)
- `whatsapp_sent_at` (timestamp, nullable)
- `created_at` (timestamp, default now)

### Passo 4: Enviar para WhatsApp via Maytapi

Usar a integração Maytapi que já existe no sistema para enviar mensagem:

**Informações importantes:**
- **Group ID:** `120363420918764713@g.us`
- **Mensagem:** Usar o campo `whatsapp_message` do payload (já vem formatado)

**Exemplo de código (adapte conforme sua implementação atual do Maytapi):**

```typescript
// Enviar mensagem para o grupo via Maytapi
await sendMaytapiMessage({
  to: '120363420918764713@g.us', // Group ID do grupo "1A1 - Onboardings"
  message: notification.whatsapp_message,
  type: 'text'
});
```

### Passo 5: Retornar Resposta HTTP

- **200 OK** - Notificação processada com sucesso
- **400 Bad Request** - Payload inválido
- **500 Internal Server Error** - Erro ao processar

## 📱 Tipos de Eventos

O webhook receberá 4 tipos de eventos:

1. **`applicant_created`** - Novo onboarding iniciado
2. **`applicant_pending`** - Documentos enviados para análise
3. **`applicant_reviewed`** - Verificação concluída (aprovado/rejeitado/em revisão)
4. **`applicant_on_hold`** - Onboarding em espera (precisa de ação)

## 💡 Observações Importantes

- O campo `whatsapp_message` já vem **completamente formatado** com emojis, negrito (`*texto*`) e quebras de linha
- Você só precisa **pegar esse campo e enviar para o grupo do WhatsApp**
- O grupo **"1A1 - Onboardings"** já está criado e tagueado como "interno" na aba "Gestão"
- Use a mesma função/método de envio do Maytapi que já existe no sistema
- Salve todas as notificações no banco para histórico (vamos criar uma dashboard depois)

## ✅ Checklist de Implementação

- [ ] Criar endpoint POST `/api/webhooks/onboarding-notifications`
- [ ] Criar tabela `onboarding_notifications` no banco de dados
- [ ] Validar campos obrigatórios do payload
- [ ] Salvar notificação no banco de dados
- [ ] Extrair `whatsapp_message` do payload
- [ ] Enviar mensagem para o grupo via Maytapi (Group ID: `120363420918764713@g.us`)
- [ ] Marcar `sent_to_whatsapp = true` e `whatsapp_sent_at` após envio
- [ ] Retornar resposta HTTP apropriada
- [ ] Adicionar tratamento de erros
- [ ] Adicionar logs para debug

## 🧪 Como Testar

Após implementar, você pode testar com este curl (ou Postman):

```bash
curl -X POST http://localhost:5000/api/webhooks/onboarding-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "event": "applicant_reviewed",
    "timestamp": "2025-10-30T21:00:00.000Z",
    "applicant": {
      "id": "individual_test_123",
      "type": "individual",
      "name": "Teste da Silva",
      "email": "teste@example.com",
      "document": "000.000.000-00"
    },
    "status": "approved",
    "reviewAnswer": "GREEN",
    "message": "Onboarding aprovado",
    "whatsapp_message": "✅ *TESTE DE WEBHOOK*\n\n*Nome:* Teste da Silva\n*CPF:* 000.000.000-00\n*Status:* Aprovado\n\nSe você recebeu esta mensagem no grupo WhatsApp, o webhook está funcionando!"
  }'
```

**Resultado esperado:** Mensagem deve aparecer no grupo "1A1 - Onboardings" do WhatsApp.

## 🎯 Resultado Esperado

Quando o webhook receber uma notificação, deve:
1. ✅ Validar o payload
2. ✅ Salvar no banco de dados
3. ✅ Enviar mensagem formatada para o grupo do WhatsApp
4. ✅ Retornar sucesso (200 OK)

---

**Pode começar a implementação?** Após concluir esta parte, vou enviar a **Parte 2** para criar a interface/dashboard de visualização das notificações.

