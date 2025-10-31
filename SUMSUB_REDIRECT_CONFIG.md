# Configuração de Redirecionamento Sumsub

## 📍 Localização no Dashboard

**Dashboard → Dev space → WebSDK settings**

URL: https://cockpit.sumsub.com/checkus#/dev/websdk-settings

---

## ⚙️ Configuração: Post-verification redirect URL

### O que faz:

Define uma URL customizada para onde os applicants serão redirecionados após completarem a verificação com sucesso.

### Como configurar:

1. Acesse **Dev space** no Dashboard
2. Vá para **WebSDK settings**
3. No campo **"Post-verification redirect URL"**, insira a URL desejada
4. Exemplo: `https://onboarding.1a1cripto.com/onboarding/success`

### Parâmetros adicionados automaticamente:

Quando usado com JWT signing, o Sumsub adiciona um parâmetro JWT assinado à URL para confirmar o resultado da verificação de forma segura.

Exemplo:
```
https://onboarding.1a1cripto.com/onboarding/success?token=eyJhbGc...
```

---

## 🔐 Segurança (JWT Signing)

### Secret Key:

Você pode criar sua própria secret key que será usada para assinar o JWT toda vez que o Sumsub gerar um token. Isso garante que o token é autêntico e os dados não foram alterados.

**Recomendação:** Configure uma secret key para validar os tokens recebidos na URL de redirecionamento.

---

## ✅ Próximos passos:

1. Acessar o Cockpit do Sumsub
2. Configurar **Post-verification redirect URL**: `https://onboarding.1a1cripto.com/onboarding/success`
3. [Opcional] Configurar secret key para JWT signing
4. Testar o fluxo completo

---

## 📚 Referência:

- Documentação oficial: https://docs.sumsub.com/docs/websdk-settings
- Artigo sobre links e notificações: https://docs.sumsub.com/docs/links-and-notifications


