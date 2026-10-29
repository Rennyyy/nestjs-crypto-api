import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DecryptRequestDto } from './decrypt.dto';
import { EncryptRequestDto, PAYLOAD_MAX_LENGTH } from './encrypt.dto';

function errorsFor<T extends object>(
  dto: new () => T,
  body: Record<string, unknown>,
): string[] {
  return validateSync(plainToInstance(dto, body)).map((e) => e.property);
}

describe('EncryptRequestDto', () => {
  it.each([
    ['an empty string', ''],
    ['a normal string', 'hello'],
    [
      `exactly ${PAYLOAD_MAX_LENGTH} characters`,
      'a'.repeat(PAYLOAD_MAX_LENGTH),
    ],
    [
      `${PAYLOAD_MAX_LENGTH} emoji (counted as characters, not UTF-16 units)`,
      '😀'.repeat(PAYLOAD_MAX_LENGTH),
    ],
  ])('accepts %s', (_label, payload) => {
    expect(errorsFor(EncryptRequestDto, { payload })).toEqual([]);
  });

  it.each([
    ['missing', {}],
    ['null', { payload: null }],
    ['a number', { payload: 123 }],
    ['an object', { payload: { text: 'hi' } }],
    [
      `longer than ${PAYLOAD_MAX_LENGTH} characters`,
      { payload: 'a'.repeat(PAYLOAD_MAX_LENGTH + 1) },
    ],
  ])('rejects a payload that is %s', (_label, body) => {
    expect(errorsFor(EncryptRequestDto, body)).toEqual(['payload']);
  });
});

describe('DecryptRequestDto', () => {
  it('accepts base64 data1 and data2', () => {
    expect(
      errorsFor(DecryptRequestDto, { data1: 'Zm9v', data2: 'YmFyYmF6' }),
    ).toEqual([]);
  });

  it.each([
    ['missing', {}, ['data1', 'data2']],
    ['empty', { data1: '', data2: '' }, ['data1', 'data2']],
    ['not strings', { data1: 1, data2: true }, ['data1', 'data2']],
    ['not base64', { data1: 'not base64!', data2: 'Zm9v' }, ['data1']],
  ])('rejects data that is %s', (_label, body, expected) => {
    expect(errorsFor(DecryptRequestDto, body)).toEqual(expected);
  });
});
