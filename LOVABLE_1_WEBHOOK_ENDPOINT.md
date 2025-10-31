# 📥 Parte 1: Criar Endpoint de Webhook para Notificações de Onboarding

## 📋 Contexto

Precisamos criar um endpoint que receberá notificações em tempo real sobre verificações KYC/KYB de clientes vindas do nosso sistema de onboarding externo (Sumsub).

## 🎯 Objetivo

Criar um endpoint POST que:
1. Receba payloads JSON com informações de onboarding
2. Valide os dados recebidos
3. Prepare para processamento (salvar no banco e enviar para WhatsApp)

## 🔧 Implementação

### Endpoint a ser criado:

**URL:** `/api/webhooks/onboarding-notifications`  
**Método:** `POST`  
**Content-Type:** `application/json`

### TypeScript Interface:

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

## ✅ Validação Necessária

O endpoint deve validar que o payload contém os campos obrigatórios:

**Campos obrigatórios:**
- `event` (string)
- `timestamp` (string ISO 8601)
- `applicant.id` (string)
- `applicant.type` (string: 'individual' ou 'company')
- `status` (string)
- `whatsapp_message` (string)

**Validação de tipos:**
- `event` deve ser um dos valores: 'applicant_created', 'applicant_pending', 'applicant_reviewed', 'applicant_on_hold'
- `applicant.type` deve ser 'individual' ou 'company'
- `status` deve ser um dos valores: 'created', 'pending', 'approved', 'rejected', 'on_hold', 'under_review'

## 📤 Respostas HTTP

O endpoint deve retornar:

- **200 OK** - Notificação processada com sucesso
  ```json
  { "success": true, "message": "Notification processed successfully" }
  ```

- **400 Bad Request** - Payload inválido
  ```json
  { "success": false, "error": "Invalid payload", "details": "Missing required field: event" }
  ```

- **500 Internal Server Error** - Erro ao processar
  ```json
  { "success": false, "error": "Internal server error" }
  ```

## 🧪 Como Testar

Após criar o endpoint, teste com este curl:

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
    "whatsapp_message": "✅ *TESTE DE WEBHOOK*\n\n*Nome:* Teste da Silva\n*Status:* Aprovado"
  }'
```

## 📝 Checklist

- [ ] Criar rota POST `/api/webhooks/onboarding-notifications`
- [ ] Criar interface TypeScript `OnboardingNotification`
- [ ] Implementar validação de campos obrigatórios
- [ ] Implementar validação de tipos/valores permitidos
- [ ] Retornar respostas HTTP apropriadas
- [ ] Adicionar tratamento de erros
- [ ] Adicionar logs para debug

## 💡 Observação

Por enquanto, apenas crie o endpoint e a validação. Nos próximos passos vamos:
1. Criar a tabela no banco de dados para salvar as notificações
2. Implementar o envio para WhatsApp via Maytapi

---

**Pode começar a implementação do endpoint?**

