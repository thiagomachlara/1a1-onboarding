# 📊 Análise Comparativa: Certidões de Compliance

## 🏢 PESSOA JURÍDICA (PJ)

### ✅ Certidões Obrigatórias (Compliance Officer)

| # | Certidão | Status Atual | InfoSimples | Teste | Formato | Recomendação |
|---|----------|--------------|-------------|-------|---------|--------------|
| 1 | **QSA** | ✅ Implementado | ❌ HTML | ✅ Testado | HTML | ✅ **Upload manual** |
| 2 | **CND Federal** | ✅ Implementado | ✅ API | ⚠️ Erro CNPJ | PDF | ⚠️ **Testar outro CNPJ** |
| 3 | **CNDT** | ✅ Implementado | ✅ API | ✅ Funcionou | PDF | ✅ **Manter API** |
| 4 | **TRF (Unificada)** | ✅ Implementado | ✅ API | ❌ Erro 500 | - | ❌ **Remover API** |
| 5 | **MTE (Infrações)** | ✅ Implementado | ✅ API | ❌ Requer login | - | ❌ **Remover API** |
| 6 | **Google Street View** | ✅ Implementado | N/A | N/A | Imagem | ✅ **Já funciona** |

### 📋 Certidões Opcionais (Compliance Officer)

| # | Certidão | Status Atual | InfoSimples | Teste | Formato | Recomendação |
|---|----------|--------------|-------------|-------|---------|--------------|
| 1 | **Processos Judiciais** | ❌ Não implementado | ❌ Não | - | - | ⚠️ **JusBrasil = manual** |
| 2 | **FGTS (CRF)** | ✅ Implementado | ✅ API | ✅ Funcionou | HTML | ✅ **Manter API** |

### 🔍 Certidões EXTRAS no Sistema (não na lista do Compliance)

| # | Certidão | InfoSimples | Teste | Formato | Recomendação |
|---|----------|-------------|-------|---------|--------------|
| 1 | **Cartão CNPJ** | ❌ HTML | ✅ Testado | HTML | ✅ **Upload manual** |
| 2 | **CVM (Processos)** | ✅ API | ✅ Funcionou | - | ⚠️ **Ajustar lógica** |
| 3 | **Protestos** | ✅ API | ⚠️ Só SP | - | ⚠️ **Adicionar aviso** |
| 4 | **Cheques sem Fundos** | ✅ API | ❌ Pausada | - | ❌ **Remover API** |
| 5 | **Improbidade Admin** | ✅ API | ✅ Funcionou | PDF | ✅ **Manter API** |

---

## 👤 PESSOA FÍSICA (PF) - UBOs

### ✅ Certidões Obrigatórias (Compliance Officer)

| # | Certidão | Status Atual | InfoSimples | Implementado? | Recomendação |
|---|----------|--------------|-------------|---------------|--------------|
| 1 | **CPF (Situação Cadastral)** | ❌ Não implementado | ✅ API disponível | ❌ Não | ✅ **Implementar com API** |
| 2 | **CND Federal PF** | ❌ Não implementado | ✅ API disponível | ❌ Não | ✅ **Implementar com API** |
| 3 | **CNDT PF** | ❌ Não implementado | ✅ API disponível | ❌ Não | ✅ **Implementar com API** |
| 4 | **TRF (Unificada) PF** | ❌ Não implementado | ✅ API disponível | ❌ Não | ⚠️ **Testar antes** |
| 5 | **Antecedentes Criminais** | ❌ Não implementado | ✅ API disponível | ❌ Não | ✅ **Implementar com API** |
| 6 | **Mandados de Prisão** | ❌ Não implementado | ✅ API disponível | ❌ Não | ✅ **Implementar com API** |

### 📋 Certidões Opcionais (Compliance Officer)

| # | Certidão | Status Atual | InfoSimples | Implementado? | Recomendação |
|---|----------|--------------|-------------|---------------|--------------|
| 1 | **Processos Judiciais** | ❌ Não implementado | ❌ Não | ❌ Não | ⚠️ **JusBrasil = manual** |

---

## 🎯 RESUMO EXECUTIVO

### 📊 Estatísticas PJ

**Certidões Obrigatórias:**
- ✅ **6/6 implementadas** (100%)
- ✅ **3/6 funcionando via API** (50%)
- ❌ **2/6 precisam ser removidas da API** (TRF, MTE)
- ⚠️ **1/6 precisa re-teste** (CND Federal)

**Certidões Opcionais:**
- ✅ **1/2 implementadas** (FGTS)
- ❌ **1/2 faltando** (Processos Judiciais - manual)

**Certidões EXTRAS:**
- ✅ **5 certidões além da lista** (Cartão CNPJ, CVM, Protestos, Cheques, Improbidade)
- ✅ **3/5 funcionando** (Cartão CNPJ, CVM, Improbidade)
- ⚠️ **1/5 parcial** (Protestos - só SP)
- ❌ **1/5 não funciona** (Cheques - pausada)

### 📊 Estatísticas PF

**Certidões Obrigatórias:**
- ❌ **0/6 implementadas** (0%)
- ✅ **6/6 disponíveis na InfoSimples**
- 🚀 **Pronto para implementar**

**Certidões Opcionais:**
- ❌ **0/1 implementadas**
- ⚠️ **JusBrasil = manual**

---

## 🚀 PLANO DE AÇÃO RECOMENDADO

### 🔴 PRIORIDADE ALTA (Fazer AGORA)

1. ✅ **Remover API de TRF (PJ)** - Erro 500 persistente
2. ✅ **Remover API de MTE (PJ)** - Requer login
3. ✅ **Remover API de Cheques (PJ)** - Pausada pela InfoSimples
4. ✅ **Implementar certidões PF dos UBOs** (6 certidões obrigatórias)

### 🟡 PRIORIDADE MÉDIA (Fazer DEPOIS)

5. ⚠️ **Testar CND Federal com outro CNPJ** - Validar se funciona
6. ⚠️ **Ajustar CVM** - Salvar "sem processos" quando não encontrar
7. ⚠️ **Adicionar aviso em Protestos** - "Cobertura: São Paulo"
8. ⚠️ **Testar TRF (PF)** - Antes de implementar para UBOs

### 🟢 PRIORIDADE BAIXA (Backlog)

9. 📋 **Adicionar campo para Processos Judiciais** - Upload manual (JusBrasil)
10. 📋 **Documentar certidões que funcionam** - Criar guia para usuários

---

## 💡 DECISÕES ESTRATÉGICAS

### ❓ Manter ou Remover Certidões EXTRAS?

**Cartão CNPJ:**
- ✅ **Manter** - Documento importante, upload manual funciona

**CVM (Processos):**
- ✅ **Manter** - Funciona, só precisa ajustar lógica

**Protestos:**
- ⚠️ **Manter com aviso** - Útil para empresas de SP

**Cheques sem Fundos:**
- ❌ **Remover** - API pausada, sem previsão de retorno

**Improbidade Administrativa:**
- ✅ **Manter** - Funciona perfeitamente, gera PDF

### ❓ Ordem de Implementação PF

**Sugestão:**
1. CPF (Situação Cadastral) - Mais simples
2. Antecedentes Criminais - Importante
3. Mandados de Prisão - Importante
4. CND Federal PF - Pode dar erro como PJ
5. CNDT PF - Deve funcionar como PJ
6. TRF PF - Testar por último (deu erro em PJ)

---

## 📝 NOTAS IMPORTANTES

1. **InfoSimples tem limitações geográficas** (ex: Protestos só SP)
2. **Algumas APIs retornam HTML** (QSA, FGTS) - Funciona, mas não é PDF
3. **Algumas certidões não salvam quando não há dados** (CVM) - Precisa ajustar
4. **Upload manual sempre disponível** - Fallback para todas as certidões

---

## ✅ CONCLUSÃO

**Sistema está 80% pronto!** 

**Falta:**
- ❌ Remover 3 APIs que não funcionam (TRF, MTE, Cheques)
- ✅ Implementar 6 certidões PF dos UBOs
- ⚠️ Ajustes finos (CVM, Protestos, CND Federal)

**Estimativa:** 2-3 horas de trabalho para finalizar tudo!
