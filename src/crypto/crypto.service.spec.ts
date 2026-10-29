import { constants, generateKeyPairSync, publicDecrypt } from 'node:crypto';
import { CryptoService, DecryptionFailedError } from './crypto.service';
import { RsaKeys } from './rsa-keys.provider';

function generateRsaKeys(): RsaKeys {
  return generateKeyPairSync('rsa', { modulusLength: 2048 });
}

describe('CryptoService', () => {
  const keys = generateRsaKeys();
  let service: CryptoService;

  beforeEach(() => {
    service = new CryptoService(keys);
  });

  describe('encrypt', () => {
    it('returns base64 data1 and data2', () => {
      const { data1, data2 } = service.encrypt('hello');

      expect(data1).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(data2).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('encrypts a random 32-character AES key into data1 with the private key', () => {
      const { data1 } = service.encrypt('hello');

      const aesKey = publicDecrypt(
        { key: keys.publicKey, padding: constants.RSA_PKCS1_PADDING },
        Buffer.from(data1, 'base64'),
      ).toString('utf8');

      expect(aesKey).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it('uses a new AES key for every call', () => {
      const first = service.encrypt('same payload');
      const second = service.encrypt('same payload');

      expect(first.data1).not.toEqual(second.data1);
      expect(first.data2).not.toEqual(second.data2);
    });

    it('does not leak the plaintext into data2', () => {
      const { data2 } = service.encrypt('top secret');

      expect(Buffer.from(data2, 'base64').toString('utf8')).not.toContain(
        'top secret',
      );
    });
  });

  describe('decrypt', () => {
    it.each([
      ['a short string', 'Hello, I am Renny'],
      ['an empty string', ''],
      ['2000 characters', 'x'.repeat(2000)],
      ['unicode text', 'สวัสดีครับ 👋 héllo'],
      ['JSON text', JSON.stringify({ id: 1, name: 'test' })],
    ])('round-trips %s', (_label, payload) => {
      const { data1, data2 } = service.encrypt(payload);

      expect(service.decrypt(data1, data2)).toBe(payload);
    });

    it('fails when data2 has been tampered with', () => {
      const { data1, data2 } = service.encrypt('hello');
      const tampered = Buffer.from(data2, 'base64');
      tampered[tampered.length - 1] ^= 0xff;

      expect(() => service.decrypt(data1, tampered.toString('base64'))).toThrow(
        DecryptionFailedError,
      );
    });

    it('fails when data1 and data2 come from different encryptions', () => {
      const first = service.encrypt('first');
      const second = service.encrypt('second');

      expect(() => service.decrypt(first.data1, second.data2)).toThrow(
        DecryptionFailedError,
      );
    });

    it('fails when data1 was encrypted with another private key', () => {
      const { data1, data2 } = new CryptoService(generateRsaKeys()).encrypt(
        'hello',
      );

      expect(() => service.decrypt(data1, data2)).toThrow(
        DecryptionFailedError,
      );
    });

    it('fails when data2 is too short', () => {
      const { data1 } = service.encrypt('hello');

      expect(() =>
        service.decrypt(data1, Buffer.from('short').toString('base64')),
      ).toThrow(DecryptionFailedError);
    });

    it('fails on garbage input', () => {
      expect(() => service.decrypt('Zm9v', 'YmFy')).toThrow(
        DecryptionFailedError,
      );
    });
  });
});
