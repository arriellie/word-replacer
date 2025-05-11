const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
const { mockStorage, showRuleForm, hideRuleForm, saveRule, renderRules } = require('./mockPopup');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Load the popup HTML
const popupHtml = fs.readFileSync(path.resolve(__dirname, '../popup.html'), 'utf8');
const dom = new JSDOM(popupHtml, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
});

global.document = dom.window.document;
global.window = dom.window;

// Set up required DOM elements
document.body.innerHTML = `
    <div id="rules-list"></div>
    <button id="add-rule-btn">Add Rule</button>
    <div id="rule-form" class="hidden">
        <h2 id="form-title">Add New Rule</h2>
        <input type="text" id="find-input" placeholder="Find">
        <input type="text" id="replace-input" placeholder="Replace">
        <button id="save-btn">Save</button>
        <button id="cancel-btn" class="hidden">Cancel</button>
    </div>
    <div id="status-message"></div>
`;

// Mock chrome API
const mockListeners = {
    onInstalled: [],
    onClicked: [],
    onMessage: []
};

global.chrome = {
    storage: {
        sync: mockStorage
    },
    tabs: {
        query: jest.fn((query, callback) => {
            callback([{ id: 1, url: 'https://example.com' }]);
        }),
        sendMessage: jest.fn((tabId, message) => {
            return Promise.resolve();
        })
    },
    runtime: {
        openOptionsPage: jest.fn(),
        onInstalled: {
            addListener: jest.fn(callback => {
                mockListeners.onInstalled.push(callback);
            })
        },
        onMessage: {
            addListener: jest.fn(callback => {
                mockListeners.onMessage.push(callback);
            })
        }
    },
    action: {
        onClicked: {
            addListener: jest.fn(callback => {
                mockListeners.onClicked.push(callback);
            })
        }
    }
};

describe('Popup Integration Tests', () => {
    beforeEach(() => {
        // Reset mock storage and functions
        mockStorage.rules = [];
        jest.clearAllMocks();
        
        // Reset form state
        document.getElementById('rule-form').classList.add('hidden');
        document.getElementById('find-input').value = '';
        document.getElementById('replace-input').value = '';
        document.getElementById('status-message').textContent = '';
    });

    test('should load and display rules from storage', () => {
        // Set up initial rules
        mockStorage.rules = [
            { find: 'hello', replace: 'hi' },
            { find: 'world', replace: 'earth' }
        ];

        // Render rules
        renderRules(mockStorage.rules);

        // Check if rules are displayed
        const rulesList = document.getElementById('rules-list');
        expect(rulesList.innerHTML).toContain('hello');
        expect(rulesList.innerHTML).toContain('hi');
        expect(rulesList.innerHTML).toContain('world');
        expect(rulesList.innerHTML).toContain('earth');
    });

    test('should add a new rule', () => {
        // Show the rule form
        showRuleForm('add');

        // Fill in the form
        document.getElementById('find-input').value = 'test';
        document.getElementById('replace-input').value = 'example';

        // Save the rule
        saveRule();

        // Check if the rule was saved
        expect(mockStorage.rules).toContainEqual({ find: 'test', replace: 'example' });

        // Check if success message was shown
        const statusMessage = document.getElementById('status-message');
        expect(statusMessage.textContent).toBe('Rule added successfully!');
    });

    test('should handle circular dependency detection', () => {
        // Add initial rule
        mockStorage.rules = [{ find: 'hello', replace: 'hi' }];

        // Show the rule form
        showRuleForm('add');

        // Try to add a rule that would create a circular dependency
        document.getElementById('find-input').value = 'hi';
        document.getElementById('replace-input').value = 'hello';

        // Save the rule
        saveRule();

        // Check if the rule was not saved
        expect(mockStorage.rules).not.toContainEqual({ find: 'hi', replace: 'hello' });
        
        // Check if error message was shown
        const statusMessage = document.getElementById('status-message');
        expect(statusMessage.textContent).toContain('endless loop');
    });

    test('should handle duplicate rule detection', () => {
        // Add initial rule
        mockStorage.rules = [{ find: 'hello', replace: 'hi' }];

        // Show the rule form
        showRuleForm('add');

        // Try to add a duplicate rule
        document.getElementById('find-input').value = 'hello';
        document.getElementById('replace-input').value = 'greetings';

        // Save the rule
        saveRule();

        // Check if the rule was not saved
        expect(mockStorage.rules.length).toBe(1);
        
        // Check if error message was shown
        const statusMessage = document.getElementById('status-message');
        expect(statusMessage.textContent).toContain('already exists');
    });
});

describe('Background Script Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockListeners.onInstalled = [];
        mockListeners.onClicked = [];
        mockListeners.onMessage = [];
    });

    test('should initialize storage on first install', () => {
        // Add install listener
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                mockStorage.get('rules', (result) => {
                    if (!result.rules) {
                        mockStorage.set({ rules: [] });
                    }
                });
            }
        });

        // Simulate install event
        mockListeners.onInstalled.forEach(callback => callback({ reason: 'install' }));

        // Check if storage was initialized
        expect(mockStorage.get).toHaveBeenCalledWith('rules', expect.any(Function));
    });

    test('should handle icon click', () => {
        // Add click listener
        chrome.action.onClicked.addListener(() => {
            chrome.runtime.openOptionsPage();
        });

        // Simulate icon click
        mockListeners.onClicked.forEach(callback => callback({ id: 1 }));

        // Check if options page was opened
        expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    test('should handle getRules message', () => {
        // Set up mock rules
        mockStorage.rules = [{ find: 'hello', replace: 'hi' }];

        // Add message listener
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'getRules') {
                mockStorage.get('rules', (result) => {
                    sendResponse({ rules: result.rules });
                });
                return true;
            }
        });

        // Simulate message
        const sendResponse = jest.fn();
        mockListeners.onMessage.forEach(callback => callback(
            { action: 'getRules' },
            { id: 1 },
            sendResponse
        ));

        // Check if rules were sent back
        expect(sendResponse).toHaveBeenCalledWith({ rules: [{ find: 'hello', replace: 'hi' }] });
    });
}); 