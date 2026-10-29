import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRsaKeys } from './rsa-keys.provider';

function generatePemPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}

function configWith(values: Record<string, string>): ConfigService {
  return new ConfigService(values);
}

describe('loadRsaKeys', () => {
  const pems = generatePemPair();
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rsa-keys-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads keys from file paths', () => {
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, pems.privateKey);
    writeFileSync(publicPath, pems.publicKey);

    const keys = loadRsaKeys(
      configWith({
        RSA_PRIVATE_KEY_PATH: privatePath,
        RSA_PUBLIC_KEY_PATH: publicPath,
      }),
    );

    expect(keys.privateKey.type).toBe('private');
    expect(keys.publicKey.type).toBe('public');
  });

  it('loads inline PEMs with escaped newlines', () => {
    const keys = loadRsaKeys(
      configWith({
        RSA_PRIVATE_KEY: pems.privateKey.replace(/\n/g, '\\n'),
        RSA_PUBLIC_KEY: pems.publicKey.replace(/\n/g, '\\n'),
      }),
    );

    expect(keys.privateKey.asymmetricKeyType).toBe('rsa');
    expect(keys.publicKey.asymmetricKeyType).toBe('rsa');
  });

  it('throws a helpful error when a key file is missing', () => {
    expect(() =>
      loadRsaKeys(
        configWith({
          RSA_PRIVATE_KEY_PATH: join(dir, 'missing.pem'),
          RSA_PUBLIC_KEY: pems.publicKey,
        }),
      ),
    ).toThrow(/RSA key not found.*npm run keys:generate/);
  });

  it('throws when the public key does not belong to the private key', () => {
    expect(() =>
      loadRsaKeys(
        configWith({
          RSA_PRIVATE_KEY: pems.privateKey,
          RSA_PUBLIC_KEY: generatePemPair().publicKey,
        }),
      ),
    ).toThrow('RSA public key does not match the private key.');
  });
});
