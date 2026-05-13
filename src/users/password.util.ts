import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  return hashSecret(password);
}

export function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  hashedPassword: string,
): boolean {
  return verifyHashedSecret(password, hashedPassword);
}

export function verifyHashedSecret(
  value: string,
  hashedValue: string,
): boolean {
  const [salt, storedHash] = hashedValue.split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = scryptSync(value, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (candidateHash.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, storedHashBuffer);
}
