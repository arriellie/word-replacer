# Word Replacer Browser Extension

A browser extension that allows you to replace specified words and phrases on web pages with smart* capitalization.

## Features

- Replace words on any webpage with custom rules
- Smart capitalization handling (preserves original case patterns)
- Easy-to-use rule management interface
- Live page updates as you change rules
- Probably won't let you accidentally create infinite loops :)

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/arriellie/word-replacer.git
   cd word-replacer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Load the extension in your browser:
   - Chrome/Edge: Open `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

## Usage

1. Click the Word Replacer icon in your browser toolbar to open the popup interface
2. Add new word replacement rules using the form:
   - Enter the word(s) and/or phrase(s) to replace
   - Enter the replacement word or phrase
   - Click "Save"
3. Your rules will automatically apply to all web pages you visit, including currently open pages
4. Manage existing rules:
   - View all active rules in the list
   - Remove rules by clicking the delete button
   - Edit rules by clicking the edit button

## Development

### Project Structure

- `manifest.json`: Extension configuration and permissions
- `background.js`: Service worker for extension lifecycle and event handling
- `content.js`: Content script that performs word replacements on web pages
- `popup.html`: User interface for managing rules
- `popup.js`: Popup interface logic and rule management
- `css/`: Stylesheets for the extension
- `icons/`: Extension icons in various sizes

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request. When contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the ISC License.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.
