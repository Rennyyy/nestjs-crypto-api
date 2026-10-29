import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, createPublicKey, KeyObject } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const RSA_KEYS = Symbol('RSA_KEYS');

export interface RsaKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

const DEFAULT_PRIVATE_KEY_PATH = 'keys/private.pem';
const DEFAULT_PUBLIC_KEY_PATH = 'keys/public.pem';

export function loadRsaKeys(config: ConfigService): RsaKeys {
  const privateKey = createPrivateKey(
    readPem(
      config,
      'RSA_PRIVATE_KEY',
      'RSA_PRIVATE_KEY_PATH',
      DEFAULT_PRIVATE_KEY_PATH,
    ),
  );
  const publicKey = createPublicKey(
    readPem(
      config,
      'RSA_PUBLIC_KEY',
      'RSA_PUBLIC_KEY_PATH',
      DEFAULT_PUBLIC_KEY_PATH,
    ),
  );

  const derivedPublicKey = createPublicKey(privateKey);
  if (!derivedPublicKey.equals(publicKey)) {
    throw new Error('RSA public key does not match the private key.');
  }

  return { privateKey, publicKey };
}

function readPem(
  config: ConfigService,
  inlineVar: string,
  pathVar: string,
  defaultPath: string,
): string {
  const inline = config.get<string>(inlineVar);
  if (inline) {
    return inline.replace(/\\n/g, '\n');
  }

  const path = resolve(config.get<string>(pathVar) ?? defaultPath);
  if (!existsSync(path)) {
    throw new Error(
      `RSA key not found at ${path}. Set ${inlineVar} or ${pathVar}, or run "npm run keys:generate".`,
    );
  }
  return readFileSync(path, 'utf8');
}

export const rsaKeysProvider: Provider = {
  provide: RSA_KEYS,
  inject: [ConfigService],
  useFactory: loadRsaKeys,
};
