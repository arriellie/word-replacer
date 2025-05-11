const { smartCapitalize, escapeRegExp, parseFindString } = require('../content.js');

describe('Word Replacement Functions', () => {
  describe('smartCapitalize', () => {
    test('should handle all caps', () => {
      expect(smartCapitalize('HELLO', 'world')).toBe('WORLD');
    });

    test('should handle title case', () => {
      expect(smartCapitalize('Hello', 'world')).toBe('World');
    });

    test('should handle lowercase', () => {
      expect(smartCapitalize('hello', 'world')).toBe('world');
    });

    test('should handle mixed case', () => {
      expect(smartCapitalize('hElLo', 'world')).toBe('World');
    });
  });

  describe('escapeRegExp', () => {
    test('should escape special regex characters', () => {
      expect(escapeRegExp('test*test')).toBe('test\\*test');
      expect(escapeRegExp('test.test')).toBe('test\\.test');
      expect(escapeRegExp('test+test')).toBe('test\\+test');
    });

    test('should not escape regular characters', () => {
      expect(escapeRegExp('test')).toBe('test');
    });
  });

  describe('parseFindString', () => {
    test('should split comma-separated values', () => {
      expect(parseFindString('hello, world')).toEqual(['hello', 'world']);
    });

    test('should trim whitespace', () => {
      expect(parseFindString(' hello , world ')).toEqual(['hello', 'world']);
    });

    test('should filter empty strings', () => {
      expect(parseFindString('hello,,world')).toEqual(['hello', 'world']);
    });
  });
}); 