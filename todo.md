# 1A1 Cripto - Sistema de Onboarding - TODO

## Configuração Inicial
- [x] Criar projeto Supabase (1A1 Onboarding - sa-east-1)
- [x] Criar repositório GitHub (thiagomachlara/1a1-onboarding)
- [ ] Inicializar aplicação React com TypeScript
- [ ] Configurar Tailwind CSS e componentes UI
- [ ] Configurar variáveis de ambiente (Sumsub + Supabase)
- [ ] Criar schema do banco de dados no Supabase

## Frontend - Páginas de Onboarding
- [ ] Página inicial de boas-vindas
- [ ] Integração com Sumsub WebSDK
- [ ] Página de verificação em andamento
- [ ] Página de sucesso (aprovado)
- [ ] Página de pendência (revisão manual)
- [ ] Página de erro/rejeição

## Backend - Integração Sumsub
- [ ] API para gerar access token do Sumsub
- [ ] API para criar applicant via Sumsub
- [ ] Webhook handler para receber notificações da Sumsub
- [ ] Sincronizar status de verificação com Supabase
- [ ] Logs de auditoria

## Database (Supabase)
- [ ] Tabela applicants (clientes)
- [ ] Tabela verification_logs
- [ ] Tabela webhook_events
- [ ] Índices e constraints
- [ ] Row Level Security (RLS)

## Dashboard Administrativo
- [ ] Lista de applicants com status
- [ ] Filtros e busca
- [ ] Detalhes do applicant
- [ ] Histórico de eventos
- [ ] Métricas e estatísticas

## Segurança e Compliance
- [ ] Validação de webhook signatures
- [ ] Variáveis de ambiente seguras
- [ ] HTTPS obrigatório
- [ ] Logs de acesso

## Deploy e Domínio
- [ ] Configurar secrets no Vercel
- [ ] Deploy inicial no Vercel
- [ ] Configurar domínio onboarding.1a1cripto.com no Route 53
- [ ] Testar fluxo completo em produção
- [ ] Documentação de uso

## Melhorias Futuras
- [ ] Notificações por email
- [ ] Múltiplos níveis de verificação (KYC/KYB)
- [ ] Integração com Transaction Monitoring
- [ ] Relatórios de compliance

