import { Inject, Injectable } from '@nestjs/common';
import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateEncrypt,
  publicDecrypt,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { RSA_KEYS, type RsaKeys } from './rsa-keys.provider';

const AES_ALGORITHM = 'aes-256-gcm';
const AES_KEY_LENGTH = 32;
const AES_KEY_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const RSA_PADDING = constants.RSA_PKCS1_PADDING;

export interface EncryptedData {
  data1: string;
  data2: string;
}

export class DecryptionFailedError extends Error {
  constructor(cause?: unknown) {
    super('Unable to decrypt data', { cause });
    this.name = 'DecryptionFailedError';
  }
}

@Injectable()
export class CryptoService {
  constructor(@Inject(RSA_KEYS) private readonly keys: RsaKeys) { }

  encrypt(payload: string): EncryptedData {
    const aesKey = this.generateAesKey();
    const data2 = this.aesEncrypt(payload, aesKey);
    const data1 = privateEncrypt(
      { key: this.keys.privateKey, padding: RSA_PADDING },
      Buffer.from(aesKey, 'utf8'),
    ).toString('base64');

    return { data1, data2 };
  }

  decrypt(data1: string, data2: string): string {
    try {
      const aesKey = publicDecrypt(
        { key: this.keys.publicKey, padding: RSA_PADDING },
        Buffer.from(data1, 'base64'),
      ).toString('utf8');

      return this.aesDecrypt(data2, aesKey);
    } catch (error) {
      throw new DecryptionFailedError(error);
    }
  }

  private generateAesKey(): string {
    let key = '';
    for (let i = 0; i < AES_KEY_LENGTH; i++) {
      key += AES_KEY_CHARSET[randomInt(AES_KEY_CHARSET.length)];
    }
    return key;
  }

  private aesEncrypt(plaintext: string, key: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, Buffer.from(key, 'utf8'), iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      'base64',
    );
  }

  private aesDecrypt(encoded: string, key: string): string {
    const raw = Buffer.from(encoded, 'base64');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted payload is too short');
    }

    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(
      AES_ALGORITHM,
      Buffer.from(key, 'utf8'),
      iv,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
