# 📱 Parte 3: Enviar Notificações para WhatsApp via Maytapi

## 📋 Contexto

Agora que temos o endpoint criado e as notificações sendo salvas no banco, precisamos enviar as mensagens para o grupo do WhatsApp.

## 🎯 Objetivo

Integrar o webhook com o sistema Maytapi **que já existe no projeto** para enviar automaticamente as notificações de onboarding para um grupo específico do WhatsApp.

## 📱 Informações do Grupo WhatsApp

**Grupo já criado:**
- **Nome:** "1A1 - Onboardings"
- **Group ID:** `120363420918764713@g.us`
- **Localização:** Já está tagueado como "interno" na aba "Gestão" do sistema

## 🔧 Implementação

### O que você precisa fazer:

1. **Identificar a função/método existente** no projeto que envia mensagens via Maytapi
2. **Reutilizar essa função** para enviar as notificações de onboarding
3. **Usar o Group ID fixo:** `120363420918764713@g.us`
4. **Enviar o campo `whatsapp_message`** do payload (já vem formatado)

### Fluxo esperado:

```typescript
// Após salvar no banco de dados:
const notificationId = await saveNotification(notification);

// Enviar para WhatsApp usando a função Maytapi existente:
const whatsappResult = await [SUA_FUNCAO_MAYTAPI_AQUI]({
  to: '120363420918764713@g.us',
  message: notification.whatsapp_message,
  // ... outros parâmetros que sua função precisa
});

// Atualizar status de envio no banco:
await markAsSentToWhatsApp(
  notificationId, 
  whatsappResult.success,
  whatsappResult.error
);
```

## 📊 Tipos de Mensagens

O campo `whatsapp_message` já vem completamente formatado com emojis e quebras de linha. Exemplos:

### 1. Novo Onboarding Iniciado
```
🆕 *NOVO ONBOARDING INICIADO*

*Tipo:* Pessoa Física
*ID:* individual_1730323500_abc123
*Data:* 30/10/2025 20:45

*Status:* 📋 Criado
```

### 2. Onboarding Aprovado
```
✅ *ONBOARDING APROVADO*

*Tipo:* Pessoa Física
*Nome:* João Silva
*CPF:* 123.456.789-00
*Email:* joao.silva@example.com
*ID:* individual_1730323500_abc123
*Data:* 30/10/2025 21:00

*Status:* ✅ Aprovado

✅ O cliente foi aprovado e já pode negociar USDT!
```

### 3. Onboarding Rejeitado
```
❌ *ONBOARDING REJEITADO*

*Tipo:* Pessoa Jurídica
*Nome:* Empresa XYZ Ltda
*CNPJ:* 12.345.678/0001-90
*Email:* contato@empresaxyz.com.br
*ID:* company_1730323600_xyz789
*Data:* 30/10/2025 21:15

*Status:* ❌ Rejeitado

❌ O onboarding foi rejeitado. Verifique os motivos no dashboard.
```

## 💡 Observações Importantes

1. **Mensagem pré-formatada:** O campo `whatsapp_message` já vem completamente formatado. Você só precisa enviá-lo.

2. **Group ID fixo:** Sempre use `120363420918764713@g.us` como destinatário.

3. **Tratamento de erros:** Se o envio falhar, salve o erro no campo `whatsapp_error` da tabela, mas retorne sucesso (200 OK) para o webhook externo não ficar tentando reenviar.

4. **Função existente:** Use a mesma função/método que já é usado em outras partes do sistema para enviar mensagens via Maytapi. Não crie uma nova implementação.

## 🔄 Fluxo Completo Atualizado

Atualize o endpoint do webhook para incluir o envio para WhatsApp:

```typescript
// Pseudocódigo - adapte conforme sua arquitetura

POST /webhook-onboarding-notifications:
  1. Validar payload ✅ (já implementado)
  2. Salvar no banco ✅ (já implementado)
  3. Enviar para WhatsApp ⬅️ NOVO
     - Usar função Maytapi existente
     - Group ID: 120363420918764713@g.us
     - Mensagem: notification.whatsapp_message
  4. Atualizar status de envio ⬅️ NOVO
  5. Retornar sucesso
```

## 📝 Checklist

- [ ] Identificar função/método Maytapi existente no projeto
- [ ] Integrar chamada da função no fluxo do webhook
- [ ] Usar Group ID correto: `120363420918764713@g.us`
- [ ] Enviar campo `whatsapp_message` do payload
- [ ] Atualizar campo `sent_to_whatsapp` no banco após envio
- [ ] Atualizar campo `whatsapp_sent_at` com timestamp
- [ ] Salvar erro em `whatsapp_error` se falhar
- [ ] Testar envio end-to-end

## 🧪 Como Testar

Após implementar, teste enviando um payload completo:

```bash
curl -X POST [SUA_URL]/webhook-onboarding-notifications \
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
    "whatsapp_message": "✅ *TESTE DE WEBHOOK*\n\n*Nome:* Teste da Silva\n*CPF:* 000.000.000-00\n*Status:* Aprovado\n\nSe você recebeu esta mensagem no grupo WhatsApp '\''1A1 - Onboardings'\'', o webhook está funcionando!"
  }'
```

**Verificações:**
1. ✅ Mensagem apareceu no grupo "1A1 - Onboardings"?
2. ✅ Registro no banco tem `sent_to_whatsapp = true`?
3. ✅ Campo `whatsapp_sent_at` foi preenchido?

## 🎯 Resultado Esperado

Após implementar, o fluxo completo será:

1. ✅ Sistema externo envia notificação → Webhook
2. ✅ Webhook valida payload
3. ✅ Webhook salva no banco de dados
4. ✅ Webhook envia para grupo WhatsApp "1A1 - Onboardings" ⬅️ NOVO
5. ✅ Webhook atualiza status de envio ⬅️ NOVO
6. ✅ Webhook retorna sucesso (200 OK)

---

**Importante:** Não tente reimplementar a integração Maytapi. Use a função/método que já existe no projeto. Apenas identifique qual é e reutilize com os parâmetros corretos (Group ID e mensagem).

