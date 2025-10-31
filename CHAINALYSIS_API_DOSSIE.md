# 📚 Dossiê Completo - Chainalysis API

**Data:** 31/10/2025  
**Autor:** Análise completa da documentação oficial  
**Objetivo:** Referência completa para integração futura

---

## 🔍 **1. ADDRESS SCREENING API**

### **Descrição:**
API para screening de wallets e endereços de contratos para avaliar riscos.

### **Casos de uso:**
- Screening de wallets de clientes antes de aceitar transações
- Controle de acesso a dApps baseado em risco
- Avaliação de riscos em pools de liquidez

### **Introdução:**



### **Base URL:**
```
https://api.chainalysis.com/api/risk
```

### **Autenticação:**
```
Header: Token: {YOUR_API_KEY}
```

### **Rate Limits:**
- **40 requests por segundo**
- Status code `429` se exceder

### **Segurança:**
- HTTPS com TLS 1.2
- Todas as transmissões criptografadas

### **Suporte:**
- ⚠️ **Apenas mainnet** (testnet não suportado)

### **Códigos HTTP:**
- `2xx` - Sucesso
- `4xx` - Erro do cliente (parâmetros incorretos)
- `5xx` - Erro do servidor

---

## **📌 ENDPOINTS DISPONÍVEIS:**

### **1. GET /api/risk/v2/entities/:address**
**Descrição:** Recupera avaliação de risco de um endereço




**Path:** `/api/risk/v2/entities/:address`

**Método:** GET

**Autenticação:** Token header

**Path Parameters:**
- `address` (string, required) - O endereço para avaliar

**Query Parameters:**
- `memo` (string, optional) - Memo opcional para associar com a requisição

**Response (200 - Success):**
```json
{
  "address": "0x0038AC785dfB6C8b2c9A7B3B6854e08a10cD9",
  "risk": "Low",  // Low | Medium | High | Severe
  "riskReason": null,
  "addressType": "PRIVATE_WALLET",  // PRIVATE_WALLET | LIQUIDITY_POOL
  "cluster": null,
  "addressIdentifications": [],
  "exposures": [
    {
      "category": "exchange",
      "value": 424895.68594
    },
    {
      "category": "fee",
      "value": 1108.16272
    },
    {
      "category": "unnamed service",
      "value": 3612152.81483
    }
  ],
  "triggers": [],
  "status": "COMPLETE"
}
```

**Campos de resposta:**
- `address` - Endereço solicitado
- `risk` - Avaliação de risco (Low, Medium, High, Severe)
- `riskReason` - Explicação legível do risco
- `addressType` - Tipo do endereço (PRIVATE_WALLET ou LIQUIDITY_POOL)
- `cluster` - Informações sobre o cluster (se aplicável)
- `addressIdentifications` - Identificações conhecidas do endereço
- `exposures` - Lista de exposições a diferentes categorias
- `triggers` - Lista de regras de exposição acionadas
- `status` - Status da verificação (COMPLETE)

---




### **2. POST /api/risk/v2/entities**
**Descrição:** Registra um endereço (LEGACY - não mais necessário)

**Path:** `/api/risk/v2/entities`

**Método:** POST

**⚠️ NOTA IMPORTANTE:** Este é um endpoint legado. Não é mais necessário registrar endereços antes de fazer screening. Use diretamente o GET endpoint para recuperar avaliações de risco.

**Request Body:**
```json
{
  "address": "0x0038AC785dfB6C8b2c9A7B3B6854e08a10cD9"
}
```

**Response (200 - Success):**
```json
{
  "address": "0x0038AC785dfB6C8b2c9A7B3B6854e08a10cD9"
}
```

---

## **🎯 CASOS DE USO PARA 1A1CRIPTO:**

### **Screening de Wallet TRC-20:**

**Fluxo recomendado:**
1. Cliente cadastra wallet TRC-20 no sistema
2. Sistema chama `GET /api/risk/v2/entities/{wallet_address}`
3. Recebe avaliação de risco (Low, Medium, High, Severe)
4. **Decisão automática ou manual:**
   - `Low` → Aprovar automaticamente
   - `Medium` → Revisar manualmente
   - `High` → Rejeitar ou revisar com atenção
   - `Severe` → Rejeitar automaticamente

**Exemplo de integração:**
```typescript
async function screenWallet(address: string): Promise<RiskAssessment> {
  const response = await fetch(
    `https://api.chainalysis.com/api/risk/v2/entities/${address}`,
    {
      headers: {
        'Token': process.env.CHAINALYSIS_API_KEY!
      }
    }
  );
  
  return await response.json();
}
```

---




## **📦 PRODUTOS DISPONÍVEIS NA CHAINALYSIS:**

### **1. KYT (Know Your Transaction)**
**Descrição:** Registrar deposits e withdrawals para recuperar alertas e verificar risco de contraparte

**Caso de uso:** Monitoramento contínuo de transações

**Status para 1A1Cripto:** ❌ **NÃO NECESSÁRIO** (você já tem KYT via Fireblocks)

---

### **2. Sentinel**
**Descrição:** Recuperar alertas para ativos no seu ecossistema

**Caso de uso:** Monitoramento de ativos específicos

**Status para 1A1Cripto:** ⚠️ **AVALIAR** (pode ser útil para monitorar wallets de clientes)

---

### **3. Address Screening** ✅
**Descrição:** Screening de wallets e endereços de contratos para avaliação de risco

**Caso de uso:** Verificação de wallets de clientes antes de aceitar

**Status para 1A1Cripto:** ✅ **RECOMENDADO** (perfeito para o fluxo de onboarding)

---

### **4. Free Sanctions Screening**
**Descrição:** Verificar se endereços blockchain têm designações de sanções

**Caso de uso:** Verificação de sanções (OFAC, etc.)

**Status para 1A1Cripto:** ✅ **RECOMENDADO** (compliance obrigatório)

---




# 🚨 **FREE SANCTIONS SCREENING API**

## **Visão Geral:**

API **GRATUITA** para verificar se um endereço blockchain está em listas de sanções (OFAC, etc.)

**Base URL:** `https://public.chainalysis.com`

**Autenticação:** Header `X-API-Key`

**Rate Limiting:** 5000 requests por 5 minutos

**Como obter API key:** Fazer sign up em https://public.chainalysis.com/

---

## **Endpoint:**

### **GET /api/v1/address/:addressToCheck**
**Descrição:** Verifica se um endereço está sancionado

**Path:** `/api/v1/address/:addressToCheck`

**Método:** GET

**Autenticação:** `X-API-Key` header

**Path Parameters:**
- `addressToCheck` (string, required) - O endereço para verificar (case-sensitive)

**Response (200 - Success):**
```json
{
  "identifications": [
    {
      "category": "sanctions",
      "name": "SANCTIONS: OFAC SDN Secondeye Solution : 2019-11-05",
      "description": "Pakistan-based Secondeye Solution",
      "url": "https://home.treasury.gov/news/press-releases/sm845"
    }
  ]
}
```

**Response (200 - No sanctions):**
```json
{
  "identifications": []
}
```

**Campos de resposta:**
- `identifications` - Array de identificações de sanções
  - `category` - Categoria (sempre "sanctions")
  - `name` - Nome da sanção
  - `description` - Descrição da entidade sancionada
  - `url` - Link para mais informações

**Errors:**
- `400` - Bad Request Error (endereço inválido)

---

## **🎯 CASO DE USO PARA 1A1CRIPTO:**

### **Verificação obrigatória de sanções:**

**Fluxo recomendado:**
1. Cliente cadastra wallet TRC-20
2. **PRIMEIRO:** Chamar Sanctions API (gratuita, rápida)
3. Se `identifications` não estiver vazio → **REJEITAR IMEDIATAMENTE**
4. Se `identifications` estiver vazio → Prosseguir com Address Screening API

**Vantagens:**
- ✅ **Gratuita** - Não consome créditos
- ✅ **Rápida** - Verificação instantânea
- ✅ **Compliance** - Atende requisitos regulatórios
- ✅ **Bloqueio imediato** - Impede onboarding de wallets sancionadas

**Exemplo de integração:**
```typescript
async function checkSanctions(address: string): Promise<boolean> {
  const response = await fetch(
    `https://public.chainalysis.com/api/v1/address/${address}`,
    {
      headers: {
        'X-API-Key': process.env.CHAINALYSIS_SANCTIONS_API_KEY!
      }
    }
  );
  
  const data = await response.json();
  return data.identifications.length > 0; // true = sanctioned
}
```

---




# 🔔 **SENTINEL API**

## **Visão Geral:**

API para monitorar atividade on-chain de ativos, recebendo alertas quando transações correspondem a critérios especificados.

**Caso de uso:** Monitoramento contínuo de wallets de clientes após aprovação

**Fluxo:**
1. Cliente é aprovado e wallet é cadastrada
2. Adicionar wallet ao Sentinel para monitoramento
3. Configurar regras de alerta (ex: transações suspeitas, alto volume, etc.)
4. Receber alertas via API quando atividade corresponder aos critérios

---

## **🎯 CASO DE USO PARA 1A1CRIPTO:**

### **Monitoramento pós-onboarding:**

**Cenário:**
- Cliente aprovado e wallet cadastrada
- Sentinel monitora continuamente a wallet
- Alertas são gerados se:
  - Wallet recebe fundos de endereço de risco
  - Wallet envia fundos para endereço suspeito
  - Volume de transações anormal
  - Interação com contratos de alto risco

**Vantagens:**
- ✅ **Monitoramento contínuo** - Não apenas no onboarding
- ✅ **Alertas proativos** - Notificação quando algo suspeito acontece
- ✅ **Compliance contínuo** - Atende requisitos de monitoramento ongoing

**Status para 1A1Cripto:** ⚠️ **AVALIAR** 
- Pode ser útil para monitorar wallets de clientes VIP
- Pode ser overkill se você já tem KYT via Fireblocks
- **Recomendação:** Avaliar após implementar Address Screening

---




---

# 🎯 **RECOMENDAÇÕES FINAIS PARA 1A1CRIPTO**

## **Prioridade de Implementação:**

### **1. FREE SANCTIONS SCREENING** ✅ **IMPLEMENTAR IMEDIATAMENTE**
**Por quê:**
- ✅ **Gratuita** - Sem custo adicional
- ✅ **Obrigatória** - Compliance regulatório
- ✅ **Rápida** - Verificação instantânea
- ✅ **Simples** - 1 endpoint apenas

**Quando usar:** SEMPRE, antes de qualquer outra verificação

**Implementação:**
```typescript
// 1. Verificar sanções (gratuito, obrigatório)
const isSanctioned = await checkSanctions(walletAddress);
if (isSanctioned) {
  return reject('Wallet está em lista de sanções');
}

// 2. Prosseguir com Address Screening (se não sancionada)
const riskAssessment = await screenAddress(walletAddress);
```

---

### **2. ADDRESS SCREENING** ✅ **IMPLEMENTAR EM SEGUIDA**
**Por quê:**
- ✅ **Avaliação de risco** - Low, Medium, High, Severe
- ✅ **Decisão informada** - Dados para aprovar/rejeitar
- ✅ **Exposições detalhadas** - Ver categorias de risco
- ✅ **Compliance** - Atende requisitos de KYC/AML

**Quando usar:** Após verificar sanções, antes de aprovar wallet

**Implementação:**
```typescript
// Após verificar sanções
const risk = await screenAddress(walletAddress);

if (risk.risk === 'Severe' || risk.risk === 'High') {
  return reject('Wallet com risco muito alto');
}

if (risk.risk === 'Medium') {
  return requireManualReview('Wallet com risco médio');
}

// Low risk -> aprovar
return approve();
```

---

### **3. SENTINEL** ⚠️ **AVALIAR DEPOIS**
**Por quê:**
- ⚠️ **Pode ser redundante** - Você já tem KYT via Fireblocks
- ⚠️ **Custo adicional** - Pode não valer a pena
- ✅ **Útil para VIPs** - Monitoramento extra de clientes importantes

**Quando usar:** Apenas para clientes VIP ou de alto volume

**Recomendação:** Avaliar após implementar Address Screening

---

### **4. KYT** ❌ **NÃO IMPLEMENTAR**
**Por quê:**
- ❌ **Você já tem** - KYT via Fireblocks
- ❌ **Redundante** - Não agrega valor
- ❌ **Custo desnecessário** - Pagaria duas vezes

**Recomendação:** Continuar usando Fireblocks para KYT

---

## **🚀 FLUXO COMPLETO RECOMENDADO:**

### **Cadastro de Wallet no Onboarding:**

```
Cliente cadastra wallet TRC-20
   ↓
1. Validar formato (TRC-20)
   ↓
2. Chamar FREE SANCTIONS API ✅
   ├─ Se sanctioned → REJEITAR
   └─ Se clean → Continuar
   ↓
3. Chamar ADDRESS SCREENING API ✅
   ├─ Se Severe/High → REJEITAR
   ├─ Se Medium → REVISAR MANUALMENTE
   └─ Se Low → APROVAR
   ↓
4. Salvar wallet no banco
   ↓
5. Notificar via WhatsApp
   ↓
6. Cliente liberado para operar
```

---

## **📊 CUSTOS ESTIMADOS:**

### **Free Sanctions Screening:**
- **Custo:** $0 (gratuita)
- **Rate limit:** 5000 requests / 5 minutos
- **Suficiente para:** Ilimitado

### **Address Screening:**
- **Custo:** Consultar Chainalysis (geralmente por request ou plano mensal)
- **Rate limit:** Depende do plano
- **Suficiente para:** Depende do volume de onboardings

**Recomendação:** Começar com plano básico e escalar conforme necessário

---

## **🔑 PRÓXIMOS PASSOS:**

1. ✅ **Obter API keys:**
   - Free Sanctions: https://public.chainalysis.com/ (sign up gratuito)
   - Address Screening: Contatar Chainalysis para pricing

2. ✅ **Implementar integração:**
   - Criar função `checkSanctions(address)`
   - Criar função `screenAddress(address)`
   - Adicionar ao fluxo de cadastro de wallet

3. ✅ **Testar:**
   - Testar com endereços sancionados conhecidos
   - Testar com endereços de diferentes níveis de risco
   - Validar fluxo completo

4. ✅ **Monitorar:**
   - Acompanhar taxa de rejeição
   - Ajustar critérios conforme necessário
   - Revisar casos de risco médio

---

**Fim do dossiê Chainalysis API** 📄


