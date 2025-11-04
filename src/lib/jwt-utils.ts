import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

// Garantir que JWT_SECRET está definido
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não está configurado nas variáveis de ambiente');
}

const JWT_SECRET: string = process.env.JWT_SECRET;

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
  expiresIn: StringValue = '7d'
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
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
