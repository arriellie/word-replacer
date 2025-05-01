/**
 * Content script for the Word Replacer Chrome Extension.
 * Finds and replaces words on web pages based on user-defined rules,
 * applying smart capitalization.
 */

console.log("Word Replacer content script loaded.");

let replacements = []; // Store fetched replacements
let replacedNodes = new Map(); // Track which nodes have been replaced and with what

// Function to fetch replacements from storage
async function fetchReplacements() {
    try {
        const data = await chrome.storage.sync.get({ replacements: [] });
        replacements = data.replacements || [];
        console.log("Word Replacer: Replacements fetched:", replacements);
        
        // Clear the tracking map when fetching new rules
        replacedNodes.clear();
        // Always perform replacements after fetching, even if empty
        performReplacements(document.body);
    } catch (error) {
        console.error("Word Replacer: Error fetching replacements:", error);
        replacements = []; // Reset to empty array on error
        replacedNodes.clear();
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

// Function to safely check if an element is React-managed
function isReactElement(element) {
    if (!element) return false;
    return element.hasAttribute('data-reactroot') ||
           element.hasAttribute('data-reactid') ||
           element.hasAttribute('data-react-checksum') ||
           element.hasAttribute('data-reactroot') ||
           element.classList.contains('ReactVirtualized__Grid') ||
           element.classList.contains('ReactVirtualized__List');
}

// Function to safely check if an element should be skipped
function shouldSkipElement(element) {
    if (!element) return true;
    
    const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CANVAS', 'CODE', 'PRE'];
    if (skipTags.includes(element.tagName)) return true;
    
    if (element.hasAttribute('contenteditable')) return true;
    
    // Skip if element or any parent is React-managed
    let current = element;
    while (current && current !== document.body) {
        if (isReactElement(current)) return true;
        current = current.parentElement;
    }
    
    return false;
}

/**
 * Performs the word replacements within a given DOM node.
 * @param {Node} node - The DOM node to process (usually document.body or a newly added node).
 */
function performReplacements(node) {
    if (!node) {
        console.warn("Word Replacer: performReplacements called with null node.");
        return;
    }

    if (!replacements || replacements.length === 0) {
        console.log("Word Replacer: No replacements defined or loaded.");
        return;
    }

    console.log("Word Replacer: Starting replacements with rules:", replacements);

    // Use a more conservative approach to DOM traversal
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (textNode) {
                if (!textNode.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                const parent = textNode.parentElement;
                if (shouldSkipElement(parent)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let currentNode;
    const nodesToReplace = [];

    while (currentNode = walker.nextNode()) {
        let nodeValueChanged = false;
        let currentText = currentNode.nodeValue;

        // If this node was previously replaced, revert it first
        if (replacedNodes.has(currentNode)) {
            const previousReplacements = replacedNodes.get(currentNode);
            for (const { original, replaced } of previousReplacements) {
                const revertRegex = new RegExp(`(^|\\s)${escapeRegExp(replaced)}($|\\s)`, 'gi');
                currentText = currentText.replace(revertRegex, (match, leadingSpace, trailingSpace) => {
                    return (leadingSpace || '') + original + (trailingSpace || '');
                });
            }
            replacedNodes.delete(currentNode);
        }

        const currentReplacements = [];

        for (const rule of replacements) {
            const findRegex = new RegExp(`(^|\\s)${escapeRegExp(rule.find)}($|\\s)`, 'gi');
            
            if (findRegex.test(currentText)) {
                currentText = currentText.replace(findRegex, (match, leadingSpace, trailingSpace) => {
                    nodeValueChanged = true;
                    const originalWord = match.trim();
                    const replacement = smartCapitalize(originalWord, rule.replace);
                    currentReplacements.push({ original: originalWord, replaced: replacement });
                    return (leadingSpace || '') + replacement + (trailingSpace || '');
                });
            }
        }

        if (nodeValueChanged) {
            if (currentReplacements.length > 0) {
                replacedNodes.set(currentNode, currentReplacements);
            }
            nodesToReplace.push({ node: currentNode, newValue: currentText });
        }
    }

    // Apply replacements in a single batch
    if (nodesToReplace.length > 0) {
        requestAnimationFrame(() => {
            nodesToReplace.forEach(({ node, newValue }) => {
                try {
                    node.nodeValue = newValue;
                } catch (error) {
                    console.warn("Word Replacer: Error replacing text:", error);
                }
            });
        });
    }
}

// Modify the initial load to wait for React to finish rendering
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for React to finish its initial render
        setTimeout(() => {
            fetchReplacements().then(() => performReplacements(document.body));
        }, 1000);
    });
} else {
    // Already loaded or interactive/complete
    setTimeout(() => {
        fetchReplacements().then(() => performReplacements(document.body));
    }, 1000);
}

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
        console.log("Word Replacer: Storage change detected");
        replacements = changes.replacements.newValue || [];
        // Reapply replacements to the entire page
        performReplacements(document.body);
    }
});

// Listen for messages from the options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Word Replacer: Received message:", message);
    if (message.action === 'rulesUpdated') {
        console.log("Word Replacer: Rules update requested");
        // Fetch the latest rules and reapply them
        fetchReplacements().then(() => {
            console.log("Word Replacer: Fetched new rules, reapplying to page");
            // Reapply replacements to the entire page
            performReplacements(document.body);
        }).catch(error => {
            console.error("Word Replacer: Error updating rules:", error);
        });
    }
    return true; // Keep the message channel open for async responses
});
