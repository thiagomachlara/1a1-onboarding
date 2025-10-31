# 🤖 Prompt para Lovable.dev - Webhook de Notificações de Onboarding

**Cole este prompt completo no chat do Lovable.dev:**

---

Preciso que você crie um **webhook endpoint** para receber notificações em tempo real sobre verificações KYC/KYB de clientes e enviar essas notificações via WhatsApp.

## 📋 Contexto

Temos um sistema de onboarding de clientes (KYC/KYB) que envia notificações sobre cada etapa do processo de verificação. Precisamos receber essas notificações e encaminhá-las automaticamente para o WhatsApp.

## 🎯 O que precisa ser feito

1. **Criar um endpoint POST** em `/api/webhooks/onboarding-notifications`
2. **Receber payloads JSON** com informações de onboarding
3. **Processar e enviar para WhatsApp** usando a mensagem pré-formatada que vem no payload

## 📦 Estrutura do Payload que vamos receber

```typescript
interface OnboardingNotification {
  event: 'applicant_created' | 'applicant_pending' | 'applicant_reviewed' | 'applicant_on_hold';
  timestamp: string; // ISO 8601
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
  whatsapp_message: string; // Mensagem já formatada com emojis e quebras de linha
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
    "id": "individual_1730323700_def456",
    "type": "individual",
    "name": "Maria Santos",
    "email": "maria.santos@example.com",
    "document": "987.654.321-00"
  },
  "status": "rejected",
  "reviewAnswer": "RED",
  "message": "Onboarding rejeitado",
  "whatsapp_message": "❌ *ONBOARDING REJEITADO*\n\n*Tipo:* Pessoa Física\n*Nome:* Maria Santos\n*CPF:* 987.654.321-00\n*Email:* maria.santos@example.com\n*ID:* individual_1730323700_def456\n*Data:* 30/10/2025 21:15\n\n*Status:* ❌ Rejeitado\n\n❌ O onboarding foi rejeitado. Verifique os motivos no dashboard."
}
```

## 🔧 Requisitos de Implementação

1. **Endpoint**: `POST /api/webhooks/onboarding-notifications`
2. **Content-Type**: `application/json`
3. **Validação**: Verificar que os campos obrigatórios existem:
   - `event`
   - `timestamp`
   - `applicant.id`
   - `applicant.type`
   - `status`
   - `whatsapp_message`

4. **Processamento**:
   - Extrair o campo `whatsapp_message` do payload
   - Enviar essa mensagem para o WhatsApp (usando a função/método que já existe no bot)
   - Registrar log do evento (opcional mas recomendado)

5. **Resposta HTTP**:
   - `200 OK` - Notificação processada com sucesso
   - `400 Bad Request` - Payload inválido
   - `500 Internal Server Error` - Erro ao processar

## 📱 Tipos de Eventos

O webhook receberá 4 tipos de eventos:

1. **`applicant_created`** - Novo onboarding iniciado
2. **`applicant_pending`** - Documentos enviados para análise
3. **`applicant_reviewed`** - Verificação concluída (aprovado/rejeitado/em revisão)
4. **`applicant_on_hold`** - Onboarding em espera (precisa de ação)

## 💡 Observações Importantes

- O campo `whatsapp_message` já vem **completamente formatado** com emojis, negrito e quebras de linha
- Você só precisa **pegar esse campo e enviar para o WhatsApp**
- O `applicant.type` indica se é:
  - `"individual"` = Pessoa Física
  - `"company"` = Pessoa Jurídica
- O `reviewAnswer` indica o resultado:
  - `"GREEN"` = Aprovado
  - `"RED"` = Rejeitado
  - `"YELLOW"` = Em revisão

## ✅ Checklist

Por favor, implemente:

- [ ] Criar endpoint POST `/api/webhooks/onboarding-notifications`
- [ ] Validar campos obrigatórios do payload
- [ ] Extrair `whatsapp_message` do payload
- [ ] Enviar mensagem para WhatsApp
- [ ] Retornar resposta HTTP apropriada
- [ ] Adicionar tratamento de erros
- [ ] (Opcional) Adicionar logs para debug

## 🧪 Como testar

Após implementar, você pode testar com este curl:

```bash
curl -X POST https://seu-bot.com/api/webhooks/onboarding-notifications \
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
    "whatsapp_message": "✅ *TESTE DE WEBHOOK*\n\n*Nome:* Teste da Silva\n*Status:* Aprovado\n\nSe você recebeu esta mensagem, o webhook está funcionando!"
  }'
```

## 🎯 Resultado Esperado

Quando o webhook receber uma notificação, deve:
1. Validar o payload
2. Extrair a mensagem formatada
3. Enviar para o WhatsApp
4. Retornar sucesso (200 OK)

## 📞 Próximos Passos

Após implementar, me forneça:
1. A **URL completa do endpoint** (ex: `https://seu-bot.com/api/webhooks/onboarding-notifications`)
2. Se houver **autenticação** (token, etc.)
3. Como posso **testar** o endpoint

---

**Pode começar a implementação?** Se tiver alguma dúvida sobre a estrutura do payload ou como processar, me avise!

