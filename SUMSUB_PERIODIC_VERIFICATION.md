# Verificação Periódica no Sumsub

## 📋 O que é Periodic Verification?

A verificação periódica permite conduzir automaticamente a due diligence contínua para verificações KYC e KYB, minimizando riscos de compliance e otimizando operações diárias.

## ⚙️ Como funciona:

### Parâmetros principais:

1. **Dados do applicant** (país, tags, nível de risco, etc.)
2. **Timeframes** (dias desde registro, aprovação, etc.)
3. **Ações aplicadas** (resetar documentos, solicitar novos, etc.)

### Scheduler automático:

- Roda **diariamente às 00:00 CET**
- Aplica lógica de recheck **apenas para applicants aprovados**

---

## 🎯 Casos de uso para 1A1 Cripto:

### Para PJ (Pessoa Jurídica):

**A cada 3 ou 6 meses, solicitar:**
- Declaração de faturamento atualizada
- Novos recibos da IN1888 (últimos 3)
- Atualização de Balanço e DRE
- Confirmação de endereço da empresa
- Verificação de UBOs em listas de sanções

### Para PF (Pessoa Física):

**A cada 6 ou 12 meses, solicitar:**
- Comprovante de residência atualizado (máx. 90 dias)
- Verificação de liveness (selfie ao vivo)
- Confirmação de dados cadastrais

---

## 🔧 Como configurar:

### Passo 1: Criar regra customizada

1. No Dashboard, vá para **Transactions and travel rule**
2. Acesse a página **Rules**
3. Clique em **Create rule**
4. Dê um nome descritivo (ex: "Reverificação PJ Trimestral")

### Passo 2: Configurar condições do scheduler

**Opção A: Time since a level was completed**
- Escolha o nível (ex: "basic-kyc-level")
- Defina o período (ex: 90 dias para trimestral, 180 dias para semestral)

**Opção B: Custom condition**
- Filtre por tags (ex: "empresa_aprovada")
- Filtre por país, source key, etc.

### Passo 3: Definir ações

Em **Affect applicant**, escolha as ações:

**Para atualização de documentos:**
- ✅ **Reset steps** → Marque os documentos que precisam ser reenviados
  - Declaração de faturamento
  - Recibos IN1888
  - Comprovante de endereço

**Para novo nível de verificação:**
- Criar um nível separado "re-verification-level"
- Solicitar apenas os documentos necessários

### Passo 4: Testar configuração

- Clique em **Trigger event immediately** para testar
- O sistema mostrará applicants de exemplo que atendem a condição

### Passo 5: Salvar e ativar

- Clique em **Create rule**
- A regra entrará em vigor no próximo dia às 00:00 CET

---

## 💡 Recomendações para 1A1 Cripto:

### Regra 1: Reverificação Trimestral PJ (Alto Volume)

**Condição:**
- Applicants do tipo "company"
- 90 dias desde a última aprovação
- Tag: "high_volume" (empresas com alto volume de transações)

**Ações:**
- Solicitar Declaração de Faturamento
- Solicitar últimos 3 Recibos IN1888
- Notificar por email

### Regra 2: Reverificação Semestral PJ (Volume Normal)

**Condição:**
- Applicants do tipo "company"
- 180 dias desde a última aprovação
- Sem tag "high_volume"

**Ações:**
- Solicitar Declaração de Faturamento
- Solicitar Balanço e DRE
- Solicitar últimos 3 Recibos IN1888

### Regra 3: Reverificação Anual PF

**Condição:**
- Applicants do tipo "individual"
- 365 dias desde a última aprovação

**Ações:**
- Solicitar novo comprovante de residência
- Solicitar liveness check

---

## 📊 Visualizar resultados:

1. Acesse a tabela **Transactions** no Dashboard
2. Aplique o filtro **Type** → **Scheduled event**
3. Veja os eventos agendados para cada applicant

---

## 🔗 Integração com o sistema atual:

### Webhook notifications:

Quando um applicant entra em reverificação, o Sumsub envia um webhook com:
- Event: `applicantPending` ou `applicantResubmissionRequested`
- Status: `onHold` ou `pending`

### Notificações WhatsApp:

O sistema atual já está preparado para receber esses eventos e notificar via WhatsApp automaticamente.

---

## 📚 Referências:

- Documentação oficial: https://docs.sumsub.com/docs/periodic-verification
- Artigo sobre reverificação: https://sumsub.com/blog/customer-reverification-what-it-is-and-why-it-matters-complete-guide/


