# Fluxo Profissional: Contrato e Wallet

## 🎯 **PROBLEMA IDENTIFICADO:**

O cliente acessa o link de onboarding **apenas uma vez** (no momento do cadastro inicial).
A aprovação do Sumsub demora (pode levar horas ou dias).
Quando aprovado, o cliente **não está mais** na página de onboarding.

**Solução necessária:** Sistema de **links mágicos** (magic links) enviados por WhatsApp/Email.

---

## ✅ **FLUXO PROPOSTO (AUTOMATIZADO E PROFISSIONAL):**

### **1. Cadastro Inicial (Onboarding)**

**Cliente acessa:** `https://onboarding.1a1cripto.com`

1. Escolhe tipo: PF ou PJ
2. Digita CPF ou CNPJ
3. **Sistema consulta BrasilAPI** (para CNPJ) ou valida CPF
4. **Salva no Supabase:**
   - `external_user_id` (cpf_xxx ou cnpj_xxx)
   - `applicant_type` (individual ou company)
   - `document` (CPF ou CNPJ)
   - `company_name` (razão social da BrasilAPI, se PJ)
   - `status`: `created`
5. Inicia verificação no Sumsub
6. Cliente completa documentos no widget Sumsub

---

### **2. Webhook: Applicant Pending**

**Sumsub envia:** `applicantPending`

1. Sistema salva dados pessoais no Supabase:
   - `first_name`, `last_name` (PF)
   - `company_name` (PJ, se não veio da BrasilAPI)
   - `email`, `phone`
   - `status`: `pending`

2. **Notificação WhatsApp:**
   ```
   ⏳ DOCUMENTOS ENVIADOS

   Tipo: Pessoa Jurídica
   Nome: Empresa XYZ Ltda
   CNPJ: 12.345.678/0001-90
   Data: 31/10/2025, 14:30:00

   Status: ⏳ Aguardando análise da equipe de compliance.

   ⏳ Aguardando análise da equipe de compliance.
   ```

---

### **3. Webhook: Applicant Reviewed (APROVADO)**

**Sumsub envia:** `applicantReviewed` com `reviewAnswer: GREEN`

1. Sistema atualiza status no Supabase:
   - `status`: `approved`
   - `review_answer`: `GREEN`
   - `approved_at`: timestamp

2. **Gera token único** para magic link:
   ```typescript
   const token = crypto.randomUUID(); // ex: a1b2c3d4-e5f6-...
   ```

3. **Salva token no Supabase:**
   ```sql
   UPDATE applicants
   SET contract_token = 'a1b2c3d4-e5f6-...',
       contract_token_expires_at = NOW() + INTERVAL '7 days'
   WHERE id = '...'
   ```

4. **Gera link mágico:**
   ```
   https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...
   ```

5. **Notificação WhatsApp:**
   ```
   ✅ ONBOARDING APROVADO

   Tipo: Pessoa Jurídica
   Nome: Empresa XYZ Ltda
   CNPJ: 12.345.678/0001-90
   Data: 31/10/2025, 14:30:00

   Status: ✅ Aprovado

   ✅ O cliente foi aprovado e já pode negociar USDT!

   📄 Próximo passo: Assinar contrato
   👉 Acesse: https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...

   ⏰ Link válido por 7 dias.
   ```

---

### **4. Cliente Acessa Link de Contrato**

**URL:** `https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...`

1. Sistema valida token:
   - Token existe?
   - Token não expirou?
   - Contrato já foi assinado?

2. **Se válido**, busca dados do applicant no Supabase:
   ```typescript
   const applicant = await getApplicantByContractToken(token);
   ```

3. **Renderiza contrato preenchido:**
   - Nome/Razão Social
   - CPF/CNPJ
   - Endereço (do Sumsub)
   - Email
   - Telefone
   - Data de assinatura (hoje)

4. **Cliente lê e assina:**
   - Checkbox: "Li e concordo com os termos"
   - Botão: "Assinar Contrato Eletronicamente"

5. **Ao assinar:**
   - Salva no Supabase:
     ```sql
     UPDATE applicants
     SET contract_signed_at = NOW(),
         contract_ip = '...',
         contract_user_agent = '...'
     WHERE id = '...'
     ```
   - Gera PDF do contrato assinado
   - Salva PDF no storage (Supabase Storage ou S3)
   - **Gera novo token** para wallet:
     ```sql
     UPDATE applicants
     SET wallet_token = 'x1y2z3...',
         wallet_token_expires_at = NOW() + INTERVAL '30 days'
     WHERE id = '...'
     ```

6. **Redireciona automaticamente** para cadastro de wallet:
   ```
   https://onboarding.1a1cripto.com/wallet?token=x1y2z3...
   ```

---

### **5. Cliente Cadastra Wallet**

**URL:** `https://onboarding.1a1cripto.com/wallet?token=x1y2z3...`

1. Sistema valida token (mesmo processo)

2. **Renderiza termo de wallet preenchido:**
   - Nome/Razão Social
   - CPF/CNPJ
   - Número do contrato (referência)

3. **Cliente informa wallet TRC-20:**
   - Input com validação em tempo real:
     - 34 caracteres
     - Começa com "T"
     - Formato válido

4. **Cliente confirma:**
   - Checkbox: "Confirmo que copiei e colei o endereço diretamente da minha wallet"
   - Checkbox: "Li e concordo com o Termo de Cadastro de Wallet"
   - Botão: "Cadastrar Wallet"

5. **Ao cadastrar:**
   - **Valida wallet via Chainalysis KYT** (se integrado)
   - Salva no Supabase:
     ```sql
     UPDATE business_data
     SET wallet_address = 'T...',
         wallet_verified = true,
         wallet_verified_at = NOW()
     WHERE applicant_id = '...'
     ```
   - Gera PDF do termo de wallet assinado
   - Salva PDF no storage

6. **Notificação WhatsApp:**
   ```
   ✅ WALLET CADASTRADA COM SUCESSO!

   Empresa: XYZ Ltda
   CNPJ: 12.345.678/0001-90
   Wallet: T1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7

   ✅ Seu cadastro está completo!

   📱 Próximo passo: Baixe o app ou acesse a plataforma OTC
   👉 https://otc.1a1cripto.com
   ```

7. **Página de sucesso final:**
   ```
   ✅ Cadastro Completo!

   Seu onboarding foi finalizado com sucesso.

   📄 Contrato assinado: [Download PDF]
   💼 Wallet cadastrada: T1a2b3...

   📱 Acesse a plataforma OTC:
   👉 https://otc.1a1cripto.com

   📞 Dúvidas? Entre em contato:
   WhatsApp: (41) 98873-1361
   Email: contato@1a1cripto.com
   ```

---

## 🔐 **SEGURANÇA DOS MAGIC LINKS:**

### **Tokens únicos e seguros:**
- UUID v4 (impossível de adivinhar)
- Expira em 7 dias (contrato) ou 30 dias (wallet)
- Uso único (invalidado após assinatura)
- Armazenado com hash (opcional, para máxima segurança)

### **Validações:**
- IP e User-Agent registrados
- Timestamp de acesso
- Proteção contra CSRF

---

## 📊 **SCHEMA DO SUPABASE (ATUALIZADO):**

```sql
-- Adicionar colunas na tabela applicants
ALTER TABLE applicants ADD COLUMN company_name TEXT;
ALTER TABLE applicants ADD COLUMN contract_token UUID;
ALTER TABLE applicants ADD COLUMN contract_token_expires_at TIMESTAMPTZ;
ALTER TABLE applicants ADD COLUMN contract_signed_at TIMESTAMPTZ;
ALTER TABLE applicants ADD COLUMN contract_ip INET;
ALTER TABLE applicants ADD COLUMN contract_user_agent TEXT;
ALTER TABLE applicants ADD COLUMN contract_pdf_url TEXT;

ALTER TABLE applicants ADD COLUMN wallet_token UUID;
ALTER TABLE applicants ADD COLUMN wallet_token_expires_at TIMESTAMPTZ;
ALTER TABLE applicants ADD COLUMN wallet_pdf_url TEXT;

-- Adicionar colunas na tabela business_data
ALTER TABLE business_data ADD COLUMN wallet_verified BOOLEAN DEFAULT false;
ALTER TABLE business_data ADD COLUMN wallet_verified_at TIMESTAMPTZ;
ALTER TABLE business_data ADD COLUMN wallet_kyt_status TEXT;
ALTER TABLE business_data ADD COLUMN wallet_kyt_risk_score NUMERIC;
```

---

## 🚀 **VANTAGENS DESTE FLUXO:**

✅ **100% automatizado** - Zero intervenção manual
✅ **Seguro** - Tokens únicos com expiração
✅ **Profissional** - Cliente recebe link por WhatsApp
✅ **Rastreável** - Tudo registrado no banco (IP, timestamp, etc.)
✅ **Escalável** - Funciona para 1 ou 1000 clientes
✅ **Compliance** - PDFs assinados salvos para auditoria
✅ **UX excelente** - Cliente não precisa de login/senha

---

## 📱 **EXEMPLO DE MENSAGEM WHATSAPP COMPLETA:**

```
✅ ONBOARDING APROVADO

Tipo: Pessoa Jurídica
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Email: contato@empresa.com
Data: 31/10/2025, 14:30:00

Status: ✅ Aprovado

✅ Parabéns! Seu cadastro foi aprovado pela nossa equipe de compliance.

📄 Próximo passo: Assinar contrato de prestação de serviços

👉 Acesse o link abaixo para assinar:
https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...

⏰ Link válido por 7 dias.

📞 Dúvidas? Entre em contato:
WhatsApp: (41) 98873-1361
Email: contato@1a1cripto.com
```

---

## ✅ **APROVAÇÃO:**

Este fluxo resolve todos os problemas:
- ✅ Cliente não precisa estar online quando for aprovado
- ✅ Links mágicos funcionam a qualquer momento
- ✅ Dados já preenchidos automaticamente (BrasilAPI + Sumsub)
- ✅ Zero intervenção manual
- ✅ Totalmente rastreável e auditável

**Posso começar a implementar?**


