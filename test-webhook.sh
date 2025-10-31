#!/bin/bash

# Script para testar webhook do Sumsub localmente

WEBHOOK_URL="https://onboarding.1a1cripto.com/api/sumsub/webhook"
SECRET="$SUMSUB_WEBHOOK_SECRET"

TIMESTAMP=$(date +%s)
CURRENT_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Payload de teste: applicantCreated
PAYLOAD_CREATED="{
  \"applicantId\": \"test_${TIMESTAMP}\",
  \"inspectionId\": \"insp_${TIMESTAMP}\",
  \"correlationId\": \"corr_${TIMESTAMP}\",
  \"externalUserId\": \"cpf_12345678900\",
  \"type\": \"applicantCreated\",
  \"reviewStatus\": \"init\",
  \"createdAt\": \"${CURRENT_DATE}\"
}"

# Payload de teste: applicantPending
PAYLOAD_PENDING="{
  \"applicantId\": \"test_${TIMESTAMP}\",
  \"inspectionId\": \"insp_${TIMESTAMP}\",
  \"correlationId\": \"corr_${TIMESTAMP}\",
  \"externalUserId\": \"cpf_12345678900\",
  \"type\": \"applicantPending\",
  \"reviewStatus\": \"pending\",
  \"createdAt\": \"${CURRENT_DATE}\",
  \"applicantType\": \"individual\",
  \"info\": {
    \"firstName\": \"João\",
    \"lastName\": \"Silva\",
    \"dob\": \"1990-01-01\",
    \"country\": \"BRA\"
  },
  \"email\": \"joao.silva@example.com\",
  \"phone\": \"+5511999999999\"
}"

# Payload de teste: applicantReviewed (approved)
PAYLOAD_APPROVED="{
  \"applicantId\": \"test_${TIMESTAMP}\",
  \"inspectionId\": \"insp_${TIMESTAMP}\",
  \"correlationId\": \"corr_${TIMESTAMP}\",
  \"externalUserId\": \"cpf_12345678900\",
  \"type\": \"applicantReviewed\",
  \"reviewStatus\": \"completed\",
  \"reviewResult\": {
    \"reviewAnswer\": \"GREEN\"
  },
  \"createdAt\": \"${CURRENT_DATE}\"
}"

echo "=== Testando Webhook do Sumsub ==="
echo ""

# Função para calcular assinatura HMAC
function sign_payload() {
  local payload="$1"
  echo -n "$payload" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //'
}

echo "1. Enviando evento: applicantCreated"
SIGNATURE=$(sign_payload "$PAYLOAD_CREATED")
echo "Signature: $SIGNATURE"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Payload-Digest: $SIGNATURE" \
  -d "$PAYLOAD_CREATED"
echo -e "\n"

sleep 2

echo "2. Enviando evento: applicantPending"
SIGNATURE=$(sign_payload "$PAYLOAD_PENDING")
echo "Signature: $SIGNATURE"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Payload-Digest: $SIGNATURE" \
  -d "$PAYLOAD_PENDING"
echo -e "\n"

sleep 2

echo "3. Enviando evento: applicantReviewed (approved)"
SIGNATURE=$(sign_payload "$PAYLOAD_APPROVED")
echo "Signature: $SIGNATURE"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Payload-Digest: $SIGNATURE" \
  -d "$PAYLOAD_APPROVED"
echo -e "\n"

echo "=== Teste concluído ==="

