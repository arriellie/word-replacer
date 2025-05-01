// Get references to DOM elements
const rulesList = document.getElementById('rules-list');
const addRuleBtn = document.getElementById('add-rule-btn');
const ruleForm = document.getElementById('rule-form');
const formTitle = document.getElementById('form-title');
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const statusMessage = document.getElementById('status-message');

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
    rulesList.innerHTML = '';

    if (rules.length === 0) {
        rulesList.innerHTML = '<div class="text-gray-500 italic text-center py-4">No rules added yet.</div>';
        return;
    }

    rules.forEach((rule, index) => {
        const ruleElement = document.createElement('div');
        ruleElement.className = 'bg-white p-3 rounded-md border border-gray-200 flex items-center justify-between';
        
        const ruleText = document.createElement('div');
        ruleText.className = 'text-sm';
        ruleText.innerHTML = `<span class="font-medium">${escapeHTML(rule.find)}</span> → <span class="font-medium">${escapeHTML(rule.replace)}</span>`;
        
        const buttons = document.createElement('div');
        buttons.className = 'flex space-x-2';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'text-indigo-600 hover:text-indigo-800';
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>';
        editBtn.onclick = () => editRule(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-600 hover:text-red-800';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
        deleteBtn.onclick = () => deleteRule(index);
        
        buttons.appendChild(editBtn);
        buttons.appendChild(deleteBtn);
        
        ruleElement.appendChild(ruleText);
        ruleElement.appendChild(buttons);
        rulesList.appendChild(ruleElement);
    });
}

// Function to show the rule form
function showRuleForm(mode = 'add', index = null) {
    ruleForm.classList.remove('hidden');
    if (mode === 'add') {
        formTitle.textContent = 'Add New Rule';
        findInput.value = '';
        replaceInput.value = '';
        saveBtn.dataset.mode = 'add';
        cancelBtn.classList.add('hidden');
    } else {
        formTitle.textContent = 'Edit Rule';
        chrome.storage.sync.get({ rules: [] }, (data) => {
            const rule = data.rules[index];
            findInput.value = rule.find;
            replaceInput.value = rule.replace;
            saveBtn.dataset.mode = 'edit';
            saveBtn.dataset.index = index;
            cancelBtn.classList.remove('hidden');
        });
    }
}

// Function to hide the rule form
function hideRuleForm() {
    ruleForm.classList.add('hidden');
    findInput.value = '';
    replaceInput.value = '';
    delete saveBtn.dataset.mode;
    delete saveBtn.dataset.index;
    cancelBtn.classList.add('hidden');
}

// Function to handle adding/editing a rule
function saveRule() {
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

    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;
        
        if (saveBtn.dataset.mode === 'edit') {
            // Edit existing rule
            const index = parseInt(saveBtn.dataset.index, 10);
            rules[index] = { find: findValue, replace: replaceValue };
        } else {
            // Check for duplicates
            const exists = rules.some(rule => rule.find.toLowerCase() === findValue.toLowerCase());
            if (exists) {
                showStatus(`A rule for "${escapeHTML(findValue)}" already exists.`, 3000);
                return;
            }
            // Add new rule
            rules.push({ find: findValue, replace: replaceValue });
        }

        // Save the updated rules
        chrome.storage.sync.set({ rules: rules }, () => {
            hideRuleForm();
            renderRules(rules);
            showStatus(saveBtn.dataset.mode === 'edit' ? 'Rule updated successfully!' : 'Rule added successfully!');
            notifyTabsOfRuleChanges();
        });
    });
}

// Function to handle deleting a rule
function deleteRule(index) {
    chrome.storage.sync.get({ rules: [] }, (data) => {
        const rules = data.rules;
        const removedRule = rules.splice(index, 1)[0];
        
        chrome.storage.sync.set({ rules: rules }, () => {
            renderRules(rules);
            showStatus(`Removed rule for "${escapeHTML(removedRule.find)}".`);
            notifyTabsOfRuleChanges();
        });
    });
}

// Function to handle editing a rule
function editRule(index) {
    showRuleForm('edit', index);
}

// Function to notify all tabs about rule changes
function notifyTabsOfRuleChanges() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                chrome.tabs.sendMessage(tab.id, { action: 'rulesUpdated' })
                    .catch(() => {});
            }
        });
    });
}

// Helper function to escape HTML special characters
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Event listeners
addRuleBtn.addEventListener('click', () => showRuleForm('add'));
cancelBtn.addEventListener('click', hideRuleForm);
saveBtn.addEventListener('click', saveRule);

// Load rules when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    // Ensure cancel button is hidden on initial load
    cancelBtn.classList.add('hidden');
}); 