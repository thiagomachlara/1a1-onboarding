# Análise de UI - Sistema de Onboarding 1A1 Cripto

**Data:** 2025-10-31  
**URL:** https://onboarding.1a1cripto.com

---

## 📄 Página 1: Home / Seleção de Tipo

### ✅ Elementos presentes:

- Logo 1A1 Cripto
- Botão "Voltar para o site"
- Título: "Bem-vindo à 1A1 Cripto"
- Subtítulo: "Verificação de Cadastro Segura e Rápida"
- Descrição: "Complete seu cadastro em poucos minutos e comece a negociar USDT com segurança"

### 📋 Seção "Como funciona?":

1. **Informações Básicas**
   - Preencha seus dados pessoais ou da empresa

2. **Envio de Documentos**
   - Faça upload dos documentos necessários de forma segura

3. **Verificação**
   - Nossa equipe analisa seus documentos em até 24 horas

### 🎯 Cards de seleção:

**Pessoa Física**
- Descrição: "Para indivíduos que desejam negociar criptomoedas"
- Botão: "Iniciar verificação →"

**Pessoa Jurídica**
- Descrição: "Para empresas e intermediadores de criptomoedas"
- Botão: "Iniciar verificação →"

---

## 🔍 Observações iniciais:

### ✅ Pontos positivos:
- Design limpo e profissional
- Hierarquia visual clara
- Explicação do processo em 3 passos
- Diferenciação clara entre PF e PJ

### ⚠️ Pontos a considerar:
- Verificar textos nas próximas páginas
- Analisar formulários
- Verificar mensagens de feedback

---



## 📄 Página 2: Verificação de Pessoa Física

### ✅ Elementos presentes:

**Header:**
- Logo 1A1 Cripto
- Botão "← Voltar"

**Título:**
- "Verificação de Pessoa Física"
- Subtítulo: "Complete o processo de verificação para começar a negociar USDT"

**Formulário:**
- Ícone de usuário
- Título: "Informe seu CPF"
- Descrição: "Digite seu CPF para iniciar o processo de verificação"
- Label: "CPF"
- Input com placeholder: "000.000.000-00"
- Botão: "Iniciar Verificação"

**Aviso de segurança:**
- 🔒 Ícone de cadeado
- Título: "Seus dados estão seguros"
- Texto: "Utilizamos seu CPF apenas para identificação única no sistema. Todas as informações são criptografadas e protegidas conforme a LGPD."

**Box informativo:**
- 📋 "Documentos necessários"
  - Documento de identidade com foto (RG, CNH ou RNE)
  - CPF
  - Comprovante de residência recente
  - Selfie para verificação facial

---

### 🔍 Análise:

#### ✅ Pontos positivos:
- Aviso de segurança LGPD tranquiliza o usuário
- Lista de documentos necessários antecipa o que será pedido
- Input com máscara de CPF
- Design limpo e objetivo

#### ⚠️ Sugestões de melhoria:
- [ ] Considerar adicionar exemplo de CPF válido
- [ ] Validação em tempo real do CPF
- [ ] Mensagem de erro clara caso CPF seja inválido

---



## 📄 Página 3: Verificação de Pessoa Jurídica

### ✅ Elementos presentes:

**Header:**
- Logo 1A1 Cripto
- Botão "← Voltar"

**Título:**
- "Verificação de Pessoa Jurídica"
- Subtítulo: "Complete o processo de verificação empresarial para começar a negociar USDT"

**Formulário:**
- Ícone de prédio/empresa
- Título: "Informe o CNPJ da Empresa"
- Descrição: "Digite o CNPJ para iniciar o processo de verificação empresarial"
- Label: "CNPJ"
- Input com placeholder: "00.000.000/0000-00"
- Botão: "Iniciar Verificação"

**Aviso de segurança:**
- 🔒 Ícone de cadeado
- Título: "Seus dados estão seguros"
- Texto: "Utilizamos o CNPJ apenas para identificação única no sistema. Todas as informações são criptografadas e protegidas conforme a LGPD."

**Box informativo:**
- 📋 "Documentos necessários"
  - Contrato Social ou Estatuto Social
  - Cartão CNPJ atualizado
  - Quadro de Sócios e Administradores (QSA)
  - Comprovante de endereço da empresa
  - Documentos pessoais dos representantes legais

---

### 🔍 Análise:

#### ✅ Pontos positivos:
- Estrutura similar à página de PF (consistência)
- Lista completa de documentos necessários para PJ
- Aviso de segurança LGPD
- Input com máscara de CNPJ

#### ⚠️ Sugestões de melhoria:
- [ ] Considerar adicionar exemplo de CNPJ válido
- [ ] Validação em tempo real do CNPJ
- [ ] Mensagem de erro clara caso CNPJ seja inválido

---



## 📄 Página 4: Tela de Verificação Sumsub (PJ)

### ✅ Elementos presentes:

**Header:**
- Logo 1A1 Cripto
- Botão "← Voltar"

**Confirmação de CNPJ:**
- ✅ Ícone de check verde
- Texto: "CNPJ: 11.222.333/0001-81"
- Botão: "← Alterar CNPJ"

**Widget Sumsub:**
- Logo 1A1 Cripto
- Título: "Verificação para 1A1 Cripto"
- Seletor de idioma: "🌐 Pt-br"
- Texto de aviso: "Você está prestes a enviar dados confidenciais para 1A1 Cripto. Se você tiver recebido este link de uma fonte suspeita, feche esta página e notifique-nos imediatamente."
- Botão: "Continuar"
- Rodapé: "Powered by ⚡ sumsub"

---

### 🔍 Análise:

#### ✅ Pontos positivos:
- Confirmação clara do CNPJ digitado
- Opção de alterar CNPJ antes de continuar
- Aviso de segurança do Sumsub
- Seletor de idioma visível
- Interface limpa e profissional

#### ⚠️ Observações:
- A partir daqui, o fluxo é controlado pelo Sumsub
- O usuário será guiado pelo processo de upload de documentos
- Importante: Após conclusão, o usuário deve ser redirecionado para uma página de sucesso

---



## 📄 Página 5: Verificação Enviada com Sucesso

### ✅ Elementos presentes:

**Header:**
- Logo 1A1 Cripto (centralizado)

**Conteúdo principal:**
- ✅ Ícone de check verde em círculo
- Título: "Verificação Enviada com Sucesso!"
- Texto: "Seu cadastro de **Pessoa Física** foi recebido."
- Subtexto: "Nossa equipe irá analisar seus documentos em até 24 horas úteis."

**Box "Próximos passos":**
- ✅ **Análise de documentos:** Nossa equipe de compliance verificará todos os documentos enviados
- ✅ **Notificação por e-mail:** Você receberá um e-mail assim que a análise for concluída
- ✅ **Aprovação:** Após aprovação, você poderá começar a negociar USDT imediatamente

**Seção "Precisa de ajuda?":**
- Link: thiago.lara@1a1cripto.com
- Link: compliance@1a1cripto.com

**Rodapé:**
- Botão: "Voltar para o site principal"
- Texto: "Redirecionando automaticamente em X segundos..."

---

### 🔍 Análise:

#### ✅ Pontos positivos:
- Confirmação visual clara de sucesso
- Expectativa de tempo definida (24 horas)
- Próximos passos bem explicados
- Contatos de suporte visíveis
- Redirecionamento automático

#### ⚠️ Pontos de melhoria identificados:

1. **Texto dinâmico de tipo:**
   - Atualmente mostra "Pessoa Física" fixo
   - Deveria ser dinâmico: "Pessoa Física" ou "Pessoa Jurídica"

2. **E-mails de contato:**
   - Verificar se estão corretos e ativos
   - Considerar adicionar WhatsApp/telefone

3. **Redirecionamento:**
   - Verificar para onde redireciona (site principal?)
   - Tempo de 10 segundos pode ser muito longo

---




---

## 📊 Resumo Geral da Análise

### ✅ Pontos Fortes do Sistema:

1. **Design consistente** em todas as páginas
2. **Fluxo claro e objetivo** para PF e PJ
3. **Avisos de segurança LGPD** presentes
4. **Integração com Sumsub** funcionando
5. **Página de sucesso dinâmica** (tipo PF/PJ detectado via query param)
6. **Redirecionamento automático** após conclusão

### ⚠️ Melhorias Recomendadas:

#### 🔴 **Alta Prioridade:**

1. **Validação de CPF/CNPJ em tempo real**
   - Adicionar feedback visual se o documento é válido
   - Mostrar mensagem de erro clara se inválido
   - Bloquear botão "Iniciar Verificação" se documento inválido

2. **Mensagens de erro**
   - Criar componente de toast/alerta para erros
   - Feedback claro se o Sumsub não carregar
   - Tratamento de erros de rede

#### 🟡 **Média Prioridade:**

3. **Melhorar textos informativos**
   - Adicionar exemplos de documentos aceitos
   - Explicar melhor o que é cada documento (QSA, etc.)
   - Adicionar FAQs inline

4. **Contatos de suporte**
   - Adicionar WhatsApp/telefone
   - Considerar chat ao vivo
   - Horário de atendimento

5. **Tempo de redirecionamento**
   - Reduzir de 10 para 5 segundos
   - Adicionar botão "Pular" para redirecionar imediatamente

#### 🟢 **Baixa Prioridade:**

6. **Acessibilidade**
   - Adicionar labels ARIA
   - Melhorar contraste de cores
   - Navegação por teclado

7. **Responsividade**
   - Testar em dispositivos móveis
   - Ajustar tamanhos de fonte
   - Melhorar espaçamentos

---

## 🎯 Sugestões de Implementação Imediata:

### 1. Validação de CPF/CNPJ

Adicionar biblioteca de validação:
```bash
pnpm add @brazilian-utils/brazilian-utils
```

### 2. Feedback visual de erro

Criar componente de toast para mensagens de erro/sucesso.

### 3. Melhorar textos

Revisar todos os textos para torná-los mais claros e objetivos.

---


