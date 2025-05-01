// Get references to DOM elements
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const addButton = document.getElementById('add-button');
const replacementsList = document.getElementById('replacements-list');
const statusMessage = document.getElementById('status-message');
const isPhraseCheckbox = document.getElementById('is-phrase');

// Function to display status messages
function showStatus(message, duration = 2000) {
    statusMessage.textContent = message;
    setTimeout(() => {
        statusMessage.textContent = '';
    }, duration);
}

// Function to load and display replacements from storage
function loadReplacements() {
    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;
        renderReplacements(replacements);
    });
}

// Function to render the list of replacements in the UI
function renderReplacements(replacements) {
    // Clear the current list
    replacementsList.innerHTML = '';

    if (replacements.length === 0) {
        replacementsList.innerHTML = '<li class="text-gray-500 italic">No replacements added yet.</li>';
        return;
    }

    // Add each replacement to the list
    replacements.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'replacement-item';

        const textSpan = document.createElement('span');
        textSpan.className = 'replacement-text';
        
        // Parse the find string to show phrases in quotes
        const findItems = parseFindString(item.find);
        const formattedFind = findItems.map(item => 
            item.isPhrase ? `"${item.text}"` : item.text
        ).join(', ');
        
        textSpan.innerHTML = `Find: <strong>${escapeHTML(formattedFind)}</strong>, Replace with: <strong>${escapeHTML(item.replace)}</strong>`;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-2';

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-button';
        editButton.dataset.index = index;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-button';
        removeButton.dataset.index = index;

        // Add event listeners for the buttons
        editButton.addEventListener('click', handleEdit);
        removeButton.addEventListener('click', handleRemove);

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(removeButton);
        listItem.appendChild(textSpan);
        listItem.appendChild(buttonContainer);
        replacementsList.appendChild(listItem);
    });
}

// Function to parse the find string into individual words and phrases
function parseFindString(findString) {
    const items = [];
    let currentItem = '';
    let inQuotes = false;
    
    for (let i = 0; i < findString.length; i++) {
        const char = findString[i];
        
        if (char === '"') {
            if (inQuotes) {
                // End of phrase
                if (currentItem.trim()) {
                    items.push({ text: currentItem.trim(), isPhrase: true });
                }
                currentItem = '';
                inQuotes = false;
            } else {
                // Start of phrase
                if (currentItem.trim()) {
                    items.push({ text: currentItem.trim(), isPhrase: false });
                }
                currentItem = '';
                inQuotes = true;
            }
        } else if (char === ',' && !inQuotes) {
            // End of word
            if (currentItem.trim()) {
                items.push({ text: currentItem.trim(), isPhrase: false });
            }
            currentItem = '';
        } else {
            currentItem += char;
        }
    }
    
    // Add the last item
    if (currentItem.trim()) {
        items.push({ text: currentItem.trim(), isPhrase: inQuotes });
    }
    
    return items;
}

// Function to handle editing a replacement
function handleEdit(event) {
    const index = parseInt(event.target.dataset.index, 10);
    
    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;
        const item = replacements[index];
        
        // Populate the input fields with the current values
        findInput.value = item.find;
        replaceInput.value = item.replace;
        isPhraseCheckbox.checked = item.isPhrase || false;
        
        // Change the add button to an update button
        addButton.textContent = 'Update';
        addButton.dataset.mode = 'edit';
        addButton.dataset.index = index;
        
        // Focus the find input
        findInput.focus();
    });
}

// Function to notify all tabs about rule changes
function notifyTabsOfRuleChanges() {
    console.log("Word Replacer: Notifying tabs of rule changes");
    chrome.tabs.query({}, (tabs) => {
        console.log("Word Replacer: Found tabs:", tabs.length);
        tabs.forEach(tab => {
            // Skip chrome:// and chrome-extension:// URLs
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                console.log("Word Replacer: Sending message to tab:", tab.id, tab.url);
                chrome.tabs.sendMessage(tab.id, { action: 'rulesUpdated' })
                    .then(() => {
                        console.log("Word Replacer: Message sent successfully to tab:", tab.id);
                    })
                    .catch(error => {
                        console.log("Word Replacer: Could not send message to tab:", tab.id, error);
                    });
            }
        });
    });
}

// Function to handle updating a replacement
function handleUpdate(index, findValue, replaceValue, isPhrase) {
    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;
        
        // Update the replacement at the specified index
        replacements[index] = { find: findValue, replace: replaceValue, isPhrase };
        
        // Save the updated list back to storage
        chrome.storage.sync.set({ replacements: replacements }, () => {
            // Clear input fields
            findInput.value = '';
            replaceInput.value = '';
            isPhraseCheckbox.checked = false;
            // Reset the add button
            addButton.textContent = 'Add Replacement';
            delete addButton.dataset.mode;
            delete addButton.dataset.index;
            // Re-render the list
            renderReplacements(replacements);
            showStatus('Replacement updated successfully!');
            findInput.focus();
            // Notify all tabs about the rule change
            notifyTabsOfRuleChanges();
        });
    });
}

// Function to handle adding a new replacement
function handleAdd() {
    const findValue = findInput.value.trim();
    const replaceValue = replaceInput.value.trim();

    // Basic validation
    if (!findValue || !replaceValue) {
        showStatus('Both fields are required.', 3000);
        return;
    }
    if (findValue === replaceValue) {
        showStatus('Find and Replace values cannot be the same.', 3000);
        return;
    }

    // Validate the find string format
    const findItems = parseFindString(findValue);
    if (findItems.length === 0) {
        showStatus('Please enter at least one word or phrase to find.', 3000);
        return;
    }

    // Check if we're in edit mode
    if (addButton.dataset.mode === 'edit') {
        const index = parseInt(addButton.dataset.index, 10);
        handleUpdate(index, findValue, replaceValue);
        return;
    }

    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;

        // Check for duplicates
        const exists = replacements.some(item => 
            item.find.toLowerCase() === findValue.toLowerCase()
        );
        if (exists) {
            showStatus(`A replacement for "${escapeHTML(findValue)}" already exists.`, 3000);
            return;
        }

        // Add the new replacement
        replacements.push({ find: findValue, replace: replaceValue });

        // Save the updated list back to storage
        chrome.storage.sync.set({ replacements: replacements }, () => {
            // Clear input fields
            findInput.value = '';
            replaceInput.value = '';
            // Re-render the list
            renderReplacements(replacements);
            showStatus('Replacement added successfully!');
            findInput.focus();
            // Notify all tabs about the rule change
            notifyTabsOfRuleChanges();
        });
    });
}

// Function to handle removing a replacement
function handleRemove(event) {
    const indexToRemove = parseInt(event.target.dataset.index, 10);

    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;

        // Remove the item at the specified index
        const removedItem = replacements.splice(indexToRemove, 1)[0]; // Get the removed item for status message

        // Save the updated list back to storage
        chrome.storage.sync.set({ replacements: replacements }, () => {
            // Re-render the list
            renderReplacements(replacements);
            showStatus(`Removed replacement for "${escapeHTML(removedItem.find)}".`);
            // Notify all tabs about the rule change
            notifyTabsOfRuleChanges();
        });
    });
}

// Helper function to escape HTML special characters (basic version)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}


// Add event listener for the Add button
addButton.addEventListener('click', handleAdd);

// Allow adding by pressing Enter in the replace input field
replaceInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleAdd();
    }
});

// Load replacements when the options page is opened
document.addEventListener('DOMContentLoaded', loadReplacements);
