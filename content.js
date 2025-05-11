/**
 * Content script for the Word Replacer Chrome Extension.
 * Finds and replaces words on web pages based on user-defined rules,
 * applying smart capitalization.
 */

let rules = []; // Store fetched rules
let replacedNodes = new Map(); // Track which nodes have been replaced and with what

// Function to fetch rules from storage
async function fetchRules() {
    try {
        const data = await chrome.storage.sync.get({ rules: [] });
        const newRules = data.rules || [];
        
        // First, revert all existing rules
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (textNode) {
                    if (!textNode.nodeValue.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let currentNode;
        const nodesToRevert = [];

        while (currentNode = walker.nextNode()) {
            if (replacedNodes.has(currentNode)) {
                const previousReplacements = replacedNodes.get(currentNode);
                let currentText = currentNode.nodeValue;

                // Process replacements in reverse order to handle nested replacements
                for (let i = previousReplacements.length - 1; i >= 0; i--) {
                    const { original, replaced } = previousReplacements[i];
                    
                    // Check if this rule is being edited
                    const isBeingEdited = newRules.some(rule => 
                        rule.find.toLowerCase() === original.toLowerCase() && 
                        rule.replace.toLowerCase() !== replaced.toLowerCase()
                    );
                    
                    if (isBeingEdited) {
                        console.debug("Word Replacer: Reverting edited rule:", original, "->", replaced);
                    }

                    const revertRegex = new RegExp(`(^|\\s)${escapeRegExp(replaced)}($|\\s)`, 'gi');
                    currentText = currentText.replace(revertRegex, (match, leadingSpace, trailingSpace) => {
                        return (leadingSpace || '') + original + (trailingSpace || '');
                    });
                }

                nodesToRevert.push({ node: currentNode, newValue: currentText });
            }
        }

        // Apply reversions in a single batch
        if (nodesToRevert.length > 0) {
            requestAnimationFrame(() => {
                nodesToRevert.forEach(({ node, newValue }) => {
                    try {
                        node.nodeValue = newValue;
                    } catch (error) {
                        console.warn("Word Replacer: Error reverting text:", error);
                    }
                });
            });
        }

        // Clear the tracking map and update rules
        replacedNodes.clear();
        rules = newRules;
        
        // Apply new rules
        performReplacements(document.body);
    } catch (error) {
        console.error("Word Replacer: Error fetching rules:", error);
        rules = []; // Reset to empty array on error
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
 * @param {string} original - The original word that was matched.
 * @param {string} replacement - The word to replace it with.
 * @returns {string} The replacement word with appropriate capitalization.
 */
function smartCapitalize(original, replacement) {
    if (!replacement) {
        return '';
    }
    if (original === original.toUpperCase()) {
        return replacement.toUpperCase();
    } else if (original[0] === original[0].toUpperCase() || (original.match(/[A-Z]/g) || []).length > 1) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    } else {
        return replacement.toLowerCase();
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
 * Parses the find string into individual words and phrases
 * @param {string} findString - The string containing words and phrases to find
 * @returns {Array<string>} Array of words and phrases to find
 */
function parseFindString(findString) {
    if (!findString || typeof findString !== 'string') {
        return [];
    }
    return findString.split(',').map(item => item.trim()).filter(item => item.length > 0);
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

    if (!rules || rules.length === 0) {
        console.log("Word Replacer: No rules defined or loaded.");
        return;
    }

    console.log("Word Replacer: Starting replacements with rules:", rules);
    console.log("Word Replacer: Node to process:", node.tagName || 'TEXT_NODE', node.nodeValue || node.innerHTML);

    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip script and style elements
                if (node.parentNode.nodeName === 'SCRIPT' || 
                    node.parentNode.nodeName === 'STYLE' ||
                    node.parentNode.nodeName === 'TEXTAREA') {
                    console.log("Word Replacer: Skipping node:", node.parentNode.nodeName);
                    return NodeFilter.FILTER_REJECT;
                }
                console.log("Word Replacer: Accepting node:", node.nodeValue);
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodesToReplace = [];
    let currentNode;

    while (currentNode = walker.nextNode()) {
        console.log("Word Replacer: Processing node:", currentNode.nodeValue);
        let nodeValueChanged = false;
        let currentText = currentNode.nodeValue;
        let currentReplacements = [];

        for (const rule of rules) {
            const findItems = parseFindString(rule.find);
            console.log("Word Replacer: Checking rule:", rule, "Find items:", findItems);
            
            for (const item of findItems) {
                // Create a regex that matches the word or phrase as a whole word
                const findRegex = new RegExp(escapeRegExp(item), 'gi');
                console.log("Word Replacer: Using regex:", findRegex);
                
                if (findRegex.test(currentText)) {
                    console.log("Word Replacer: Found match in text:", currentText);
                    currentText = currentText.replace(findRegex, (match) => {
                        nodeValueChanged = true;
                        // Find the exact rule that matches this case
                        let replacement;
                        if (match === match.toUpperCase()) {
                            // ALL CAPS
                            replacement = rule.replace.toUpperCase();
                        } else if (match === match.toLowerCase()) {
                            // all lowercase
                            replacement = rule.replace.toLowerCase();
                        } else if (match === item) {
                            // Exact match with rule
                            replacement = rule.replace;
                        } else if (match === item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()) {
                            // Title Case
                            replacement = rule.replace.charAt(0).toUpperCase() + rule.replace.slice(1);
                        } else {
                            // Default to smart capitalization
                            replacement = smartCapitalize(match, rule.replace);
                        }
                        console.log("Word Replacer: Replacing:", match, "with:", replacement);
                        currentReplacements.push({ original: match, replaced: replacement });
                        return replacement;
                    });
                }
            }
        }

        if (nodeValueChanged) {
            console.log("Word Replacer: Node value changed. Original:", currentNode.nodeValue, "New:", currentText);
            // Store the original text and replacements for this node
            if (!replacedNodes.has(currentNode)) {
                replacedNodes.set(currentNode, []);
            }
            replacedNodes.get(currentNode).push(...currentReplacements);
            nodesToReplace.push({ node: currentNode, newValue: currentText });
        }
    }

    // Apply replacements immediately in tests, or in a batch for production
    if (nodesToReplace.length > 0) {
        console.log("Word Replacer: Applying replacements to", nodesToReplace.length, "nodes");
        // Always apply immediately in tests or if requestAnimationFrame is not available
        if (typeof global !== 'undefined' || !window.requestAnimationFrame) {
            nodesToReplace.forEach(({ node, newValue }) => {
                try {
                    console.log("Word Replacer: Setting node value:", newValue);
                    node.nodeValue = newValue;
                } catch (error) {
                    console.warn("Word Replacer: Error replacing text:", error);
                }
            });
        } else {
            // In production environment
            requestAnimationFrame(() => {
                nodesToReplace.forEach(({ node, newValue }) => {
                    try {
                        console.log("Word Replacer: Setting node value (RAF):", newValue);
                        node.nodeValue = newValue;
                    } catch (error) {
                        console.warn("Word Replacer: Error replacing text:", error);
                    }
                });
            });
        }
    } else {
        console.log("Word Replacer: No nodes to replace");
    }
}

// Modify the initial load to wait for React to finish rendering
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for React to finish its initial render
        setTimeout(() => {
            fetchRules().then(() => performReplacements(document.body));
        }, 1000);
    });
} else {
    // Already loaded or interactive/complete
    setTimeout(() => {
        fetchRules().then(() => performReplacements(document.body));
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
    if (nodesToProcess.size > 0 && rules.length > 0) {
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
    if (namespace === 'sync' && changes.rules) {
        console.log("Word Replacer: Rules updated, reapplying...");
        rules = changes.rules.newValue || [];
        // Reapply rules to the entire page
        performReplacements(document.body);
    }
});

// Listen for messages from the options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Word Replacer: Received message:", message);
    if (message.action === 'rulesUpdated') {
        console.log("Word Replacer: Rules update requested");
        // Fetch the latest rules and reapply them
        fetchRules().then(() => {
            console.log("Word Replacer: Fetched new rules, reapplying to page");
            // Reapply rules to the entire page
            performReplacements(document.body);
            // Send response to acknowledge receipt
            sendResponse({ success: true });
        }).catch(error => {
            console.error("Word Replacer: Error updating rules:", error);
            sendResponse({ success: false, error: error.message });
        });
    }
    return true; // Keep the message channel open for async responses
});

// Make rules accessible for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        smartCapitalize,
        escapeRegExp,
        parseFindString,
        performReplacements,
        fetchRules,
        rules: {
            get: function() {
                return rules;
            },
            set: function(value) {
                rules = value;
            }
        }
    };
}
