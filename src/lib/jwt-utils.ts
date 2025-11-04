import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface RefreshTokenPayload {
  applicantId: string;
  externalUserId: string;
  companyName?: string;
  document?: string;
  exp?: number;
}

/**
 * Gera token JWT para refresh de KYC
 * @param payload Dados do applicant
 * @param expiresIn Tempo de expiração (padrão: 7 dias)
 */
export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, 'exp'>,
  expiresIn: string = '7d'
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Valida e decodifica token JWT
 * @param token Token a validar
 * @returns Payload decodificado ou null se inválido
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
  } catch (error) {
    console.error('[JWT] Token inválido:', error);
    return null;
  }
}
