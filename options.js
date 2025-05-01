// Get references to DOM elements
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const addButton = document.getElementById('add-button');
const replacementsList = document.getElementById('replacements-list');
const statusMessage = document.getElementById('status-message');

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
        listItem.className = 'replacement-item'; // Add class for styling

        const textSpan = document.createElement('span');
        textSpan.className = 'replacement-text';
        textSpan.innerHTML = `Find: <strong>${escapeHTML(item.find)}</strong>, Replace with: <strong>${escapeHTML(item.replace)}</strong>`; // Use innerHTML carefully

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-button'; // Add class for styling
        removeButton.dataset.index = index; // Store index for removal

        // Add event listener for the remove button
        removeButton.addEventListener('click', handleRemove);

        listItem.appendChild(textSpan);
        listItem.appendChild(removeButton);
        replacementsList.appendChild(listItem);
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


    chrome.storage.sync.get({ replacements: [] }, (data) => {
        const replacements = data.replacements;

        // Check for duplicates
        const exists = replacements.some(item => item.find.toLowerCase() === findValue.toLowerCase());
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
            findInput.focus(); // Set focus back to the find input
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
