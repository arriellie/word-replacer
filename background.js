/**
 * Background service worker for the Word Replacer Chrome Extension.
 * Handles extension installation/update events and icon clicks.
 */

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Word Replacer extension installed or updated.", details);
    // You could potentially set default replacements here on first install
    if (details.reason === "install") {
        // Maybe open the options page on first install?
        // chrome.runtime.openOptionsPage();
        console.log("Word Replacer installed for the first time!");
         // Set initial empty replacements array if it doesn't exist
         chrome.storage.sync.get('replacements', (data) => {
            if (!data.replacements) {
                chrome.storage.sync.set({ replacements: [] });
            }
        });
    }
});

// Log when the service worker starts
console.log("Word Replacer service worker started.");

// Handle clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
    // When the icon is clicked, open the options page
    console.log("Extension icon clicked, opening options page.");
    chrome.runtime.openOptionsPage();
});


// Listen for messages (optional, can be used for communication between scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background script received message:", message, "from sender:", sender);
    // Example: Handle a request from content script if needed
    if (message.action === "getReplacements") {
        chrome.storage.sync.get({ replacements: [] }, (data) => {
            sendResponse({ replacements: data.replacements });
        });
        return true; // Indicates response will be sent asynchronously
    }
     // Add other message handlers if necessary
});

// Inject content script programmatically when a tab updates
// This provides more control than manifest-based injection but adds complexity.
// Sticking with manifest `content_scripts` is simpler for this use case.
// If programmatic injection was needed:
/*
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the tab is fully loaded and has a URL
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
        console.log(`Injecting content script into tab ${tabId} (${tab.url})`);
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            console.log(`Successfully injected content script into tab ${tabId}`);
        }).catch(err => {
            console.error(`Failed to inject content script into tab ${tabId}:`, err);
        });
    }
});
*/
// NOTE: The above programmatic injection is commented out because
// the manifest.json already defines content_scripts, which is sufficient
// and generally preferred unless fine-grained control over injection timing
// or conditions is absolutely necessary. Using both can lead to scripts
// being injected multiple times. Choose one method. We are using the manifest method.
