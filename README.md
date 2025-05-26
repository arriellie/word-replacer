![CI/CD Status](https://via.placeholder.com/100x20.png?text=CI/CD+Status) (CI/CD pipeline coming soon!)

# Word Replacer Browser Extension

A browser extension that allows you to replace specified words and phrases on web pages.

## Features

- Replace words on any webpage with custom rules
- Smart capitalization handling (preserves original case patterns)
- Easy-to-use rule management interface
- Live page updates as you change rules
- Probably won't let you create infinite loops :)

## Technology Stack

- JavaScript
- HTML
- CSS
- Tailwind CSS

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

## Project Roadmap

You can find the project roadmap and future plans in the [ROADMAP.md](ROADMAP.md) file.

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

We welcome contributions to improve Word Replacer! Here's how you can help:

### Setting up the Development Environment

1.  **Fork the repository:** Click the "Fork" button on the [GitHub repository page](https://github.com/arriellie/word-replacer) to create your own copy.
2.  **Clone your fork:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/word-replacer.git
    cd word-replacer
    ```
3.  **Install dependencies:** Follow the instructions in the "Installation > From Source" section to install the necessary dependencies (i.e., run `npm install`).
4.  **Load the extension in your browser:** Follow the steps in "Installation > From Source" to load the extension in developer mode. This will allow you to test your changes.

### Making Changes

1.  **Create a feature branch:** Before making any changes, create a new branch for your feature or bug fix:
    ```bash
    git checkout -b your-feature-name
    ```
2.  **Implement your changes:** Write your code, ensuring it aligns with the project's coding style and goals.
3.  **Test your changes:** (See "Running Tests" below)

### Submitting Your Contributions

1.  **Commit your changes:**
    ```bash
    git add .
    git commit -m "feat: Describe your feature or fix"
    ```
    (Consider using [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages.)
2.  **Push to your fork:**
    ```bash
    git push origin your-feature-name
    ```
3.  **Submit a pull request:** Open a pull request from your feature branch to the `main` branch of the original `arriellie/word-replacer` repository. Provide a clear description of your changes.

### Running Tests

Currently, this project does not have an automated test suite. We are actively looking for contributions to establish a robust testing environment. If you're interested in helping set up tests (e.g., using Jest, Mocha, or other testing frameworks), your contributions would be highly valuable!

For now, please manually test your changes thoroughly by:
- Loading the extension in your browser.
- Testing the specific functionality you've added or modified.
- Checking for any unintended side effects on existing features.

## License

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for more details.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.
