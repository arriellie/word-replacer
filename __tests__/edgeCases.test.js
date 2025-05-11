const { smartCapitalize, escapeRegExp, parseFindString } = require('../content.js');

describe('Word Replacement Edge Cases', () => {
    describe('Special Characters and Unicode', () => {
        test('should handle special characters in find text', () => {
            const find = 'test*test';
            const replace = 'replaced';
            const escaped = escapeRegExp(find);
            expect(escaped).toBe('test\\*test');
        });

        test('should handle Unicode characters', () => {
            const find = 'café';
            const replace = 'coffee';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('coffee');
        });

        test('should handle emoji in text', () => {
            const find = 'hello 😊';
            const replace = 'hi';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('hi');
        });

        test('should handle mixed Unicode and special characters', () => {
            const find = 'café*test';
            const replace = 'coffee';
            const escaped = escapeRegExp(find);
            expect(escaped).toBe('café\\*test');
        });
    });

    describe('Whitespace Handling', () => {
        test('should handle multiple spaces', () => {
            const find = 'hello  world';
            const replace = 'hi';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['hello  world']);
        });

        test('should handle tabs and newlines', () => {
            const find = 'hello\tworld\n';
            const replace = 'hi';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['hello\tworld']);
        });

        test('should handle non-breaking spaces', () => {
            const find = 'hello\u00A0world';
            const replace = 'hi';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['hello\u00A0world']);
        });
    });

    describe('Case Sensitivity', () => {
        test('should handle case-insensitive matching with special characters', () => {
            const find = 'Hello*World';
            const replace = 'hi';
            const escaped = escapeRegExp(find);
            expect(escaped).toBe('Hello\\*World');
        });

        test('should handle mixed case with Unicode', () => {
            const find = 'Café';
            const replace = 'coffee';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('Coffee');
        });

        test('should handle case preservation with emoji', () => {
            const find = 'HELLO 😊';
            const replace = 'hi';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('HI');
        });
    });

    describe('Empty and Edge Values', () => {
        test('should handle empty find string', () => {
            const find = '';
            const parsed = parseFindString(find);
            expect(parsed).toEqual([]);
        });

        test('should handle empty replace string', () => {
            const find = 'hello';
            const replace = '';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('');
        });

        test('should handle very long strings', () => {
            const longString = 'a'.repeat(1000);
            const find = longString;
            const replace = 'short';
            const result = smartCapitalize(find, replace);
            expect(result).toBe('short');
        });

        test('should handle strings with only special characters', () => {
            const find = '***';
            const replace = 'stars';
            const escaped = escapeRegExp(find);
            expect(escaped).toBe('\\*\\*\\*');
        });
    });

    describe('Multiple Word Replacement', () => {
        test('should handle multiple words with special characters', () => {
            const find = 'hello,world*,test';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['hello', 'world*', 'test']);
        });

        test('should handle multiple Unicode words', () => {
            const find = 'café,crème,brûlée';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['café', 'crème', 'brûlée']);
        });

        test('should handle multiple words with mixed case', () => {
            const find = 'Hello,World,Test';
            const parsed = parseFindString(find);
            expect(parsed).toEqual(['Hello', 'World', 'Test']);
        });
    });
}); 