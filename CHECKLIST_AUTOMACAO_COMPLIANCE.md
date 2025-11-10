# Checklist de Implementação: Automação de Compliance

## 📋 Documento de Controle e Continuidade

**Data de Início:** 09/11/2025  
**Responsável:** Manus AI  
**Aprovado por:** Thiago Lara

---

## 🎯 Objetivo

Implementar sistema de automação de compliance usando APIs gratuitas, com foco em:
- Verificação geográfica (Google Maps)
- Certidões automatizadas (CND Federal, CNDT)
- Upload de documentos extras
- Geração de dossiê completo em PDF

---

## ✅ Fase 1: Integração com Google Maps API (2 dias)

### 1.1 Configuração da API
- [ ] Criar projeto no Google Cloud Console
- [ ] Ativar Google Maps JavaScript API
- [ ] Ativar Google Maps Static API
- [ ] Ativar Google Street View Static API
- [ ] Gerar API Key
- [ ] Configurar restrições de segurança (domain whitelist)
- [ ] Adicionar API Key nas variáveis de ambiente (.env.local)
- [ ] **VALIDAÇÃO:** Testar API Key com requisição simples

### 1.2 Backend - Biblioteca de Integração
- [x] Criar `/src/lib/google-maps.ts`
- [ ] Implementar função `getStaticMapUrl(address, lat, lng)`
- [ ] Implementar função `getStreetViewUrl(address, lat, lng)`
- [ ] Implementar função `getGoogleMapsLink(address, lat, lng)`
- [ ] Adicionar tratamento de erros
- [ ] Adicionar logs de debug
- [ ] **VALIDAÇÃO:** Testar cada função com endereço real

### 1.3 Backend - Endpoint de API
- [ ] Criar `/src/app/api/companies/[id]/maps/route.ts`
- [ ] Implementar GET para buscar URLs do mapa e Street View
- [ ] Implementar POST para salvar foto da fachada no Supabase Storage
- [ ] Adicionar autenticação e permissões
- [ ] **VALIDAÇÃO:** Testar endpoint via curl

### 1.4 Frontend - Componente de Mapa
- [ ] Criar `/src/components/compliance/GoogleMapsSection.tsx`
- [ ] Implementar exibição do mapa estático
- [ ] Implementar exibição do Street View
- [ ] Implementar botão "Abrir no Google Maps"
- [ ] Implementar botão "Salvar Fachada"
- [ ] Adicionar loading states
- [ ] Adicionar error states
- [ ] **VALIDAÇÃO:** Testar componente isoladamente

### 1.5 Integração na Página de Dossiê
- [ ] Atualizar `/src/app/admin/empresas/[id]/page.tsx`
- [ ] Adicionar seção "Verificação Geográfica" na aba Documentos
- [ ] Integrar componente GoogleMapsSection
- [ ] **VALIDAÇÃO:** Testar na página de dossiê da IA PAG

### 1.6 Testes Finais da Fase 1
- [ ] Testar com 3 empresas diferentes
- [ ] Verificar se mapa carrega corretamente
- [ ] Verificar se Street View funciona
- [ ] Verificar se botão "Abrir no Google Maps" funciona
- [ ] Verificar se foto da fachada é salva no Storage
- [ ] **COMMIT:** `feat: add Google Maps integration for compliance`

---

## ✅ Fase 2: Certidões Automatizadas (3 dias)

### 2.1 Configuração das APIs Governamentais
- [ ] Cadastrar no Gov.br Conecta
- [ ] Obter credenciais para API de CND
- [ ] Obter credenciais para API de CNDT
- [ ] Adicionar credenciais nas variáveis de ambiente
- [ ] **VALIDAÇÃO:** Testar autenticação em ambas as APIs

### 2.2 Backend - Biblioteca de Certidões
- [ ] Criar `/src/lib/certidoes.ts`
- [ ] Implementar função `emitirCNDFederal(cnpj)`
- [ ] Implementar função `emitirCNDT(cnpj)`
- [ ] Implementar função `validarCertidao(certidao)`
- [ ] Implementar função `calcularDataExpiracao(certidao)`
- [ ] Adicionar cache de certidões (evitar re-emissões desnecessárias)
- [ ] **VALIDAÇÃO:** Testar emissão de certidões com CNPJ real

### 2.3 Backend - Modelo de Dados
- [ ] Criar migration SQL para tabela `company_certidoes`
- [ ] Executar migration no Supabase
- [ ] **VALIDAÇÃO:** Verificar estrutura da tabela no banco

### 2.4 Backend - Endpoints de API
- [ ] Criar `/src/app/api/companies/[id]/certidoes/route.ts` (GET/POST)
- [ ] Implementar GET para listar certidões
- [ ] Implementar POST para emitir certidão
- [ ] Criar `/src/app/api/companies/[id]/certidoes/[certidaoId]/download/route.ts`
- [ ] Implementar download de PDF da certidão
- [ ] **VALIDAÇÃO:** Testar endpoints via curl

### 2.5 Frontend - Componente de Certidões
- [ ] Criar `/src/components/compliance/CertidoesSection.tsx`
- [ ] Implementar card de certidão com status visual
- [ ] Implementar botão "Emitir Certidão"
- [ ] Implementar botão "Download PDF"
- [ ] Implementar botão "Reemitir"
- [ ] Implementar botão "Emitir Todas"
- [ ] Adicionar loading e error states
- [ ] **VALIDAÇÃO:** Testar componente isoladamente

### 2.6 Integração na Página de Dossiê
- [ ] Atualizar aba Documentos
- [ ] Adicionar seção "Certidões Automatizadas"
- [ ] Integrar componente CertidoesSection
- [ ] **VALIDAÇÃO:** Testar na página de dossiê da IA PAG

### 2.7 Testes Finais da Fase 2
- [ ] Emitir CND Federal para 3 empresas
- [ ] Emitir CNDT para 3 empresas
- [ ] Verificar se PDFs são salvos corretamente
- [ ] Verificar se status de validade é calculado corretamente
- [ ] Verificar se download funciona
- [ ] **COMMIT:** `feat: add automated certidões (CND, CNDT)`

---

## ✅ Fase 3: Upload de Documentos Extras (2 dias)

### 3.1 Backend - Storage e Modelo de Dados
- [ ] Criar bucket `compliance-docs` no Supabase Storage
- [ ] Configurar políticas de acesso
- [ ] Criar migration SQL para tabela `company_documents`
- [ ] Executar migration no Supabase
- [ ] **VALIDAÇÃO:** Testar upload manual no Storage

### 3.2 Backend - Endpoints de API
- [ ] Criar `/src/app/api/companies/[id]/documents/route.ts` (GET/POST)
- [ ] Implementar GET para listar documentos
- [ ] Implementar POST para upload de documento
- [ ] Criar `/src/app/api/companies/[id]/documents/[docId]/route.ts` (DELETE)
- [ ] Implementar DELETE para remover documento
- [ ] **VALIDAÇÃO:** Testar endpoints via curl

### 3.3 Frontend - Componente de Upload
- [ ] Criar `/src/components/compliance/DocumentUploadSection.tsx`
- [ ] Implementar área de drag-and-drop
- [ ] Implementar seleção de arquivos
- [ ] Implementar preview de arquivos
- [ ] Implementar progresso de upload
- [ ] Implementar lista de documentos enviados
- [ ] Implementar botão de exclusão
- [ ] **VALIDAÇÃO:** Testar componente isoladamente

### 3.4 Integração na Página de Dossiê
- [ ] Atualizar aba Documentos
- [ ] Adicionar seção "Outros Documentos"
- [ ] Integrar componente DocumentUploadSection
- [ ] **VALIDAÇÃO:** Testar upload de PDF, imagem, etc

### 3.5 Testes Finais da Fase 3
- [ ] Upload de 5 tipos diferentes de arquivo
- [ ] Verificar se arquivos aparecem na lista
- [ ] Verificar se download funciona
- [ ] Verificar se exclusão funciona
- [ ] **COMMIT:** `feat: add document upload for compliance`

---

## ✅ Fase 4: Dossiê Completo em PDF (1 dia)

### 4.1 Backend - Geração de PDF
- [ ] Criar `/src/lib/dossie-pdf.ts`
- [ ] Implementar função `gerarDossiePDF(companyId)`
- [ ] Implementar seção: Dados Cadastrais
- [ ] Implementar seção: Verificação Geográfica (mapa + foto)
- [ ] Implementar seção: Resumo de Certidões
- [ ] Implementar anexos: PDFs das certidões
- [ ] **VALIDAÇÃO:** Gerar PDF de teste

### 4.2 Backend - Endpoint de API
- [ ] Criar `/src/app/api/companies/[id]/dossie/route.ts`
- [ ] Implementar GET para gerar e baixar dossiê
- [ ] Adicionar cache (evitar regeneração desnecessária)
- [ ] **VALIDAÇÃO:** Testar endpoint via curl

### 4.3 Frontend - Botão de Exportação
- [ ] Adicionar botão "📥 Exportar Dossiê Completo" na página
- [ ] Implementar loading state
- [ ] Implementar download automático
- [ ] **VALIDAÇÃO:** Testar exportação

### 4.4 Testes Finais da Fase 4
- [ ] Gerar dossiê de 3 empresas diferentes
- [ ] Verificar se todas as seções estão presentes
- [ ] Verificar se anexos estão corretos
- [ ] Verificar formatação e layout
- [ ] **COMMIT:** `feat: add complete dossier PDF generation`

---

## ✅ Validação Final e Deploy

### Testes de Integração
- [ ] Testar fluxo completo: cadastro → certidões → upload → dossiê
- [ ] Testar com 5 empresas diferentes
- [ ] Verificar performance (tempo de carregamento)
- [ ] Verificar responsividade mobile
- [ ] Verificar logs de erro

### Documentação
- [ ] Atualizar README.md com novas funcionalidades
- [ ] Documentar variáveis de ambiente necessárias
- [ ] Criar guia de uso para Compliance Officer
- [ ] **COMMIT:** `docs: update compliance automation docs`

### Deploy
- [ ] Fazer commit final
- [ ] Push para GitHub
- [ ] Aguardar deploy do Vercel
- [ ] Testar em produção
- [ ] Validar com usuário final

---

## 🔄 Rollback Plan

Se algo der errado em qualquer fase:

1. **Identificar o commit problemático**
2. **Reverter usando:** `git revert <commit-hash>`
3. **Push para GitHub**
4. **Aguardar redeploy automático**

---

## 📝 Notas de Continuidade

### Dependências Externas
- Google Maps API Key (armazenada em variáveis de ambiente)
- Gov.br Conecta (credenciais em variáveis de ambiente)
- Supabase Storage (buckets: `compliance-docs`)

### Arquivos Críticos
- `/src/lib/google-maps.ts` - Integração Google Maps
- `/src/lib/certidoes.ts` - Emissão de certidões
- `/src/lib/dossie-pdf.ts` - Geração de dossiê
- `/src/app/admin/empresas/[id]/page.tsx` - Página principal

### Migrations SQL
- `company_certidoes` - Armazena certidões emitidas
- `company_documents` - Armazena documentos extras

---

**Status:** 🟡 Em Andamento  
**Última Atualização:** 09/11/2025
