// Mock browser extension APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (typeof callback === 'function') {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      }),
    },
    sync: {
      get: jest.fn((keys, callback) => {
        if (typeof callback === 'function') {
          callback({ rules: [] });
        }
        return Promise.resolve({ rules: [] });
      }),
      set: jest.fn((items, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    getURL: jest.fn(path => `chrome-extension://mock-extension-id/${path}`),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock DOM elements
document.body.innerHTML = '<div id="app"></div>';

// Mock console methods
global.console = {
  ...console,
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Ensure global is defined in the test environment
if (typeof global === 'undefined') {
  global = window;
}

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => {
  callback();
  return 1;
};

// Add TextEncoder and TextDecoder to global
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder; 