// CORREÇÃO DE ENDEREÇO - SUBSTITUIR NO ARQUIVO PRINCIPAL

// Endereço completo - usar postalAddress que vem como string única
const postalAddress = companyInfo.postalAddress;
if (postalAddress && postalAddress !== applicant.address) {
  updates.address = postalAddress;
  detail.changes.push({
    field: 'Endereço',
    from: applicant.address || 'N/A',
    to: postalAddress,
  });
  hasChanges = true;
}

// País (único campo separado disponível)
const country = companyInfo.country || fixedCompanyInfo.country;
if (country && country !== applicant.country) {
  updates.country = country;
  detail.changes.push({
    field: 'País',
    from: applicant.country || 'N/A',
    to: country,
  });
  hasChanges = true;
}

// Limpar campos de cidade, estado e CEP (não temos separados)
if (applicant.city || applicant.state || applicant.postal_code) {
  updates.city = null;
  updates.state = null;
  updates.postal_code = null;
}
