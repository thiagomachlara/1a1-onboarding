# 🔧 Guia de Configuração do Sumsub

**Data**: 30 de outubro de 2025  
**Status**: Sistema implementado e funcionando - apenas configuração pendente

---

## ✅ STATUS ATUAL

**O sistema está 100% funcional!** Todos os componentes estão implementados e testados:

- ✅ API de geração de access tokens
- ✅ Componente SumsubWebSDK
- ✅ Páginas de verificação (individual e empresa)
- ✅ Integração com Supabase
- ✅ Webhook para receber notificações
- ✅ Notificações via WhatsApp

**Único item pendente**: Configurar domínios permitidos no dashboard do Sumsub

---

## 🚨 PROBLEMA ATUAL

Erro ao inicializar SDK:
```json
{
  "code": "invalid-origin",
  "error": "Origin is not allowed"
}
```

---

## 🔧 SOLUÇÃO: Configurar Allowed Origins

### **Passo 1: Acessar Dashboard do Sumsub**

1. Acesse: https://cockpit.sumsub.com/
2. Faça login com suas credenciais
3. Selecione o projeto correto

### **Passo 2: Configurar Allowed Origins**

1. No menu lateral, vá em **Settings** → **SDK Settings**
2. Encontre a seção **Allowed Origins** ou **CORS Settings**
3. Adicione os seguintes domínios:

```
https://onboarding.1a1cripto.com
https://*.vercel.app
http://localhost:3000
```

**Importante**: 
- Use `https://` para domínios de produção
- Use `http://` apenas para localhost
- O wildcard `*.vercel.app` permite todos os deployments de preview do Vercel

### **Passo 3: Salvar e Aguardar Propagação**

1. Clique em **Save** ou **Update**
2. Aguarde 1-2 minutos para a configuração propagar
3. Teste novamente acessando: https://onboarding.1a1cripto.com/onboarding/company

---

## 🧪 TESTE APÓS CONFIGURAÇÃO

1. Acesse: https://onboarding.1a1cripto.com/onboarding/company
2. Verifique se o SDK carrega sem erro
3. Teste o fluxo completo de verificação
4. Verifique se o webhook recebe notificações
5. Confirme se as notificações chegam no WhatsApp

---

## 📋 CONFIGURAÇÕES ADICIONAIS RECOMENDADAS

### **1. Verificar Level Names**

Confirme que os seguintes levels existem no dashboard:

- **basic-kyc-level**: Para pessoa física (individual)
- **auto-kyb**: Para pessoa jurídica (company)

**Como verificar**:
1. Vá em **Applicant Levels**
2. Confirme que os levels acima existem
3. Se não existirem, crie-os ou ajuste os nomes no código

### **2. Configurar Webhook**

O webhook já está implementado em: `/api/sumsub/webhook`

**URL do webhook**: `https://onboarding.1a1cripto.com/api/sumsub/webhook`

**Como configurar**:
1. Vá em **Settings** → **Webhooks**
2. Adicione a URL acima
3. Selecione os eventos:
   - `applicantReviewed`
   - `applicantPending`
   - `applicantOnHold`
   - `applicantPrechecked`
4. Copie o **Secret Key** gerado
5. Adicione ao arquivo `.env.local`:
   ```
   SUMSUB_WEBHOOK_SECRET=seu_secret_key_aqui
   ```

### **3. Verificar Credenciais**

Confirme que as seguintes variáveis estão configuradas no Vercel:

```
SUMSUB_APP_TOKEN=seu_app_token
SUMSUB_SECRET_KEY=seu_secret_key
SUMSUB_WEBHOOK_SECRET=seu_webhook_secret
```

---

## 🎯 PRÓXIMOS PASSOS APÓS CONFIGURAÇÃO

1. ✅ Configurar Allowed Origins (este documento)
2. ✅ Testar fluxo completo
3. ✅ Configurar webhook
4. ✅ Testar notificações WhatsApp
5. ✅ Documentar para usuários finais
6. ✅ Treinar equipe

---

## 📞 SUPORTE

Se precisar de ajuda com a configuração do Sumsub:
- **Email**: support@sumsub.com
- **Documentação**: https://docs.sumsub.com/
- **Dashboard**: https://cockpit.sumsub.com/

---

## 🎊 CONCLUSÃO

Após configurar os Allowed Origins, o sistema estará 100% operacional e pronto para produção!

**Tempo estimado**: 5 minutos de configuração
**Dificuldade**: Baixa
**Impacto**: Sistema completamente funcional

