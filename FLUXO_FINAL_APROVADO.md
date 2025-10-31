# Fluxo Final Aprovado: Contrato e Wallet

## 🎯 **FLUXO OPERACIONAL (SEMI-AUTOMATIZADO):**

### **Notificações:**
- ✅ **Grupo interno de onboarding** → Recebe TODAS as notificações com links prontos
- ❌ **Grupo com cliente** → NÃO recebe nada automaticamente
- 👤 **Você ou compliance officer** → Copia e cola manualmente os links quando aprovar

---

## 📱 **1. CADASTRO INICIAL**

**Cliente acessa:** `https://onboarding.1a1cripto.com`

1. Escolhe PF ou PJ
2. Digita CPF ou CNPJ
3. **Sistema consulta BrasilAPI** (se CNPJ) e salva:
   - `document`, `applicant_type`, `company_name`, `status: created`
4. Inicia Sumsub
5. Cliente completa documentos

**Notificação no grupo interno:**
```
📋 DOCUMENTOS ENVIADOS

Tipo: Pessoa Jurídica
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
ID: cnpj_12345678000190
Data: 31/10/2025, 14:30:00

Status: ⏳ Pendente

⏳ Aguardando análise da equipe de compliance.
```

---

## ✅ **2. APROVAÇÃO (WEBHOOK)**

**Sumsub envia:** `applicantReviewed` com `reviewAnswer: GREEN`

1. Sistema atualiza: `status: approved`
2. **Gera token único** para contrato
3. **Gera link mágico:**
   ```
   https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...
   ```

**Notificação no grupo interno:**
```
✅ ONBOARDING APROVADO

Tipo: Pessoa Jurídica
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Email: contato@empresa.com
Telefone: (11) 98765-4321
Data: 31/10/2025, 14:35:00

Status: ✅ Aprovado

📄 LINK PARA ASSINATURA DE CONTRATO:
👉 https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-...

⏰ Link válido por 7 dias.

💬 Envie este link para o cliente assinar o contrato.
```

**Você ou compliance officer:**
- Copia o link
- Envia manualmente para o cliente (WhatsApp, email, etc.)
- Adiciona o bot no grupo com o cliente (se quiser)

---

## 📄 **3. CLIENTE ASSINA CONTRATO**

**Cliente acessa:** `https://onboarding.1a1cripto.com/contract?token=...`

1. Sistema valida token
2. Renderiza contrato preenchido automaticamente
3. Cliente lê e assina (checkbox + botão)
4. Sistema:
   - Salva assinatura no banco
   - Gera PDF do contrato
   - **Gera novo token** para wallet
   - Redireciona automaticamente para: `/wallet?token=x1y2z3...`

**Notificação no grupo interno:**
```
✅ CONTRATO ASSINADO

Tipo: Pessoa Jurídica
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Data: 31/10/2025, 15:00:00

📄 Contrato assinado com sucesso!
IP: 177.123.45.67
Assinado em: 31/10/2025, 15:00:00

💼 LINK PARA CADASTRO DE WALLET:
👉 https://onboarding.1a1cripto.com/wallet?token=x1y2z3...

⏰ Link válido por 30 dias.

💬 Cliente foi redirecionado automaticamente. Se necessário, envie o link novamente.
```

---

## 💼 **4. CLIENTE CADASTRA WALLET**

**Cliente acessa:** `https://onboarding.1a1cripto.com/wallet?token=...`

1. Sistema valida token
2. Renderiza termo de wallet preenchido
3. Cliente informa endereço TRC-20
4. Validação em tempo real:
   - 34 caracteres
   - Começa com "T"
   - Formato válido
5. Cliente confirma (checkboxes + botão)
6. Sistema:
   - Valida via Chainalysis KYT (se integrado)
   - Salva wallet no banco
   - Gera PDF do termo

**Notificação no grupo interno:**
```
✅ WALLET CADASTRADA

Tipo: Pessoa Jurídica
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Data: 31/10/2025, 15:10:00

💼 Wallet TRC-20: T1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7

✅ Cadastro completo!

📊 Status KYT: Aprovado (se integrado)
🔒 Wallet adicionada à whitelist.

💬 Cliente pode começar a operar na plataforma OTC.
```

**Você ou compliance officer:**
- Confirma que a wallet foi validada
- Adiciona wallet na whitelist da Fireblocks (se necessário)
- Libera cliente para operar

---

## 🎯 **VANTAGENS DESTE FLUXO:**

### ✅ **Para você e compliance:**
- Recebe TUDO no grupo interno de onboarding
- Links prontos para copiar e colar
- Controle total sobre quando enviar
- Histórico completo de cada etapa
- Pode adicionar bot no grupo com cliente quando quiser

### ✅ **Para o cliente:**
- Experiência profissional
- Links mágicos (sem login/senha)
- Dados preenchidos automaticamente
- Redirecionamento automático entre etapas
- PDFs para download

### ✅ **Para o sistema:**
- 100% rastreável (IP, timestamp, User-Agent)
- PDFs salvos para auditoria
- Tokens seguros com expiração
- Validações automáticas
- Integração com BrasilAPI e Chainalysis

---

## 📊 **EXEMPLO DE NOTIFICAÇÃO COMPLETA NO GRUPO INTERNO:**

```
✅ ONBOARDING APROVADO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DADOS DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tipo: Pessoa Jurídica
Razão Social: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Email: contato@empresa.com
Telefone: (11) 98765-4321
ID: cnpj_12345678000190

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 PRÓXIMA ETAPA: CONTRATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 Link para assinatura:
https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-7890-abcd-ef1234567890

⏰ Válido por: 7 dias
📅 Expira em: 07/11/2025, 14:35:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 AÇÃO NECESSÁRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Copie e envie o link acima para o cliente assinar o contrato.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ **APROVAÇÃO:**

Este fluxo é:
- ✅ **Semi-automatizado** - Sistema gera links, você envia manualmente
- ✅ **Profissional** - Cliente tem experiência fluida
- ✅ **Controlado** - Você decide quando enviar cada etapa
- ✅ **Rastreável** - Tudo registrado no banco
- ✅ **Escalável** - Funciona para 1 ou 1000 clientes

**Posso começar a implementar?**


