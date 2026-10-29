# Nest Crypto API

A NestJS HTTP service with two endpoints:

- **`POST /get-encrypt-data`** encrypts a payload with a random AES key, then encrypts that AES key with an RSA **private** key.
- **`POST /get-decrypt-data`** reverses it: it decrypts the AES key with the RSA **public** key, then decrypts the payload.

Swagger docs for both APIs are served at **`/api-docs`**.

## Requirements

- Node.js 24+ (run `nvm use` to pick up the version from `.nvmrc`)
- npm 11+

## How to start the service

```bash
npm install
npm run start
```

The service listens on `http://localhost:3000` (set `PORT` to change this). Swagger UI is at **http://localhost:3000/api-docs** and the raw OpenAPI JSON is at `/api-docs-json`.

`npm run start` (and `npm run start:dev`) first run `npm run keys:generate`. If `keys/private.pem` and `keys/public.pem` don't exist yet, that script creates a 2048-bit RSA key pair for local use.

Other ways to run it:

```bash
npm run start:dev                  # watch mode
npm run build && npm run start:prod   # compiled build (expects keys to exist already)
```

### RSA key configuration

The service needs an RSA key pair, for example one generated at https://cryptotools.net/rsagen. The `npm run keys:generate` script writes the same PEM format (PKCS#1 private key, SPKI public key).

To use your own keys, copy `.env.example` to `.env` and choose one option:

| Variable | Description |
| --- | --- |
| `RSA_PRIVATE_KEY_PATH` / `RSA_PUBLIC_KEY_PATH` | Paths to the PEM files. Defaults: `keys/private.pem`, `keys/public.pem`. |
| `RSA_PRIVATE_KEY` / `RSA_PUBLIC_KEY` | The PEM contents inline, with newlines escaped as `\n`. These take precedence over the paths. |
| `PORT` | HTTP port. Default: `3000`. |

The service refuses to start if a key is missing or if the public key doesn't belong to the private key. `keys/*.pem` and `.env` are git-ignored, so keys are never committed.

## API

Every response uses the same envelope:

```json
{ "successful": true, "error_code": "", "data": { } }
```

On errors, `successful` is `false`, `error_code` is set and `data` is `null`.

### `POST /get-encrypt-data`

Request body:

| Field | Rules |
| --- | --- |
| `payload` | string, required, 0 - 2000 characters |

Steps:

1. Validate the request.
2. Generate a random 32-character AES key.
3. `data2`: encrypt `payload` with the AES key.
4. `data1`: encrypt the AES key with the RSA private key.
5. Return `data1` and `data2`.

```bash
curl -X POST http://localhost:3000/get-encrypt-data \
  -H 'Content-Type: application/json' \
  -d '{"payload": "Hello, I am Renny"}'
```

```json
{
  "successful": true,
  "error_code": "",
  "data": { "data1": "MFkvmX95Mq...", "data2": "q2l0Yz8Zr..." }
}
```

### `POST /get-decrypt-data`

Request body:

| Field | Rules |
| --- | --- |
| `data1` | string, required (base64) |
| `data2` | string, required (base64) |

Steps:

1. Validate the request.
2. Get the AES key by decrypting `data1` with the RSA public key.
3. Get the payload by decrypting `data2` with that AES key.
4. Return the payload.

```bash
curl -X POST http://localhost:3000/get-decrypt-data \
  -H 'Content-Type: application/json' \
  -d '{"data1": "<data1>", "data2": "<data2>"}'
```

```json
{ "successful": true, "error_code": "", "data": { "payload": "Hello, I am Renny" } }
```

### Error codes

| HTTP | `error_code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | The request body breaks the rules above. |
| 400 | `DECRYPTION_FAILED` | `data1`/`data2` are valid base64 but can't be decrypted (wrong key, tampered or mismatched data). |
| 400 | `BAD_REQUEST` | The JSON body is malformed. |
| 4xx | HTTP status name, e.g. `NOT_FOUND` | Other HTTP errors. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected errors. Details are logged on the server, never returned. |

Validation and decryption details are logged on the server at `warn` level.

## Crypto details

- **AES key**: 32 random alphanumeric characters (from `crypto.randomInt`), used as a 256-bit key.
- **data2**: AES-256-GCM with a random 12-byte IV per request, encoded as `base64(iv | authTag | ciphertext)`. GCM's auth tag means a tampered `data2` is rejected instead of decrypting to garbage.
- **data1**: the AES key encrypted with the RSA private key (`crypto.privateEncrypt`, PKCS#1 v1.5 padding), encoded as base64. Anyone with the public key can decrypt it (`crypto.publicDecrypt`), as the spec requires.

> Note: because the spec wraps the AES key with the **private** key, `data1` proves the data came from this service but does not keep the payload secret from anyone who holds the public key.

## Tests

```bash
npm test            # unit tests
npm run test:e2e    # HTTP tests against the full app (RSA keys generated in memory)
npm run test:cov    # unit tests with coverage
```

Unit tests cover:

- `CryptoService`: round-trips (empty, 2000 characters, unicode); a new AES key per call; tampered, mismatched and wrong-key input.
- `CryptoController`: the response envelope and how errors are mapped.
- Request DTO validation.
- RSA key loading: from files or inline, plus errors for missing or mismatched keys.
- The global exception filter.

The e2e tests also check that `/api-docs` serves Swagger with both APIs documented.

## Project structure

```
src/
  main.ts                       # bootstrap
  app.setup.ts                  # global ValidationPipe, exception filter, Swagger (/api-docs)
  app.module.ts
  common/                       # response envelope, error codes, exception filter
  crypto/
    crypto.controller.ts        # POST /get-encrypt-data, POST /get-decrypt-data
    crypto.service.ts           # AES + RSA logic
    rsa-keys.provider.ts        # loads and checks the RSA key pair
    dto/                        # request/response DTOs (validation + Swagger)
scripts/generate-keys.mjs       # RSA key pair generator
test/app.e2e-spec.ts            # e2e tests
```
