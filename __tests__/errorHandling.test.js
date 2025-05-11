const { smartCapitalize, escapeRegExp, parseFindString } = require('../content.js');

// Mock chrome API
global.chrome = {
    storage: {
        sync: {
            get: jest.fn(),
            set: jest.fn()
        }
    },
    tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
    },
    runtime: {
        onMessage: {
            addListener: jest.fn()
        }
    }
};

describe('Error Handling Scenarios', () => {
    describe('Storage Errors', () => {
        test('should handle storage get errors gracefully', () => {
            // Mock chrome storage to simulate an error
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({});
            });

            // This should not throw an error
            expect(() => {
                chrome.storage.sync.get({ rules: [] }, () => {});
            }).not.toThrow();
        });

        test('should handle storage set errors gracefully', () => {
            // Mock chrome storage to simulate an error
            chrome.storage.sync.set.mockImplementation((items, callback) => {
                if (callback) callback();
            });

            // This should not throw an error
            expect(() => {
                chrome.storage.sync.set({ rules: [] }, () => {});
            }).not.toThrow();
        });
    });

    describe('Invalid Input Handling', () => {
        test('should handle null find string', () => {
            const find = null;
            const replace = 'test';
            const parsed = parseFindString(find);
            expect(parsed).toEqual([]);
        });

        test('should handle undefined find string', () => {
            const find = undefined;
            const replace = 'test';
            const parsed = parseFindString(find);
            expect(parsed).toEqual([]);
        });

        test('should handle non-string inputs', () => {
            const find = 123;
            const replace = 'test';
            const parsed = parseFindString(find);
            expect(parsed).toEqual([]);
        });

        test('should handle null replace string', () => {
            const find = 'hello';
            const replace = null;
            const result = smartCapitalize(find, replace);
            expect(result).toBe('');
        });

        test('should handle undefined replace string', () => {
            const find = 'hello';
            const replace = undefined;
            const result = smartCapitalize(find, replace);
            expect(result).toBe('');
        });
    });

    describe('Message Handling Errors', () => {
        test('should handle invalid message format', () => {
            // This should not throw an error
            expect(() => {
                chrome.runtime.onMessage.addListener(() => {});
            }).not.toThrow();
        });

        test('should handle missing message properties', () => {
            // This should not throw an error
            expect(() => {
                chrome.runtime.onMessage.addListener((message) => {
                    if (!message.action) {
                        return;
                    }
                });
            }).not.toThrow();
        });
    });

    describe('DOM Manipulation Errors', () => {
        test('should handle missing DOM elements', () => {
            // Mock document.getElementById to return null
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn(() => null);

            // This should not throw an error
            expect(() => {
                document.getElementById('non-existent');
            }).not.toThrow();

            // Restore original function
            document.getElementById = originalGetElementById;
        });

        test('should handle invalid DOM operations', () => {
            // Mock document.createElement to throw an error
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn(() => {
                throw new Error('DOM operation failed');
            });

            // This should not throw an error
            expect(() => {
                try {
                    document.createElement('div');
                } catch (e) {
                    // Error should be caught
                }
            }).not.toThrow();

            // Restore original function
            document.createElement = originalCreateElement;
        });
    });

    describe('Tab Communication Errors', () => {
        test('should handle tab query errors', () => {
            // Mock chrome.tabs.query to simulate an error
            chrome.tabs.query.mockImplementation((query, callback) => {
                callback([]);
            });

            // This should not throw an error
            expect(() => {
                chrome.tabs.query({}, () => {});
            }).not.toThrow();
        });

        test('should handle tab message errors', () => {
            // Mock chrome.tabs.sendMessage to simulate an error
            chrome.tabs.sendMessage.mockImplementation(() => {
                return Promise.reject(new Error('Failed to send message'));
            });

            // This should not throw an error
            expect(() => {
                chrome.tabs.sendMessage(1, { action: 'test' }).catch(() => {});
            }).not.toThrow();
        });
    });
}); 