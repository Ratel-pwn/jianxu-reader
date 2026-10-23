import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const PARAMETERS = { N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024 };
const PREFIX = 'scrypt$32768$8$3$';
export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  return { salt, password: PREFIX + (await derive(value, salt, 64, PARAMETERS)).toString('hex') };
}
export async function verifyPassword(value, user) {
  const modern = user?.password.startsWith(PREFIX);
  const encoded = modern ? user.password.slice(PREFIX.length) : user?.password;
  const legacy = !!user && /^[a-f0-9]{128}$/.test(encoded || '') && !modern;
  const digest = await derive(legacy ? value.trim() : value, user?.salt || 'missing-account', 64, legacy ? { N: 16384, r: 8, p: 1 } : PARAMETERS);
  return { valid: !!user && /^[a-f0-9]{128}$/.test(encoded || '') && timingSafeEqual(digest, Buffer.from(encoded, 'hex')), needsUpgrade: legacy };
}
