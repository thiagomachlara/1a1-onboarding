# 📋 Sistema de Contrato - Documentação Detalhada

## 🔐 Como funciona a geração de links únicos

### 1. **Quando o link é gerado?**
Quando o Sumsub aprova um applicant (evento `applicantReviewed` com `reviewAnswer === 'GREEN'`), o webhook automaticamente:

```typescript
// No arquivo: src/app/api/sumsub/webhook/route.ts (linha 376-384)

if (reviewAnswer === 'GREEN' && applicant.id) {
  try {
    const token = await generateContractToken(applicant.id);
    contractLink = generateContractLink(token);
    console.log('✅ Magic link gerado para contrato:', contractLink);
  } catch (error) {
    console.error('❌ Erro ao gerar magic link:', error);
  }
}
```

### 2. **Como o token é gerado?**

```typescript
// No arquivo: src/lib/magic-links.ts (linha 19-35)

export async function generateContractToken(applicantId: string): Promise<string> {
  const token = randomUUID(); // Gera UUID único (ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

  const { error } = await supabase
    .from('applicants')
    .update({
      contract_token: token,
      contract_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', applicantId);

  return token;
}
```

**Características do token:**
- ✅ UUID v4 (128 bits de entropia) - praticamente impossível de adivinhar
- ✅ Único por applicant
- ✅ Expira em 7 dias
- ✅ Armazenado no banco de dados

### 3. **Como o link é montado?**

```typescript
// No arquivo: src/lib/magic-links.ts (linha 95-98)

export function generateContractLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onboarding.1a1cripto.com';
  return `${baseUrl}/contract?token=${token}`;
}
```

**Exemplo de link gerado:**
```
https://onboarding.1a1cripto.com/contract?token=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## 🔍 Como funciona a validação do link

### 1. **Cliente acessa o link**
Quando o cliente clica no link, a página `/contract` faz uma requisição para validar o token:

```typescript
// No arquivo: src/app/contract/page.tsx (linha 23-38)

fetch(`/api/contract/validate?token=${token}`)
  .then(res => res.json())
  .then(data => {
    if (data.valid) {
      setApplicant(data.applicant); // Carrega dados do applicant
    } else {
      setError(data.error || 'Token inválido');
    }
  })
```

### 2. **API valida o token**

```typescript
// No arquivo: src/lib/magic-links.ts (linha 56-77)

export async function validateContractToken(token: string) {
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('contract_token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Token inválido' };
  }

  // Verifica se já foi assinado
  if (data.contract_signed_at) {
    return { valid: false, error: 'Contrato já foi assinado' };
  }

  // Verifica se expirou
  const expiresAt = new Date(data.contract_token_expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Link expirado' };
  }

  return { valid: true, applicant: data };
}
```

**Validações realizadas:**
- ✅ Token existe no banco?
- ✅ Contrato já foi assinado? (evita assinatura duplicada)
- ✅ Token expirou? (7 dias)

---

## 📝 Como os dados são substituídos no contrato

### 1. **Dados exibidos na página**

```typescript
// No arquivo: src/app/contract/page.tsx (linha 106-109)

const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';
const docLabel = applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ';
```

### 2. **Campos preenchidos automaticamente:**

```tsx
// No arquivo: src/app/contract/page.tsx (linha 118-138)

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-gray-600">Tipo</p>
    <p className="font-medium text-gray-900">{tipoCliente}</p>
  </div>
  <div>
    <p className="text-sm text-gray-600">{docLabel}</p>
    <p className="font-medium text-gray-900">{applicant.document_number}</p>
  </div>
  <div>
    <p className="text-sm text-gray-600">Nome / Razão Social</p>
    <p className="font-medium text-gray-900">
      {applicant.company_name || applicant.full_name || 'Não informado'}
    </p>
  </div>
  <div>
    <p className="text-sm text-gray-600">Email</p>
    <p className="font-medium text-gray-900">{applicant.email || 'Não informado'}</p>
  </div>
</div>
```

**Dados substituídos:**
- ✅ Tipo: "Pessoa Física" ou "Pessoa Jurídica"
- ✅ CPF/CNPJ: `applicant.document_number`
- ✅ Nome/Razão Social: `applicant.company_name` (PJ) ou `applicant.full_name` (PF)
- ✅ Email: `applicant.email`

**Fonte dos dados:**
- `company_name`: Vem da **BrasilAPI** (consulta automática quando PJ é criado)
- `full_name`: Vem do **Sumsub** (dados do formulário)
- `document_number`: Vem do **external_user_id** (extraído do prefixo cpf_/cnpj_)
- `email`: Vem do **Sumsub** (dados do formulário)

---

## ✍️ Como funciona a assinatura eletrônica

### 1. **Cliente marca checkbox e clica em "Assinar"**

```typescript
// No arquivo: src/app/contract/page.tsx (linha 40-66)

const handleSign = async () => {
  if (!agreed) {
    alert('Você precisa concordar com os termos do contrato');
    return;
  }

  setSigning(true);

  try {
    const response = await fetch('/api/contract/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (data.success) {
      // Redirecionar para página de wallet
      router.push(`/wallet?token=${data.walletToken}`);
    } else {
      setError(data.error || 'Erro ao assinar contrato');
      setSigning(false);
    }
  } catch (err) {
    setError('Erro ao assinar contrato');
    setSigning(false);
  }
};
```

### 2. **API registra a assinatura**

```typescript
// No arquivo: src/app/api/contract/sign/route.ts (linha 30-46)

// Capturar IP e User-Agent
const ip = request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
const userAgent = request.headers.get('user-agent') || 'unknown';

// Marcar contrato como assinado
await signContract(applicant.id, ip, userAgent);
```

### 3. **Dados salvos no banco**

```typescript
// No arquivo: src/lib/magic-links.ts (linha 113-127)

export async function signContract(
  applicantId: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const { error } = await supabase
    .from('applicants')
    .update({
      contract_signed_at: new Date().toISOString(),
      contract_ip: ip,
      contract_user_agent: userAgent,
    })
    .eq('id', applicantId);
}
```

---

## 🛡️ O que é armazenado para garantir a assinatura

### **Dados salvos no banco de dados:**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `contract_signed_at` | timestamp | Data/hora da assinatura | `2025-10-31T17:30:45.123Z` |
| `contract_ip` | text | IP do cliente | `177.123.45.67` |
| `contract_user_agent` | text | Navegador e SO | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)...` |
| `contract_token` | uuid | Token usado | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

### **Dados salvos no histórico:**

```typescript
// No arquivo: src/app/api/contract/sign/route.ts (linha 48-56)

await addVerificationHistory({
  applicant_id: applicant.id,
  event_type: 'contract_signed',
  new_status: applicant.current_status,
  metadata: {
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  },
});
```

---

## ⚖️ Validade jurídica da assinatura eletrônica

### **Base legal:**
- ✅ **MP 2.200-2/2001** - ICP-Brasil
- ✅ **Lei 14.063/2020** - Assinaturas eletrônicas

### **Tipo de assinatura:**
**Assinatura eletrônica simples** (artigo 4º, inciso I da Lei 14.063/2020)

### **Evidências coletadas:**
1. ✅ **Timestamp** - Data/hora exata da assinatura
2. ✅ **IP** - Endereço de rede do signatário
3. ✅ **User-Agent** - Navegador e sistema operacional
4. ✅ **Token único** - Prova de acesso ao link enviado ao email
5. ✅ **Checkbox de concordância** - Manifestação expressa de vontade
6. ✅ **Histórico imutável** - Registro no banco de dados

### **Texto na página:**
```
Ao assinar eletronicamente, você concorda que esta assinatura tem validade jurídica 
equivalente à assinatura manuscrita, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
```

---

## 🔄 Fluxo completo passo a passo

1. **Sumsub aprova applicant** → Webhook recebe evento
2. **Webhook consulta BrasilAPI** → Obtém razão social (se PJ)
3. **Webhook salva dados** → Supabase (company_name, document_number, etc.)
4. **Webhook gera token** → UUID único com expiração de 7 dias
5. **Webhook gera link** → `https://onboarding.1a1cripto.com/contract?token=UUID`
6. **Webhook envia notificação** → WhatsApp com link para você
7. **Você copia e envia** → Link para o cliente
8. **Cliente acessa link** → Página valida token
9. **Página carrega dados** → Razão social, CNPJ, email preenchidos
10. **Cliente lê contrato** → Scroll na área de texto
11. **Cliente marca checkbox** → Concordância com termos
12. **Cliente clica "Assinar"** → POST para `/api/contract/sign`
13. **API captura dados** → IP, User-Agent, timestamp
14. **API salva assinatura** → Banco de dados
15. **API adiciona histórico** → Registro imutável
16. **API gera token wallet** → Novo UUID para próxima etapa
17. **API envia notificação** → WhatsApp com confirmação
18. **Cliente é redirecionado** → Página de cadastro de wallet

---

## 🎨 Layout da página de contrato

- ✅ Header com logo e título
- ✅ Card com dados do contratante (tipo, documento, nome, email)
- ✅ Card com texto do contrato (scroll, fundo cinza)
- ✅ Checkbox de concordância
- ✅ Botão de assinatura (desabilitado até marcar checkbox)
- ✅ Texto de validade jurídica
- ✅ Loading states
- ✅ Error handling
- ✅ Responsivo (mobile-friendly)

---

## ⚠️ Melhorias futuras sugeridas

1. **Geração de PDF do contrato assinado**
   - Incluir dados do cliente
   - Incluir timestamp e IP
   - Salvar no Supabase Storage
   - Enviar por email

2. **Assinatura eletrônica avançada (ICP-Brasil)**
   - Integração com certificado digital
   - Assinatura qualificada (maior validade jurídica)

3. **Notificação por email**
   - Enviar cópia do contrato assinado
   - Confirmação de assinatura

4. **Auditoria completa**
   - Log de todas as ações
   - Exportação de relatórios

