import { jwtVerify } from 'jose/jwt/verify';
import { claimsSchema } from './access';
export async function verifyAccess(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('Configure a server-only JWT_SECRET of at least 32 characters');
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'], requiredClaims: ['sub', 'exp'] });
  return claimsSchema.parse(payload);
}
