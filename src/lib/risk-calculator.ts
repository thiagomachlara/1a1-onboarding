/**
 * Risk Calculator Library
 * 
 * Funções para calcular risk score e determinar risk level
 */

/**
 * Interface para fatores de risco
 */
export interface RiskFactor {
  type: string;
  description: string;
  weight: number;
  value: number;
}

/**
 * Interface para resultado de cálculo de risco
 */
export interface RiskCalculationResult {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: RiskFactor[];
  total_weight: number;
}

/**
 * Calcula risk score baseado em fatores
 * 
 * @param factors - Array de fatores de risco
 * @returns Resultado do cálculo
 */
export function calculateRiskScore(factors: RiskFactor[]): RiskCalculationResult {
  let totalScore = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    totalScore += factor.value * factor.weight;
    totalWeight += factor.weight;
  }

  const risk_score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const risk_level = determineRiskLevel(risk_score);

  return {
    risk_score,
    risk_level,
    risk_factors: factors,
    total_weight: totalWeight,
  };
}

/**
 * Determina o nível de risco baseado no score
 * 
 * @param score - Score de risco (0-100)
 * @returns Nível de risco
 */
export function determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

/**
 * Extrai fatores de risco dos dados do Sumsub
 * 
 * @param sumsubData - Dados completos do Sumsub
 * @returns Array de fatores de risco
 */
export function extractRiskFactorsFromSumsub(sumsubData: any): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Verificar review status
  if (sumsubData.review?.reviewAnswer === 'RED') {
    factors.push({
      type: 'review_status',
      description: 'Verificação rejeitada pelo Sumsub',
      weight: 3,
      value: 100,
    });
  } else if (sumsubData.review?.reviewAnswer === 'YELLOW') {
    factors.push({
      type: 'review_status',
      description: 'Verificação com ressalvas',
      weight: 2,
      value: 60,
    });
  }

  // Verificar risk labels do Sumsub
  if (sumsubData.review?.riskLabels) {
    const riskLabels = sumsubData.review.riskLabels;
    
    if (riskLabels.SANCTIONS) {
      factors.push({
        type: 'sanctions',
        description: 'Identificado em listas de sanções',
        weight: 5,
        value: 100,
      });
    }

    if (riskLabels.PEP) {
      factors.push({
        type: 'pep',
        description: 'Pessoa Politicamente Exposta (PEP)',
        weight: 4,
        value: 80,
      });
    }

    if (riskLabels.ADVERSE_MEDIA) {
      factors.push({
        type: 'adverse_media',
        description: 'Mídia adversa encontrada',
        weight: 3,
        value: 70,
      });
    }
  }

  // Verificar país de alto risco
  const country = sumsubData.info?.companyInfo?.country || sumsubData.info?.country;
  const highRiskCountries = ['KP', 'IR', 'SY', 'CU', 'VE']; // Exemplos
  
  if (country && highRiskCountries.includes(country)) {
    factors.push({
      type: 'high_risk_country',
      description: `País de alto risco: ${country}`,
      weight: 3,
      value: 80,
    });
  }

  // Se não houver fatores de risco, adicionar fator positivo
  if (factors.length === 0) {
    factors.push({
      type: 'clean',
      description: 'Nenhum fator de risco identificado',
      weight: 1,
      value: 0,
    });
  }

  return factors;
}

/**
 * Aplica override manual de risco
 * 
 * @param currentLevel - Nível atual de risco
 * @param newLevel - Novo nível de risco
 * @param reason - Justificativa do override
 * @param officerName - Nome do compliance officer
 * @returns Objeto com dados do override
 */
export function applyRiskOverride(
  currentLevel: 'low' | 'medium' | 'high',
  newLevel: 'low' | 'medium' | 'high',
  reason: string,
  officerName: string
) {
  return {
    manual_override: true,
    original_risk_level: currentLevel,
    manual_risk_level: newLevel,
    override_reason: reason,
    override_by: officerName,
    override_date: new Date().toISOString(),
  };
}

/**
 * Calcula risk score completo de uma empresa
 * 
 * @param sumsubData - Dados do Sumsub
 * @param customFactors - Fatores customizados adicionais
 * @returns Resultado completo do cálculo
 */
export function calculateCompanyRisk(
  sumsubData: any,
  customFactors: RiskFactor[] = []
): RiskCalculationResult {
  const sumsubFactors = extractRiskFactorsFromSumsub(sumsubData);
  const allFactors = [...sumsubFactors, ...customFactors];
  
  return calculateRiskScore(allFactors);
}
