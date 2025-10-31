# 🔔 Guia Completo de Configuração de Webhook Sumsub

**Data**: 31 de outubro de 2025  
**Baseado na documentação oficial**: https://docs.sumsub.com/docs/webhook-manager

---

## 📋 Passo a Passo

### **1. Acessar o Dashboard do Sumsub**

1. Acesse: https://cockpit.sumsub.com/
2. Faça login com suas credenciais
3. Navegue para: **Dev space** → **Webhooks** → **Webhook manager**
4. Clique no botão **Create webhook**

---

### **2. Preencher Configurações do Webhook**

Preencha os campos conforme a tabela abaixo:

| Campo | Valor | Observação |
|-------|-------|------------|
| **Name** | `1A1 Onboarding Notifications` | Nome descritivo do webhook |
| **Webhook receiver** | `HTTP address` | Selecionar esta opção |
| **Target** | `https://onboarding.1a1cripto.com/api/sumsub/webhook` | URL do nosso endpoint |
| **Webhook types** | Ver lista abaixo ⬇️ | Selecionar eventos |
| **Applicant types** | `Individual` + `Companies` | Marcar ambos |
| **Secret key** | *(auto-gerado)* | **COPIAR ESTE VALOR!** |
| **Signature algorithm** | `SHA256` | Manter padrão |
| **HTTP Headers** | *(vazio)* | Não adicionar |
| **Source keys** | *(vazio)* | Não selecionar |
| **Resend failed webhooks** | ✅ Habilitado | Marcar checkbox |

---

### **3. Selecionar Tipos de Webhook**

Na seção **Webhook types**, selecione os seguintes eventos:

#### **Eventos Essenciais** (obrigatórios)

- ✅ **applicantReviewed** - Quando verificação é concluída e há resultado final
- ✅ **applicantPending** - Quando usuário enviou documentos e está aguardando revisão
- ✅ **applicantOnHold** - Quando verificação foi pausada para revisão manual

#### **Eventos Recomendados** (opcional mas útil)

- ✅ **applicantPrechecked** - Quando processamento inicial foi concluído
- ✅ **applicantCreated** - Quando novo applicant é criado
- ✅ **applicantPersonalInfoChanged** - Quando dados pessoais são alterados

#### **Eventos Adicionais** (se necessário no futuro)

- ⬜ **applicantActionPending** - Para ações adicionais solicitadas
- ⬜ **applicantActionReviewed** - Quando ação adicional é revisada
- ⬜ **applicantLevelChanged** - Quando nível de verificação muda

---

### **4. Testar o Webhook**

1. Clique no botão **Test webhook**
2. Aguarde a resposta
3. Verifique se retorna **sucesso** (status 200)

**Se der erro:**
- Verifique se a URL está correta
- Confirme que o site está no ar
- Tente novamente em alguns segundos

---

### **5. Salvar Configuração**

1. Clique no botão **Save** (ou **Create**)
2. **IMPORTANTE**: Copie o valor do **Secret Key** que foi gerado
3. Guarde este valor em local seguro

---

### **6. Adicionar Secret Key no Vercel**

Agora você precisa adicionar a chave secreta como variável de ambiente no Vercel:

1. Acesse: https://vercel.com/thiago-laras-projects/1a1-onboarding/settings/environment-variables
2. Clique em **Add New**
3. Preencha:
   - **Key**: `SUMSUB_WEBHOOK_SECRET`
   - **Value**: *(cole o Secret Key copiado do Sumsub)*
   - **Environment**: Selecione **Production**, **Preview** e **Development**
4. Clique em **Save**

---

### **7. Fazer Redeploy no Vercel**

Para que a nova variável seja aplicada:

1. Vá para: https://vercel.com/thiago-laras-projects/1a1-onboarding
2. Clique na aba **Deployments**
3. No deployment mais recente, clique nos três pontos (⋮)
4. Selecione **Redeploy**
5. Aguarde o deploy completar (~2 minutos)

---

## ✅ Verificação Final

Após configurar tudo, verifique:

- [ ] Webhook criado no dashboard Sumsub
- [ ] URL do webhook: `https://onboarding.1a1cripto.com/api/sumsub/webhook`
- [ ] Eventos selecionados (mínimo: applicantReviewed, applicantPending, applicantOnHold)
- [ ] Secret Key copiado
- [ ] Variável `SUMSUB_WEBHOOK_SECRET` adicionada no Vercel
- [ ] Redeploy feito no Vercel

---

## 🧪 Como Testar se Está Funcionando

### **Teste 1: Fazer uma Verificação Real**

1. Acesse: https://onboarding.1a1cripto.com/onboarding/individual
2. Complete o processo de verificação
3. Aguarde o Sumsub processar
4. Verifique os logs no Vercel

### **Teste 2: Ver Logs do Webhook no Sumsub**

1. No dashboard Sumsub, vá para: **Dev space** → **Webhooks** → **Webhook logs**
2. Você verá todas as tentativas de envio de webhook
3. Verifique se há erros ou sucessos

### **Teste 3: Ver Logs no Vercel**

1. Acesse: https://vercel.com/thiago-laras-projects/1a1-onboarding
2. Clique em **Logs**
3. Filtre por `/api/sumsub/webhook`
4. Verifique se há requisições chegando

---

## 🔍 Estrutura do Webhook Recebido

Quando o Sumsub envia um webhook, ele vem com este formato:

### **Headers**
```
Content-Type: application/json
x-payload-digest: a1b2c3d4e5f6... (assinatura HMAC)
x-payload-digest-alg: HMAC_SHA256_HEX
```

### **Body (exemplo)**
```json
{
  "applicantId": "5cb56e8e0a975a35f333cb83",
  "inspectionId": "5cb56e8e0a975a35f333cb84",
  "correlationId": "req-ec508a2a-fa33-4dd2-b93d-fcade2967e03",
  "externalUserId": "company_1761882877162_cb0kfj",
  "type": "applicantReviewed",
  "reviewResult": {
    "reviewAnswer": "GREEN"
  },
  "reviewStatus": "completed",
  "createdAtMs": "2020-02-21 13:23:19.111",
  "clientId": "SumsubClient"
}
```

### **Possíveis Status (reviewAnswer)**

- ✅ **GREEN** - Aprovado
- ❌ **RED** - Rejeitado
- ⚠️ **YELLOW** - Requer revisão manual

---

## 🔒 Segurança

### **Como Funciona a Verificação de Assinatura**

1. Sumsub calcula HMAC do payload usando o Secret Key
2. Envia a assinatura no header `x-payload-digest`
3. Nosso código recalcula o HMAC com o mesmo Secret Key
4. Compara as duas assinaturas
5. Se forem iguais → webhook é legítimo ✅
6. Se forem diferentes → webhook é rejeitado ❌

**Nosso código já implementa toda essa verificação automaticamente!**

---

## 📊 O Que Acontece Quando Webhook é Recebido

Nosso endpoint `/api/sumsub/webhook` faz automaticamente:

1. ✅ **Valida assinatura** - Verifica se webhook vem do Sumsub
2. ✅ **Salva no Supabase** - Registra status no banco de dados
3. ✅ **Envia WhatsApp** - Notifica via Evolution API
4. ✅ **Registra logs** - Para debug e auditoria

---

## ⚠️ Requisitos Técnicos

| Requisito | Status | Observação |
|-----------|--------|------------|
| HTTPS obrigatório | ✅ | Nosso domínio usa HTTPS |
| TLS 1.2 ou superior | ✅ | Vercel usa TLS 1.3 |
| Timeout < 5 segundos | ✅ | Nosso endpoint é rápido |
| Retorna status 200 | ✅ | Implementado |

---

## 🔄 Retentativas Automáticas

Se o webhook falhar, o Sumsub tenta reenviar automaticamente:

1. **5 minutos** depois
2. **1 hora** depois
3. **5 horas** depois
4. **18 horas** depois

Após 4 falhas consecutivas, o webhook é desabilitado e você recebe email.

---

## 📞 Suporte

**Se tiver problemas:**

1. Verifique logs no Vercel
2. Verifique webhook logs no Sumsub dashboard
3. Confirme que Secret Key está correto
4. Teste o endpoint manualmente

**Documentação oficial:**
- Webhooks: https://docs.sumsub.com/docs/webhook-manager
- Tipos de webhook: https://docs.sumsub.com/docs/user-verification-webhooks

---

## ✅ Checklist Final

Antes de considerar concluído:

- [ ] Webhook configurado no Sumsub
- [ ] Secret Key adicionado no Vercel
- [ ] Redeploy feito
- [ ] Teste de verificação realizado
- [ ] Webhook recebido com sucesso
- [ ] Dados salvos no Supabase
- [ ] Notificação WhatsApp enviada

---

**Configuração criada com base na documentação oficial do Sumsub** 📚

**Última atualização**: 31 de outubro de 2025

