# Word Replacer Browser Extension

A browser extension that allows you to replace specified words on web pages with smart capitalization.

## Features

- Replace words on any webpage with custom replacements
- Smart capitalization handling
- Easy-to-use options page for managing replacement rules
- Works across all websites
- Persistent storage of replacement rules

## Installation

1. Clone this repository
2. Open your browser's extension management page
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your browser toolbar
2. Use the options page to add or modify word replacement rules
3. The replacements will automatically apply to all web pages you visit

## Development

The extension consists of the following main components:

- `manifest.json`: Extension configuration
- `background.js`: Background service worker for handling extension events
- `content.js`: Content script that performs the word replacements
- `options.html`, `options.js`, `options.css`: User interface for managing replacement rules

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
