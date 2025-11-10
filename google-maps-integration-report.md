# Relatório Final de Integração do Google Maps

**Autor:** Manus AI
**Data:** 10 de Novembro de 2025
**Status:** Concluído

## 1. Visão Geral

Este relatório documenta o processo de implementação e depuração da integração do Google Maps na plataforma 1A1 Cripto Onboarding. O objetivo principal era exibir um mapa interativo e uma imagem do Street View na página de dossiê da empresa, mostrando a localização física do negócio. O processo envolveu a configuração da API do Google Maps, implementação da funcionalidade de geocodificação e resolução de vários problemas de autenticação e banco de dados com o Supabase.

## 2. Resumo da Solução

A integração foi concluída com sucesso após uma série de depurações e correções. A solução final consiste em:

- **API do Google Maps:** Chave de API configurada corretamente com restrições de domínio e adicionada às variáveis de ambiente da Vercel.
- **Geocodificação:** Uma função de geocodificação que converte endereços em coordenadas de latitude e longitude.
- **Enriquecimento de Endereço:** Uma API que enriquece os dados de endereço da empresa, busca as coordenadas e as salva no banco de dados.
- **Fallback Robusto:** A API de enriquecimento agora usa a ViaCEP como fallback se a BrasilAPI falhar (devido a erros 403) e, se ambas falharem, usa o endereço original do Sumsub para a geocodificação.
- **Banco de Dados:** A tabela `applicants` foi atualizada com os campos `enriched_lat` e `enriched_lng` para armazenar as coordenadas.
- **Cliente Admin do Supabase:** Um cliente admin foi criado para contornar as políticas de Row Level Security (RLS) ao salvar as coordenadas no banco de dados.

## 3. Etapas da Implementação e Correções

A tabela a seguir resume os principais problemas encontrados e as soluções aplicadas:

| Problema | Causa Raiz | Solução Aplicada |
| :--- | :--- | :--- |
| Erro "Company not found" no mapa | A API de enriquecimento falhava em salvar as coordenadas no banco de dados. | Implementação de um cliente admin do Supabase para contornar o RLS. |
| Erro `PGRST204` (No rows updated) | Tentativa de atualizar colunas (`enriched_lat`, `enriched_lng`) que não existiam na tabela `applicants`. | Criação de uma migration para adicionar as colunas `enriched_lat` e `enriched_lng` à tabela `applicants`. |
| Erro `403 Forbidden` da BrasilAPI | A BrasilAPI estava bloqueando requisições da Vercel (provavelmente por rate limiting). | Implementação de um fallback para a ViaCEP e, em último caso, para o endereço original do Sumsub. |
| Erros de autenticação do Supabase | O cliente do Supabase não estava sendo inicializado corretamente para operações do lado do servidor. | Migração para o pacote `@supabase/ssr` e garantia de que `createClient()` era sempre chamado com `await`. |

## 4. Principais Arquivos Modificados

- **`src/lib/supabase/server.ts`**: Adicionada a função `createAdminClient()` para criar um cliente Supabase com a `service_role_key`, permitindo o bypass do RLS.
- **`src/app/api/companies/[id]/enrich-address/route.ts`**: Modificada para usar o `createAdminClient()` para atualizações no banco de dados e para incluir a lógica de fallback para o endereço original.
- **`src/lib/address-enrichment.ts`**: Adicionado tratamento de erro para a falha da BrasilAPI e fallback para a ViaCEP.
- **Migration do Supabase**: Adicionadas as colunas `enriched_lat` e `enriched_lng` à tabela `applicants`.

## 5. Conclusão

A integração do Google Maps está agora totalmente funcional. O sistema é capaz de enriquecer endereços, obter coordenadas geográficas e exibi-las em um mapa interativo e no Street View, fornecendo uma verificação geográfica visual para cada empresa. O sistema também foi tornado mais robusto para lidar com falhas em APIs de terceiros.

## Próximos Passos

Com a integração do Google Maps concluída, a próxima etapa é a integração da API da InfoSimples, conforme solicitado pelo usuário.
