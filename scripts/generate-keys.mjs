// Generates an RSA key pair in the same PEM format as https://cryptotools.net/rsagen.
//   node scripts/generate-keys.mjs            -> create keys, skip if they already exist
//   node scripts/generate-keys.mjs --force    -> overwrite existing keys
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const privatePath = resolve(process.env.RSA_PRIVATE_KEY_PATH ?? 'keys/private.pem');
const publicPath = resolve(process.env.RSA_PUBLIC_KEY_PATH ?? 'keys/public.pem');
const force = process.argv.includes('--force');

if (!force && existsSync(privatePath) && existsSync(publicPath)) {
  console.log(`RSA keys already exist in ${dirname(privatePath)}, skipping.`);
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

for (const [path, pem, mode] of [
  [privatePath, privateKey, 0o600],
  [publicPath, publicKey, 0o644],
]) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, pem, { mode });
  console.log(`Wrote ${path}`);
}
