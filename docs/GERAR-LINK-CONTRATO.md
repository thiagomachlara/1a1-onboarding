# 📝 Como Gerar Link de Contrato Manualmente

Quando uma empresa é aprovada no Sumsub, o sistema gera automaticamente um link de contrato via webhook. Porém, se a notificação WhatsApp não chegou ou foi perdida, você pode **gerar o link manualmente** de 3 formas:

---

## 🚀 Opção 1: Script CLI (Mais Rápido)

### Como Usar

```bash
cd /home/ubuntu/1a1-onboarding
npx tsx scripts/generate-contract-link.ts <IDENTIFICADOR>
```

### Exemplos

**Por CNPJ:**
```bash
npx tsx scripts/generate-contract-link.ts 12345678000190
```

**Por External User ID:**
```bash
npx tsx scripts/generate-contract-link.ts cnpj_12345678000190
```

**Por Applicant ID (UUID):**
```bash
npx tsx scripts/generate-contract-link.ts 550e8400-e29b-41d4-a716-446655440000
```

### Saída Esperada

```
🔍 Buscando applicant...

📋 Applicant encontrado:
   ID: 550e8400-e29b-41d4-a716-446655440000
   External User ID: cnpj_12345678000190
   Tipo: Empresa (PJ)
   Nome: Empresa Exemplo Ltda
   Email: contato@empresa.com
   Documento: 12345678000190
   Status: approved
   Review Answer: GREEN

🔗 Gerando link de contrato...
✅ Reutilizando token válido existente
   Expira em: 2025-11-12T14:30:00.000Z
   Dias restantes: 5

✅ Link de contrato gerado com sucesso!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   https://onboarding.1a1cripto.com/contract?token=xxx-xxx-xxx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📲 Envie este link para o cliente via WhatsApp ou email.
```

---

## 🌐 Opção 2: API Endpoint

### Endpoint

```
POST /api/contract/resend
```

### Request Body

```json
{
  "applicantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**OU**

```json
{
  "externalUserId": "cnpj_12345678000190"
}
```

**OU**

```json
{
  "document": "12345678000190"
}
```

### Exemplo com cURL

```bash
curl -X POST https://onboarding.1a1cripto.com/api/contract/resend \
  -H "Content-Type: application/json" \
  -d '{"document": "12345678000190"}'
```

### Exemplo com Postman

1. Método: `POST`
2. URL: `https://onboarding.1a1cripto.com/api/contract/resend`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "document": "12345678000190"
}
```

### Response de Sucesso

```json
{
  "success": true,
  "contractLink": "https://onboarding.1a1cripto.com/contract?token=xxx-xxx-xxx",
  "applicant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalUserId": "cnpj_12345678000190",
    "type": "company",
    "name": "Empresa Exemplo Ltda",
    "email": "contato@empresa.com",
    "phone": "+5511999999999",
    "document": "12345678000190",
    "status": "approved",
    "reviewAnswer": "GREEN",
    "approvedAt": "2025-11-05T10:30:00.000Z",
    "contractSignedAt": null
  },
  "message": "Link gerado com sucesso"
}
```

### Response de Erro (Applicant Não Aprovado)

```json
{
  "error": "Applicant não está aprovado",
  "currentStatus": "pending",
  "reviewAnswer": "YELLOW",
  "message": "Apenas applicants aprovados (status=approved ou reviewAnswer=GREEN) podem receber link de contrato"
}
```

### Response de Aviso (Contrato Já Assinado)

```json
{
  "warning": "Contrato já foi assinado",
  "signedAt": "2025-11-04T15:20:00.000Z",
  "message": "Um novo link será gerado, mas o contrato anterior já está assinado"
}
```

---

## 🔗 Opção 3: Via Navegador (GET)

Para facilitar testes, o endpoint também aceita GET com query params:

```
https://onboarding.1a1cripto.com/api/contract/resend?document=12345678000190
```

**OU**

```
https://onboarding.1a1cripto.com/api/contract/resend?externalUserId=cnpj_12345678000190
```

**OU**

```
https://onboarding.1a1cripto.com/api/contract/resend?applicantId=550e8400-e29b-41d4-a716-446655440000
```

---

## 📋 Como Encontrar o Identificador

### 1. Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/oospfhaxwovcceddnoho/editor
2. Abra tabela `applicants`
3. Filtre por `company_name` ou `document_number`
4. Copie o `id` (UUID) ou `external_user_id`

### 2. Via API de Listagem

```bash
# Listar todas as empresas aprovadas
curl https://onboarding.1a1cripto.com/api/kyb/applicants?status=GREEN&type=company
```

### 3. Via Logs do WhatsApp

Se você tem o `externalUserId` nas notificações do WhatsApp, use diretamente:
- Formato: `cnpj_12345678000190`

---

## ⚠️ Validações

O sistema **só gera link** se:

✅ Applicant foi encontrado  
✅ Status é `approved` **OU** `reviewAnswer` é `GREEN`

O sistema **avisa mas permite** se:

⚠️ Contrato já foi assinado (gera novo link mesmo assim)

O sistema **rejeita** se:

❌ Applicant não foi encontrado  
❌ Status não é `approved` e `reviewAnswer` não é `GREEN`

---

## 🔄 Reutilização de Tokens

**Comportamento inteligente:**

- ✅ Se já existe token válido (expira em mais de 1 dia) → **Reutiliza**
- ✅ Se token expira em menos de 1 dia → **Gera novo**
- ✅ Se contrato já foi assinado → **Gera novo** (mas avisa)

**Validade do token:** 7 dias

---

## 📊 Casos de Uso

### Caso 1: Notificação WhatsApp Não Chegou
```bash
# Cliente foi aprovado mas não recebeu link
npx tsx scripts/generate-contract-link.ts 12345678000190
# Copie o link e envie manualmente via WhatsApp
```

### Caso 2: Cliente Perdeu o Link
```bash
# Cliente perdeu o link antigo
npx tsx scripts/generate-contract-link.ts cnpj_12345678000190
# Sistema reutiliza token válido (mesmo link)
```

### Caso 3: Link Expirou
```bash
# Token expirou (mais de 7 dias)
npx tsx scripts/generate-contract-link.ts 12345678000190
# Sistema gera novo token automaticamente
```

### Caso 4: Reenviar para Múltiplas Empresas
```bash
# Via API em loop (exemplo com jq)
curl https://onboarding.1a1cripto.com/api/kyb/applicants?status=GREEN | \
  jq -r '.applicants[].id' | \
  while read id; do
    curl -X POST https://onboarding.1a1cripto.com/api/contract/resend \
      -H "Content-Type: application/json" \
      -d "{\"applicantId\": \"$id\"}"
  done
```

---

## 🛠️ Troubleshooting

### Erro: "Applicant não encontrado"

**Causa:** CNPJ/CPF incorreto ou applicant não existe no banco

**Solução:**
1. Verifique o CNPJ/CPF
2. Consulte tabela `applicants` no Supabase
3. Confirme que o applicant foi criado via Sumsub

---

### Erro: "Applicant não está aprovado"

**Causa:** Applicant ainda não foi aprovado pelo Sumsub

**Solução:**
1. Verifique status no Sumsub Dashboard
2. Aguarde aprovação manual do time Sumsub
3. Ou force aprovação via Sumsub (se necessário)

---

### Aviso: "Contrato já foi assinado"

**Causa:** Cliente já assinou o contrato anteriormente

**Solução:**
- Novo link será gerado mesmo assim
- Use para reenviar se cliente precisar acessar novamente
- Contrato anterior permanece válido

---

## 📞 Suporte

Se tiver problemas:

1. Verifique logs do script/API
2. Consulte tabela `applicants` no Supabase
3. Verifique status no Sumsub Dashboard
4. Entre em contato com o time técnico

---

## 🎯 Resumo Rápido

**Forma mais rápida (CLI):**
```bash
npx tsx scripts/generate-contract-link.ts 12345678000190
```

**Forma mais flexível (API):**
```bash
curl -X POST https://onboarding.1a1cripto.com/api/contract/resend \
  -H "Content-Type: application/json" \
  -d '{"document": "12345678000190"}'
```

**Forma mais simples (navegador):**
```
https://onboarding.1a1cripto.com/api/contract/resend?document=12345678000190
```

---

**Documento criado em:** 05/11/2025  
**Última atualização:** 05/11/2025
