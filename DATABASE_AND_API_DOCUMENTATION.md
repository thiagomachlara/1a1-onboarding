

_# Documentação do Banco de Dados e API - 1A1 Onboarding_

**Autor:** Manus AI  
**Data:** 2025-10-31

## 1. Introdução

Este documento detalha a arquitetura do banco de dados PostgreSQL no Supabase e a biblioteca de funções TypeScript (`/src/lib/supabase-db.ts`) desenvolvida para interagir com ele. O sistema foi projetado para gerenciar o fluxo de onboarding de clientes (KYC/KYB), persistindo dados recebidos via webhooks do Sumsub e enriquecendo-os com informações de negócio.

A estrutura é composta por três tabelas principais, duas views para consultas agregadas e um conjunto de funções server-side para manipulação e consulta dos dados de forma segura e eficiente.



## 2. Schema do Banco de Dados

O schema foi projetado para ser robusto e escalável, com normalização dos dados em três tabelas principais, além de índices para performance e views para simplificar consultas comuns.

### 2.1. Tabela `applicants`

Armazena os dados de identificação e o estado atual de cada cliente (applicant) no processo de verificação.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | `UUID` | Chave primária única (gerada automaticamente). |
| `external_user_id` | `TEXT` | **Chave de negócio principal.** Identificador único no formato `cpf_xxx` ou `cnpj_xxx`. |
| `applicant_id` | `TEXT` | ID do applicant no sistema do Sumsub. |
| `inspection_id` | `TEXT` | ID da inspeção (verificação) no Sumsub. |
| `applicant_type` | `TEXT` | Tipo de applicant: `individual` ou `company`. |
| `current_status` | `TEXT` | Status atual do processo: `created`, `pending`, `approved`, `rejected`, `onHold`. |
| `review_answer` | `TEXT` | Resposta da análise do Sumsub: `GREEN`, `RED`, `YELLOW`. |
| `document_number` | `TEXT` | CPF ou CNPJ (apenas números). |
| `full_name` | `TEXT` | Nome completo (PF) ou Razão Social (PJ). |
| `email` | `TEXT` | Endereço de e-mail principal. |
| `phone` | `TEXT` | Número de telefone principal. |
| `created_at` | `TIMESTAMPTZ` | Data e hora de criação do registro. |
| `updated_at` | `TIMESTAMPTZ` | Data e hora da última atualização (atualizado via trigger). |
| `first_verification_at` | `TIMESTAMPTZ` | Data da primeira verificação. |
| `last_verification_at` | `TIMESTAMPTZ` | Data da última verificação. |
| `approved_at` | `TIMESTAMPTZ` | Data da aprovação. |
| `rejected_at` | `TIMESTAMPTZ` | Data da rejeição. |
| `sumsub_level_name` | `TEXT` | Nome do nível de verificação no Sumsub (ex: `basic-kyc`). |
| `sumsub_review_result` | `JSONB` | Objeto JSON com o resultado completo da revisão do Sumsub. |
| `rejection_reason` | `TEXT` | Motivo da rejeição, se aplicável. |

### 2.2. Tabela `verification_history`

Registra cada evento e mudança de status recebido pelo webhook, criando um log de auditoria completo para cada applicant.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | `UUID` | Chave primária única. |
| `applicant_id` | `UUID` | Chave estrangeira referenciando `applicants.id`. |
| `event_type` | `TEXT` | Tipo de evento do webhook (ex: `applicantCreated`, `applicantReviewed`). |
| `old_status` | `TEXT` | Status anterior do applicant. |
| `new_status` | `TEXT` | Novo status do applicant após o evento. |
| `review_answer` | `TEXT` | Resposta da análise, se aplicável ao evento. |
| `occurred_at` | `TIMESTAMPTZ` | Data e hora do evento. |
| `correlation_id` | `TEXT` | ID de correlação do webhook do Sumsub. |
| `webhook_payload` | `JSONB` | Payload completo do webhook para fins de depuração e auditoria. |
| `notes` | `TEXT` | Campo para notas manuais ou observações. |

### 2.3. Tabela `business_data`

Armazena dados de negócio associados a um applicant, como informações de wallet, contratos e limites operacionais.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | `UUID` | Chave primária única. |
| `applicant_id` | `UUID` | Chave estrangeira (UNIQUE) referenciando `applicants.id`. |
| `usdt_wallet_address` | `TEXT` | Endereço da carteira USDT do cliente. |
| `usdt_network` | `TEXT` | Rede da carteira: `TRC20`, `ERC20`, `BEP20`. |
| `wallet_verified` | `BOOLEAN` | Flag indicando se a posse da carteira foi verificada. |
| `wallet_added_at` | `TIMESTAMPTZ` | Data em que a carteira foi adicionada. |
| `contract_signed` | `BOOLEAN` | Flag indicando se o contrato de serviço foi assinado. |
| `contract_signed_at` | `TIMESTAMPTZ` | Data da assinatura do contrato. |
| `contract_document_url` | `TEXT` | URL do documento de contrato assinado. |
| `contract_ip_address` | `INET` | Endereço IP do signatário do contrato. |
| `daily_limit_usd` | `NUMERIC` | Limite operacional diário em USD. |
| `monthly_limit_usd` | `NUMERIC` | Limite operacional mensal em USD. |
| `transaction_limit_usd` | `NUMERIC` | Limite por transação em USD. |
| `client_tier` | `TEXT` | Nível do cliente: `basic`, `standard`, `premium`, `vip`. |
| `tags` | `TEXT[]` | Array de tags para segmentação e agrupamento. |
| `internal_notes` | `TEXT` | Campo para anotações internas da equipe. |



### 2.4. Views

Para simplificar as consultas, duas views foram criadas:

- **`v_applicants_full`**: Junta `applicants` e `business_data` para fornecer uma visão completa de cada cliente em uma única consulta.
- **`v_verification_stats`**: Agrupa os applicants por tipo e status, fornecendo contagens totais e para os últimos 1, 7 e 30 dias. Útil para dashboards e relatórios.

### 2.5. Triggers

- **`update_updated_at_column()`**: Uma função de trigger genérica que atualiza o campo `updated_at` para a data e hora atuais sempre que uma linha é modificada. Este trigger está aplicado às tabelas `applicants` e `business_data`.



## 3. Biblioteca de Funções TypeScript (`supabase-db.ts`)

O arquivo `/src/lib/supabase-db.ts` centraliza toda a comunicação com o banco de dados. Ele utiliza o cliente Supabase para Node.js e a `service_role_key` para realizar operações com privilégios de administrador, bypassando as políticas de RLS (Row Level Security) quando necessário.

### 3.1. Tipos de Dados

As interfaces `Applicant`, `VerificationHistory` e `BusinessData` espelham a estrutura das tabelas do banco de dados, garantindo type safety em todo o código.

### 3.2. Funções Principais

| Função | Descrição |
| --- | --- |
| `upsertApplicant(data)` | Cria um novo applicant ou atualiza um existente com base no `external_user_id`. |
| `getApplicantByExternalUserId(id)` | Busca um applicant pelo seu `external_user_id`. |
| `getApplicantByApplicantId(id)` | Busca um applicant pelo seu `applicant_id` do Sumsub. |
| `addVerificationHistory(data)` | Adiciona um novo registro ao histórico de verificação. |
| `upsertBusinessData(data)` | Cria ou atualiza os dados de negócio de um applicant. |
| `listApplicants(filters)` | Lista applicants com filtros opcionais por `status`, `type`, `limit` e `offset`. |
| `getVerificationHistory(applicantId)` | Retorna o histórico completo de um applicant. |
| `getApplicantFull(externalUserId)` | Busca os dados completos de um applicant usando a view `v_applicants_full`. |
| `getVerificationStats()` | Retorna as estatísticas da view `v_verification_stats`. |
| `extractDocumentFromExternalUserId(id)` | Extrai o número do documento (CPF/CNPJ) do `external_user_id`. |

### 3.3. Funções de Consulta Adicionais

- `getApprovedApplicants()`: Retorna applicants com status `approved`.
- `getRejectedApplicants()`: Retorna applicants com status `rejected`.
- `getPendingApplicants()`: Retorna applicants com status `pending`.
- `getApplicantsByType(type)`: Filtra applicants por `individual` ou `company`.
- `getApplicantsWithWallet()`: Retorna applicants que já cadastraram uma wallet.
- `getApplicantsWithContract()`: Retorna applicants que já assinaram o contrato.
- `getApplicantsByTier(tier)`: Filtra applicants por nível (`basic`, `standard`, etc.).
- `getApplicantsByTag(tag)`: Busca applicants que contenham uma tag específica.
- `getApplicantsByDateRange(start, end)`: Busca applicants criados em um intervalo de datas.

### 3.4. Funções de Mutação Adicionais

- `updateWallet(applicantId, address, network)`: Adiciona ou atualiza a wallet de um applicant.
- `verifyWallet(applicantId)`: Marca a wallet de um applicant como verificada.
- `signContract(applicantId, url, ip)`: Registra a assinatura de um contrato.
- `updateTier(applicantId, tier)`: Atualiza o nível (tier) de um cliente.
- `updateLimits(applicantId, limits)`: Atualiza os limites operacionais.
- `addTags(applicantId, tags)`: Adiciona uma ou mais tags a um applicant.
- `removeTags(applicantId, tags)`: Remove tags de um applicant.

## 4. Conclusão

A estrutura de banco de dados e a API de funções TypeScript fornecem uma base sólida e bem documentada para a aplicação de onboarding. O design permite fácil extensibilidade para futuras funcionalidades, enquanto as views e funções de consulta garantem que os dados possam ser acessados de forma performática e conveniente.

