import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { RSA_KEYS } from './../src/crypto/rsa-keys.provider';

describe('Crypto API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RSA_KEYS)
      .useValue(generateKeyPairSync('rsa', { modulusLength: 2048 }))
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(async () => {
    await app.close();
  });

  const encrypt = (body: unknown) =>
    request(app.getHttpServer())
      .post('/get-encrypt-data')
      .send(body as object);
  const decrypt = (body: unknown) =>
    request(app.getHttpServer())
      .post('/get-decrypt-data')
      .send(body as object);

  describe('GET /api-docs', () => {
    it('serves the Swagger UI', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-docs/')
        .expect(200);

      expect(res.text).toContain('swagger-ui');
    });

    it('documents both APIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);

      const { paths } = res.body as { paths: Record<string, unknown> };
      expect(Object.keys(paths).sort()).toEqual([
        '/get-decrypt-data',
        '/get-encrypt-data',
      ]);
    });
  });

  describe('POST /get-encrypt-data', () => {
    it('returns data1 and data2', async () => {
      const res = await encrypt({ payload: 'Hello, I am Renny' }).expect(200);

      expect(res.body).toEqual({
        successful: true,
        error_code: '',
        data: {
          data1: expect.any(String) as unknown,
          data2: expect.any(String) as unknown,
        },
      });
    });

    it('accepts an empty payload', async () => {
      await encrypt({ payload: '' }).expect(200);
    });

    it.each([
      ['missing', {}],
      ['not a string', { payload: 42 }],
      ['over 2000 characters', { payload: 'a'.repeat(2001) }],
    ])('rejects a payload that is %s', async (_label, body) => {
      const res = await encrypt(body).expect(400);

      expect(res.body).toEqual({
        successful: false,
        error_code: 'VALIDATION_ERROR',
        data: null,
      });
    });
  });

  describe('POST /get-decrypt-data', () => {
    it('decrypts what /get-encrypt-data returned', async () => {
      const payload = 'สวัสดี, 👋 '.repeat(100);
      const encrypted = await encrypt({ payload }).expect(200);

      const { data } = encrypted.body as { data: object };
      const res = await decrypt(data).expect(200);

      expect(res.body).toEqual({
        successful: true,
        error_code: '',
        data: { payload },
      });
    });

    it('rejects missing fields', async () => {
      const res = await decrypt({ data1: 'Zm9v' }).expect(400);

      expect(res.body).toEqual({
        successful: false,
        error_code: 'VALIDATION_ERROR',
        data: null,
      });
    });

    it('returns DECRYPTION_FAILED for data it cannot decrypt', async () => {
      const res = await decrypt({ data1: 'Zm9v', data2: 'YmFy' }).expect(400);

      expect(res.body).toEqual({
        successful: false,
        error_code: 'DECRYPTION_FAILED',
        data: null,
      });
    });
  });

  it('returns the same envelope for malformed JSON', async () => {
    const res = await request(app.getHttpServer())
      .post('/get-encrypt-data')
      .set('Content-Type', 'application/json')
      .send('{"payload": ')
      .expect(400);

    expect(res.body).toEqual({
      successful: false,
      error_code: 'BAD_REQUEST',
      data: null,
    });
  });
});
