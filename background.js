/**
 * Background service worker for the Word Replacer Chrome Extension.
 * Handles extension installation/update events and icon clicks.
 */

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    console.debug("Word Replacer extension installed or updated.", details);
    if (details.reason === "install") {
        console.debug("Word Replacer installed for the first time!");
         // Set initial empty rules array if it doesn't exist
         chrome.storage.sync.get('rules', (data) => {
            if (!data.rules) {
                chrome.storage.sync.set({ rules: [] });
            }
        });
    }
});

// Handle clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
    // When the icon is clicked, open the options page
    console.debug("Extension icon clicked, opening options page.");
    chrome.runtime.openOptionsPage();
});

// Listen for messages (optional, can be used for communication between scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug("Background script received message:", message, "from sender:", sender);
    if (message.action === "getRules") {
        chrome.storage.sync.get({ rules: [] }, (data) => {
            sendResponse({ rules: data.rules });
        });
        return true; // Indicates response will be sent asynchronously
    }
});
