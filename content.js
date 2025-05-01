/**
 * Content script for the Word Replacer Chrome Extension.
 * Finds and replaces words on web pages based on user-defined rules,
 * applying smart capitalization.
 */

console.log("Word Replacer content script loaded.");

let replacements = []; // Store fetched replacements

// Function to fetch replacements from storage
async function fetchReplacements() {
    try {
        const data = await chrome.storage.sync.get({ replacements: [] });
        replacements = data.replacements || [];
        console.log("Replacements fetched:", replacements);
        // Trigger initial replacement after fetching
        if (replacements.length > 0) {
            performReplacements(document.body);
        }
    } catch (error) {
        console.error("Word Replacer: Error fetching replacements:", error);
    }
}

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(str) {
    // $& means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Applies smart capitalization to the replacement word based on the original word's capitalization.
 * @param {string} originalWord - The original word that was matched.
 * @param {string} replacementWord - The word to replace it with.
 * @returns {string} The replacement word with appropriate capitalization.
 */
function smartCapitalize(originalWord, replacementWord) {
    const isFirstCharUpper = /^[A-Z]/.test(originalWord);
    const isAllCaps = originalWord === originalWord.toUpperCase();

    if (isAllCaps) {
        return replacementWord.toUpperCase();
    } else if (isFirstCharUpper) {
        // Check if it's Title Case (only first letter capitalized)
        const isTitleCase = originalWord.length === 1 || /^[A-Z][^A-Z]*$/.test(originalWord);
         if (isTitleCase) {
            return replacementWord.charAt(0).toUpperCase() + replacementWord.slice(1).toLowerCase();
         } else {
             // If it's mixed case (e.g., camelCase, or multiple caps), default to lowercase
             // Or potentially try to match the first letter capitalization only
             return replacementWord.charAt(0).toUpperCase() + replacementWord.slice(1).toLowerCase(); // Simple Title Case
             // return replacementWord.toLowerCase(); // Alternative: Default to lowercase
         }
    } else {
        // All lowercase or other cases, default to lowercase
        return replacementWord.toLowerCase();
    }
}


/**
 * Performs the word replacements within a given DOM node.
 * @param {Node} node - The DOM node to process (usually document.body or a newly added node).
 */
function performReplacements(node) {
    if (!replacements || replacements.length === 0) {
        // console.log("Word Replacer: No replacements defined or loaded.");
        return; // No rules to apply
    }
     if (!node) {
        // console.warn("Word Replacer: performReplacements called with null node.");
        return;
     }


    // Define tags to skip
    const skipTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CANVAS', 'CODE', 'PRE']);
    // Define selectors for contenteditable elements to skip
    const editableSelector = '[contenteditable="true"], [contenteditable=""]';

    // Use TreeWalker for efficient DOM traversal
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT, // Only interested in text nodes
        {
            acceptNode: function (textNode) {
                // Skip nodes within specified tags or contenteditable elements
                let parent = textNode.parentNode;
                while (parent && parent !== document.body) {
                    if (skipTags.has(parent.nodeName.toUpperCase()) || parent.matches(editableSelector)) {
                        return NodeFilter.FILTER_REJECT; // Skip this node and its children
                    }
                    parent = parent.parentNode;
                }
                 // Skip nodes that are purely whitespace
                 if (!textNode.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                 }

                return NodeFilter.FILTER_ACCEPT; // Process this node
            }
        }
    );

    let currentNode;
    const nodesToReplace = []; // Collect nodes to modify after traversal

    // First pass: Find all nodes that need replacement
    while (currentNode = walker.nextNode()) {
        let nodeValueChanged = false;
        let currentText = currentNode.nodeValue;

        for (const rule of replacements) {
            // Important: Create the regex for each rule inside the loop
            // Use word boundaries (\b) to match whole words/phrases only.
            // Use 'gi' flags for global and case-insensitive matching.
            const findRegex = new RegExp(`\\b${escapeRegExp(rule.find)}\\b`, 'gi');

            // Use replace with a function to handle smart capitalization for each match
             if (findRegex.test(currentText)) {
                 currentText = currentText.replace(findRegex, (match) => {
                     nodeValueChanged = true; // Mark that a change occurred
                     // console.log(`Replacing "${match}" with capitalized version of "${rule.replace}"`);
                     return smartCapitalize(match, rule.replace);
                 });
             }
        }

        if (nodeValueChanged) {
            // Store the node and its new text value
            nodesToReplace.push({ node: currentNode, newValue: currentText });
        }
    }

     // Second pass: Apply the changes
     // Modifying nodes while iterating can cause issues, so we do it separately.
     if (nodesToReplace.length > 0) {
         // console.log(`Word Replacer: Applying ${nodesToReplace.length} replacements.`);
         nodesToReplace.forEach(item => {
             item.node.nodeValue = item.newValue;
         });
     }
}

// --- Main Execution ---

// 1. Fetch replacements initially
fetchReplacements();

// 2. Set up MutationObserver to watch for dynamic content changes
const observer = new MutationObserver((mutationsList) => {
    // Use a Set to avoid processing the same node multiple times if nested mutations occur
    const nodesToProcess = new Set();

    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // Process the node itself if it's an element,
                // or its parent if it's text (though TreeWalker handles text nodes directly)
                if (node.nodeType === Node.ELEMENT_NODE) {
                     nodesToProcess.add(node);
                } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                     // If a text node is added directly, process its parent container
                     nodesToProcess.add(node.parentNode);
                }
            });
        } else if (mutation.type === 'characterData') {
            // If text content changes directly, process the parent element
            // This might be less common than childList additions
            if (mutation.target.parentNode) {
                nodesToProcess.add(mutation.target.parentNode);
            }
        }
    }

    // Apply replacements to the unique set of affected nodes
    if (nodesToProcess.size > 0 && replacements.length > 0) {
        // console.log("Word Replacer: Detected DOM changes, processing new nodes:", nodesToProcess);
        nodesToProcess.forEach(node => {
             // Check if the node is still connected to the document
             if (document.body.contains(node)) {
                performReplacements(node);
             }
        });
    }
});

// Start observing the document body for added nodes and subtree modifications
// Also observe character data changes, although childList is often sufficient
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true // Observe direct text changes (less common for dynamic content)
});

// 3. Listen for changes in storage (e.g., user updates rules in options)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.replacements) {
        console.log("Word Replacer: Detected change in stored replacements.");
        replacements = changes.replacements.newValue || [];
        // Optionally, re-run replacements on the whole page if rules change significantly
        // This can be intensive, so consider if it's truly needed.
        // For simplicity, we'll rely on the initial load and MutationObserver
        // for future changes. If a full re-scan is desired:
        // performReplacements(document.body);
    }
});

// Ensure replacements run after the initial HTML is parsed,
// even if the script is injected early.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fetchReplacements().then(() => performReplacements(document.body)));
} else {
    // Already loaded or interactive/complete
    fetchReplacements().then(() => performReplacements(document.body));
}
