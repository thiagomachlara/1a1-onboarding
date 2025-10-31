# 📊 Parte 4: Criar Dashboard de Onboarding na Interface

## 📋 Contexto

Agora que o webhook está funcionando e salvando as notificações no banco, precisamos criar uma interface para visualizar e gerenciar os onboardings.

## 🎯 Objetivo

Criar uma nova aba "Onboarding" na sidebar do sistema, entre "Monitor Compras" e "Configurações", com uma dashboard completa para visualizar o status de todos os onboardings.

## 🗂️ Estrutura da Interface

### 1. Nova Aba na Sidebar

**Localização:** Entre "Monitor Compras" e "Configurações"  
**Nome:** "Onboarding"  
**Ícone:** 🆔 ou similar (ícone de identificação/documento)

### 2. Layout da Dashboard

A dashboard deve ter 3 seções principais:

#### **Seção 1: Cards de Estatísticas (topo)**
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   📋 Total  │  ⏳ Pendente │ ✅ Aprovados│ ❌ Rejeitados│ 🔍 Em Revisão│
│     125     │      15     │      95     │      10     │      5      │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

#### **Seção 2: Filtros**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Status: [Todos ▼]  Tipo: [Todos ▼]  Período: [Últimos 30 dias ▼]  │
└──────────────────────────────────────────────────────────────────────┘
```

#### **Seção 3: Tabela de Verificações**
```
┌────────────────────────────────────────────────────────────────────────┐
│ Nome/Empresa    │ Tipo │ Documento      │ Status      │ Data       │ Ações│
├────────────────────────────────────────────────────────────────────────┤
│ João Silva      │ PF   │ 123.456.789-00 │ ✅ Aprovado │ 30/10/2025 │ 👁️  │
│ Empresa XYZ     │ PJ   │ 12.345.678/... │ ⏳ Pendente │ 30/10/2025 │ 👁️  │
│ Maria Santos    │ PF   │ 987.654.321-00 │ ❌ Rejeitado│ 29/10/2025 │ 👁️  │
└────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementação

### Criar rota da página:

**Arquivo:** `/src/pages/Onboarding.tsx` (ou similar conforme estrutura do projeto)

### Componentes necessários:

1. **StatsCards** - Cards de estatísticas
2. **FiltersBar** - Barra de filtros
3. **OnboardingTable** - Tabela de verificações
4. **OnboardingDetailsModal** - Modal com detalhes ao clicar no ícone 👁️

## 📊 API Endpoints Necessários

### 1. Obter estatísticas:
```typescript
GET /api/onboarding/stats

Response:
{
  "total": 125,
  "pending": 15,
  "approved": 95,
  "rejected": 10,
  "under_review": 5
}
```

### 2. Listar verificações:
```typescript
GET /api/onboarding/verifications?status=all&type=all&period=30

Response:
{
  "verifications": [
    {
      "id": "uuid",
      "applicant_id": "individual_123",
      "applicant_name": "João Silva",
      "applicant_type": "individual",
      "applicant_document": "123.456.789-00",
      "status": "approved",
      "review_answer": "GREEN",
      "created_at": "2025-10-30T21:00:00Z",
      "updated_at": "2025-10-30T21:05:00Z"
    }
  ],
  "total": 125,
  "page": 1,
  "per_page": 20
}
```

### 3. Obter detalhes de uma verificação:
```typescript
GET /api/onboarding/verifications/:id

Response:
{
  "id": "uuid",
  "event": "applicant_reviewed",
  "applicant_id": "individual_123",
  "applicant_name": "João Silva",
  "applicant_type": "individual",
  "applicant_email": "joao@example.com",
  "applicant_document": "123.456.789-00",
  "status": "approved",
  "review_answer": "GREEN",
  "message": "Onboarding aprovado",
  "whatsapp_message": "...",
  "sent_to_whatsapp": true,
  "whatsapp_sent_at": "2025-10-30T21:00:00Z",
  "created_at": "2025-10-30T21:00:00Z",
  "history": [
    {
      "event": "applicant_created",
      "status": "created",
      "timestamp": "2025-10-30T20:45:00Z"
    },
    {
      "event": "applicant_pending",
      "status": "pending",
      "timestamp": "2025-10-30T20:50:00Z"
    },
    {
      "event": "applicant_reviewed",
      "status": "approved",
      "timestamp": "2025-10-30T21:00:00Z"
    }
  ]
}
```

## 🎨 Design Sugerido

### Cards de Estatísticas:
- Usar cores diferentes para cada status:
  - **Total:** Azul
  - **Pendente:** Amarelo/Laranja
  - **Aprovado:** Verde
  - **Rejeitado:** Vermelho
  - **Em Revisão:** Roxo

### Badges de Status na Tabela:
- ✅ **Aprovado:** Badge verde
- ❌ **Rejeitado:** Badge vermelho
- ⏳ **Pendente:** Badge amarelo
- 🔍 **Em Revisão:** Badge roxo
- 📋 **Criado:** Badge azul claro

### Tipos (PF/PJ):
- **PF:** Badge azul claro com "Pessoa Física"
- **PJ:** Badge azul escuro com "Pessoa Jurídica"

## 💡 Funcionalidades Adicionais

### Filtros:
1. **Status:**
   - Todos
   - Pendentes
   - Aprovados
   - Rejeitados
   - Em Revisão

2. **Tipo:**
   - Todos
   - Pessoa Física (PF)
   - Pessoa Jurídica (PJ)

3. **Período:**
   - Hoje
   - Últimos 7 dias
   - Últimos 30 dias
   - Últimos 90 dias
   - Personalizado (date picker)

### Ações na Tabela:
- 👁️ **Ver Detalhes:** Abre modal com informações completas
- 🔗 **Abrir no Sumsub:** Link direto para o dashboard do Sumsub (se disponível)

### Modal de Detalhes:
Mostrar:
- Informações completas do aplicante
- Histórico de eventos (timeline)
- Status atual com badge
- Documentos enviados (se disponível)
- Mensagem enviada para WhatsApp
- Data/hora de cada evento

## 📝 Checklist de Implementação

- [ ] Adicionar nova aba "Onboarding" na sidebar (entre Monitor Compras e Configurações)
- [ ] Criar página `/onboarding` com layout da dashboard
- [ ] Implementar componente StatsCards
- [ ] Implementar componente FiltersBar
- [ ] Implementar componente OnboardingTable
- [ ] Implementar componente OnboardingDetailsModal
- [ ] Criar endpoint GET `/api/onboarding/stats`
- [ ] Criar endpoint GET `/api/onboarding/verifications`
- [ ] Criar endpoint GET `/api/onboarding/verifications/:id`
- [ ] Implementar queries SQL para buscar dados
- [ ] Adicionar paginação na tabela
- [ ] Adicionar ordenação por colunas
- [ ] Testar filtros
- [ ] Testar modal de detalhes

## 🧪 Como Testar

1. **Acessar a nova aba:**
   - Clicar em "Onboarding" na sidebar
   - Verificar se a página carrega

2. **Verificar cards de estatísticas:**
   - Devem mostrar números corretos do banco
   - Atualizar ao aplicar filtros

3. **Testar filtros:**
   - Filtrar por status
   - Filtrar por tipo (PF/PJ)
   - Filtrar por período
   - Verificar se a tabela atualiza corretamente

4. **Testar tabela:**
   - Verificar se mostra dados corretos
   - Testar paginação
   - Testar ordenação

5. **Testar modal de detalhes:**
   - Clicar no ícone 👁️
   - Verificar se mostra informações completas
   - Verificar histórico de eventos

## 🎯 Resultado Esperado

Após implementar esta parte, você terá uma dashboard completa onde pode:
- ✅ Ver estatísticas gerais de onboarding
- ✅ Filtrar verificações por status, tipo e período
- ✅ Ver lista de todos os onboardings
- ✅ Ver detalhes completos de cada verificação
- ✅ Acompanhar o histórico de cada aplicante

---

**Esta é a última parte da implementação!** Após concluir, o sistema estará completo com:
1. ✅ Webhook recebendo notificações
2. ✅ Salvando no banco de dados
3. ✅ Enviando para WhatsApp via Maytapi
4. ✅ Dashboard para visualização e gestão

**Boa implementação! Qualquer dúvida, me avise!** 🚀

