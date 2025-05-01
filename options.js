// Get references to DOM elements
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const addButton = document.getElementById('add-button');
const cancelButton = document.getElementById('cancel-button');
const rulesList = document.getElementById('rules-list');
const statusMessage = document.getElementById('status-message');
const ruleForm = document.getElementById('rule-form');
const formTitle = document.getElementById('form-title');
const addRuleBtn = document.getElementById('add-rule-btn');

// Function to display status messages
function showStatus(message, duration = 2000) {
    statusMessage.textContent = message;
    setTimeout(() => {
        statusMessage.textContent = '';
    }, duration);
}

// Function to load and display rules from storage
function loadRules() {
    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;
        renderRules(rules);
    });
}

// Function to render the list of rules in the UI
function renderRules(rules) {
    // Clear the current list
    rulesList.innerHTML = '';

    if (rules.length === 0) {
        rulesList.innerHTML = '<li class="text-gray-500 italic">No rules added yet.</li>';
        return;
    }

    // Add each rule to the list
    rules.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'replacement-item';

        const textSpan = document.createElement('span');
        textSpan.className = 'replacement-text';
        textSpan.innerHTML = `Find: <strong>${escapeHTML(item.find)}</strong>, Replace with: <strong>${escapeHTML(item.replace)}</strong>`;

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
        rulesList.appendChild(listItem);
    });
}

// Function to parse the find string into individual words and phrases
function parseFindString(findString) {
    return findString.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

// Function to show the rule form
function showRuleForm(mode = 'add', index = null) {
    ruleForm.classList.remove('hidden');
    if (mode === 'add') {
        formTitle.textContent = 'Add New Rule';
        findInput.value = '';
        replaceInput.value = '';
        addButton.textContent = 'Save';
        addButton.dataset.mode = 'add';
        cancelButton.classList.add('hidden');
    } else {
        formTitle.textContent = 'Edit Rule';
        chrome.storage.sync.get({ rules: [] }, (data) => {
            const item = data.rules[index];
            findInput.value = item.find;
            replaceInput.value = item.replace;
            addButton.textContent = 'Save';
            addButton.dataset.mode = 'edit';
            addButton.dataset.index = index;
            cancelButton.classList.remove('hidden');
        });
    }
}

// Function to hide the rule form
function hideRuleForm() {
    ruleForm.classList.add('hidden');
    findInput.value = '';
    replaceInput.value = '';
    addButton.textContent = 'Save';
    delete addButton.dataset.mode;
    delete addButton.dataset.index;
    cancelButton.classList.add('hidden');
}

// Function to handle canceling an edit
function handleCancel() {
    hideRuleForm();
}

// Function to handle editing a rule
function handleEdit(event) {
    const index = parseInt(event.target.dataset.index, 10);
    showRuleForm('edit', index);
}

// Function to notify all tabs about rule changes
function notifyTabsOfRuleChanges() {
    console.log("Word Replacer: Notifying tabs of rule changes");
    chrome.tabs.query({}, (tabs) => {
        console.log("Word Replacer: Found tabs:", tabs.length);
        tabs.forEach(tab => {
            // Skip chrome:// and chrome-extension:// URLs, and check if URL exists
            if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
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

// Function to handle updating a rule
function handleUpdate(index, findValue, replaceValue) {
    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;
        
        // Update the rule at the specified index
        rules[index] = { find: findValue, replace: replaceValue };
        
        // Save the updated list back to storage
        chrome.storage.sync.set({ rules: rules }, () => {
            // Clear input fields
            findInput.value = '';
            replaceInput.value = '';
            // Reset the add button and hide cancel button
            addButton.textContent = 'Save';
            delete addButton.dataset.mode;
            delete addButton.dataset.index;
            cancelButton.classList.add('hidden');
            // Re-render the list
            renderRules(rules);
            showStatus('Rule updated successfully!');
            findInput.focus();
            
            // Ensure rules are saved before notifying tabs
            setTimeout(() => {
                notifyTabsOfRuleChanges();
            }, 500); // Increased delay to 500ms
        });
    });
}

// Function to handle adding a new rule
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

    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;

        // Check for duplicates
        const exists = rules.some(item => 
            item.find.toLowerCase() === findValue.toLowerCase()
        );
        if (exists) {
            showStatus(`A rule for "${escapeHTML(findValue)}" already exists.`, 3000);
            return;
        }

        // Add the new rule
        rules.push({ find: findValue, replace: replaceValue });

        // Save the updated list back to storage
        chrome.storage.sync.set({ rules: rules }, () => {
            // Clear input fields
            findInput.value = '';
            replaceInput.value = '';
            // Reset the add button and ensure cancel button is hidden
            addButton.textContent = 'Save';
            delete addButton.dataset.mode;
            delete addButton.dataset.index;
            cancelButton.classList.add('hidden');
            // Re-render the list
            renderRules(rules);
            showStatus('Rule added successfully!');
            findInput.focus();
            // Notify all tabs about the rule change
            notifyTabsOfRuleChanges();
        });
    });
}

// Function to handle removing a rule
function handleRemove(event) {
    const indexToRemove = parseInt(event.target.dataset.index, 10);

    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;

        // Remove the item at the specified index
        const removedItem = rules.splice(indexToRemove, 1)[0]; // Get the removed item for status message

        // Save the updated list back to storage
        chrome.storage.sync.set({ rules: rules }, () => {
            // Re-render the list
            renderRules(rules);
            showStatus(`Removed rule for "${escapeHTML(removedItem.find)}".`);
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

// Load rules when the options page is opened
document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    // Ensure form is hidden on initial load
    hideRuleForm();
    
    // Add event listener for the Add Rule button
    addRuleBtn.addEventListener('click', () => showRuleForm('add'));
    
    // Add event listener for the Add button
    addButton.addEventListener('click', handleAdd);
    
    // Add event listener for the Cancel button
    cancelButton.addEventListener('click', handleCancel);
    
    // Allow adding by pressing Enter in the replace input field
    replaceInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleAdd();
        }
    });
});
