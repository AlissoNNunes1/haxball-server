import { escapeString } from '../../../src/utils/escapeString';

describe('escapeString', () => {
  it('deve escapar aspas duplas', () => {
    expect(escapeString('test"quote')).toBe('test\\"quote');
  });

  it('nao deve escapar barras invertidas', () => {
    expect(escapeString('test\\slash')).toBe('test\\slash');
  });

  it('deve escapar multiplas aspas', () => {
    expect(escapeString('a"b"c')).toBe('a\\"b\\"c');
  });

  it('nao deve escapar multiplas barras', () => {
    expect(escapeString('a\\b\\c')).toBe('a\\b\\c');
  });

  it('deve escapar aspas mesmo com barras presentes', () => {
    expect(escapeString('test\\"value')).toBe('test\\\\"value');
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(escapeString('')).toBe('');
  });

  it('deve retornar string inalterada se sem caracteres especiais', () => {
    expect(escapeString('hello world')).toBe('hello world');
  });

  it('deve aceitar entrada com numeros', () => {
    expect(escapeString('123"456')).toBe('123\\"456');
  });

  it('deve manter newlines e tabs', () => {
    expect(escapeString('hello\nworld\ttab')).toBe('hello\nworld\ttab');
  });

  it('deve retornar numero se entrada nao for string', () => {
    expect(escapeString(123 as any)).toBe(123);
  });

  it('deve retornar null se entrada for null', () => {
    expect(escapeString(null as any)).toBe(null);
  });

  it('deve retornar undefined se entrada for undefined', () => {
    expect(escapeString(undefined as any)).toBe(undefined);
  });
});

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
