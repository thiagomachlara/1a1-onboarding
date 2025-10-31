# 📱 Especificação Técnica: Webhook para Notificações de Onboarding via WhatsApp

## 📋 Contexto do Projeto

Este documento descreve a especificação técnica para implementar um **webhook que receberá notificações em tempo real** sobre o status de verificações KYC/KYB (onboarding de clientes) do sistema de onboarding da 1A1 Cripto.

O objetivo é **receber essas notificações e enviá-las automaticamente via WhatsApp** para a equipe de compliance da 1A1 Cripto.

---

## 🎯 Objetivo

Criar um endpoint HTTP (webhook) que:
1. Receba payloads JSON com informações de onboarding
2. Processe essas informações
3. Envie mensagens formatadas para o WhatsApp

---

## 🔗 Endpoint a ser Criado

**URL:** `https://[SEU_DOMINIO]/api/webhooks/onboarding-notifications`

**Método:** `POST`

**Content-Type:** `application/json`

**Autenticação:** Opcional (pode adicionar um token de segurança no header)

---

## 📦 Estrutura do Payload

O sistema de onboarding enviará um payload JSON com a seguinte estrutura:

```json
{
  "event": "applicant_reviewed",
  "timestamp": "2025-10-30T20:45:00.000Z",
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
  "whatsapp_message": "✅ *ONBOARDING APROVADO*\n\n*Tipo:* Pessoa Física\n*Nome:* João Silva\n*CPF:* 123.456.789-00\n*Email:* joao.silva@example.com\n*ID:* individual_1730323500_abc123\n*Data:* 30/10/2025 20:45\n\n*Status:* ✅ Aprovado\n\n✅ O cliente foi aprovado e já pode negociar USDT!",
  "metadata": {}
}
```

---

## 📊 Tipos de Eventos

O webhook receberá 4 tipos de eventos diferentes:

### 1. **applicant_created** - Novo onboarding iniciado
```json
{
  "event": "applicant_created",
  "status": "created",
  "applicant": {
    "id": "individual_1730323500_abc123",
    "type": "individual"
  }
}
```

### 2. **applicant_pending** - Documentos enviados
```json
{
  "event": "applicant_pending",
  "status": "pending",
  "applicant": {
    "id": "company_1730323600_xyz789",
    "type": "company",
    "name": "Empresa XYZ Ltda",
    "email": "contato@empresaxyz.com.br",
    "document": "12.345.678/0001-90"
  }
}
```

### 3. **applicant_reviewed** - Verificação concluída
```json
{
  "event": "applicant_reviewed",
  "status": "approved",
  "reviewAnswer": "GREEN",
  "applicant": {
    "id": "individual_1730323500_abc123",
    "type": "individual",
    "name": "João Silva",
    "email": "joao.silva@example.com",
    "document": "123.456.789-00"
  }
}
```

**Possíveis valores de `reviewAnswer`:**
- `"GREEN"` - Aprovado
- `"RED"` - Rejeitado
- `"YELLOW"` - Em revisão (precisa de documentos adicionais)

**Possíveis valores de `status`:**
- `"approved"` - Aprovado
- `"rejected"` - Rejeitado
- `"under_review"` - Em revisão

### 4. **applicant_on_hold** - Onboarding em espera
```json
{
  "event": "applicant_on_hold",
  "status": "on_hold",
  "applicant": {
    "id": "company_1730323600_xyz789",
    "type": "company",
    "name": "Empresa XYZ Ltda",
    "email": "contato@empresaxyz.com.br",
    "document": "12.345.678/0001-90"
  }
}
```

---

## 📝 Campos do Payload

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `event` | string | Sim | Tipo do evento: `applicant_created`, `applicant_pending`, `applicant_reviewed`, `applicant_on_hold` |
| `timestamp` | string (ISO 8601) | Sim | Data e hora do evento |
| `applicant.id` | string | Sim | ID único do aplicante (formato: `individual_*` ou `company_*`) |
| `applicant.type` | string | Sim | Tipo de cliente: `individual` (Pessoa Física) ou `company` (Pessoa Jurídica) |
| `applicant.name` | string | Não | Nome completo (PF) ou razão social (PJ) |
| `applicant.email` | string | Não | Email do cliente |
| `applicant.document` | string | Não | CPF (PF) ou CNPJ (PJ) |
| `status` | string | Sim | Status atual: `created`, `pending`, `approved`, `rejected`, `on_hold`, `under_review` |
| `reviewAnswer` | string | Não | Resultado da revisão: `GREEN`, `RED`, `YELLOW` (apenas em `applicant_reviewed`) |
| `message` | string | Sim | Mensagem resumida do evento |
| `whatsapp_message` | string | Sim | Mensagem pré-formatada para WhatsApp com emojis e formatação |
| `metadata` | object | Não | Dados adicionais (pode estar vazio) |

---

## 🔧 Implementação Sugerida

### Passo 1: Criar o Endpoint

Crie um endpoint POST que receba o payload JSON.

### Passo 2: Validar o Payload

Valide que o payload contém os campos obrigatórios:
- `event`
- `timestamp`
- `applicant.id`
- `applicant.type`
- `status`
- `whatsapp_message`

### Passo 3: Processar e Enviar para WhatsApp

Use o campo `whatsapp_message` que já vem formatado com:
- ✅ Emojis apropriados
- ✅ Formatação em negrito (usando `*texto*`)
- ✅ Quebras de linha
- ✅ Informações organizadas

### Passo 4: Retornar Resposta

Retorne uma resposta HTTP adequada:
- **200 OK** - Notificação processada com sucesso
- **400 Bad Request** - Payload inválido
- **500 Internal Server Error** - Erro ao processar

---

## 📱 Exemplo de Mensagens WhatsApp

### Novo Onboarding Iniciado
```
🆕 *NOVO ONBOARDING INICIADO*

*Tipo:* Pessoa Física
*ID:* individual_1730323500_abc123
*Data:* 30/10/2025 20:45

*Status:* 📋 Criado
```

### Documentos Enviados
```
⏳ *DOCUMENTOS ENVIADOS*

*Tipo:* Pessoa Jurídica
*Nome:* Empresa XYZ Ltda
*CNPJ:* 12.345.678/0001-90
*Email:* contato@empresaxyz.com.br
*ID:* company_1730323600_xyz789
*Data:* 30/10/2025 20:50

*Status:* ⏳ Pendente

⏳ Aguardando análise da equipe de compliance.
```

### Onboarding Aprovado
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

### Onboarding Rejeitado
```
❌ *ONBOARDING REJEITADO*

*Tipo:* Pessoa Física
*Nome:* Maria Santos
*CPF:* 987.654.321-00
*Email:* maria.santos@example.com
*ID:* individual_1730323700_def456
*Data:* 30/10/2025 21:15

*Status:* ❌ Rejeitado

❌ O onboarding foi rejeitado. Verifique os motivos no dashboard.
```

---

## 🔒 Segurança (Opcional mas Recomendado)

### Opção 1: Token de Autenticação no Header

Adicione validação de um token secreto no header:

```
Authorization: Bearer SEU_TOKEN_SECRETO_AQUI
```

### Opção 2: Validação de IP

Restrinja o acesso apenas ao IP do servidor de onboarding (será fornecido).

### Opção 3: Assinatura HMAC

Valide a assinatura do payload usando HMAC-SHA256 (similar ao Sumsub).

---

## 🧪 Exemplo de Teste

Para testar o webhook, você pode usar este payload de exemplo:

```json
{
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
  "whatsapp_message": "✅ *ONBOARDING APROVADO*\n\n*Tipo:* Pessoa Física\n*Nome:* Teste da Silva\n*CPF:* 000.000.000-00\n*Email:* teste@example.com\n*ID:* individual_test_123\n*Data:* 30/10/2025 21:00\n\n*Status:* ✅ Aprovado\n\n✅ O cliente foi aprovado e já pode negociar USDT!",
  "metadata": {}
}
```

---

## 📞 Informações de Contato

Após implementar o webhook, forneça:
1. **URL do endpoint** (ex: `https://seu-bot.com/api/webhooks/onboarding-notifications`)
2. **Token de autenticação** (se aplicável)
3. **Método de teste** (como podemos testar o webhook)

---

## ✅ Checklist de Implementação

- [ ] Criar endpoint POST que aceita JSON
- [ ] Validar campos obrigatórios do payload
- [ ] Extrair campo `whatsapp_message` do payload
- [ ] Enviar mensagem para WhatsApp usando a API do seu bot
- [ ] Implementar tratamento de erros
- [ ] Retornar resposta HTTP apropriada
- [ ] (Opcional) Adicionar autenticação/segurança
- [ ] Testar com payload de exemplo
- [ ] Fornecer URL do endpoint para configuração

---

## 🚀 Próximos Passos

1. Implementar o webhook conforme especificação
2. Testar localmente com payloads de exemplo
3. Fazer deploy do webhook
4. Fornecer a URL do endpoint
5. Configurar a URL no sistema de onboarding (variável de ambiente `WHATSAPP_WEBHOOK_URL`)
6. Testar integração end-to-end

---

## 💡 Dicas Importantes

- O campo `whatsapp_message` já vem **completamente formatado** - basta enviá-lo direto para o WhatsApp
- O sistema faz **retry automático** (até 3 tentativas) em caso de falha
- Cada evento é enviado **imediatamente** quando ocorre no Sumsub
- O `applicant.id` é **único** e pode ser usado para rastreamento
- O `applicant.type` indica se é Pessoa Física (`individual`) ou Jurídica (`company`)

---

## 📚 Referências

- [Documentação Sumsub Webhooks](https://docs.sumsub.com/reference/webhooks)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)

---

**Versão:** 1.0  
**Data:** 30/10/2025  
**Projeto:** Sistema de Onboarding 1A1 Cripto

