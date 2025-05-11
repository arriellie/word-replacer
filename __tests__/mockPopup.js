// Mock storage
const mockStorage = {
    rules: [],
    get: jest.fn((keys, callback) => {
        callback({ rules: mockStorage.rules });
    }),
    set: jest.fn((items, callback) => {
        mockStorage.rules = items.rules;
        if (callback) callback();
    })
};

// Mock functions
const showRuleForm = jest.fn((mode = 'add', index = null) => {
    if (mode === 'add') {
        document.getElementById('find-input').value = '';
        document.getElementById('replace-input').value = '';
    } else {
        const rule = mockStorage.rules[index];
        document.getElementById('find-input').value = rule.find;
        document.getElementById('replace-input').value = rule.replace;
    }
    document.getElementById('rule-form').classList.remove('hidden');
});

const hideRuleForm = jest.fn(() => {
    document.getElementById('rule-form').classList.add('hidden');
});

const saveRule = jest.fn(() => {
    const findValue = document.getElementById('find-input').value.trim();
    const replaceValue = document.getElementById('replace-input').value.trim();

    if (!findValue || !replaceValue) {
        document.getElementById('status-message').textContent = 'Both fields are required.';
        return;
    }

    if (findValue === replaceValue) {
        document.getElementById('status-message').textContent = 'Find and Replace values cannot be the same.';
        return;
    }

    const hasCircular = mockStorage.rules.some(rule => rule.replace.toLowerCase() === findValue.toLowerCase());
    if (hasCircular) {
        document.getElementById('status-message').textContent = 'This replacement word would create an endless loop. Please choose a different word.';
        return;
    }

    const exists = mockStorage.rules.some(rule => rule.find.toLowerCase() === findValue.toLowerCase());
    if (exists) {
        document.getElementById('status-message').textContent = `A rule for "${findValue}" already exists.`;
        return;
    }

    mockStorage.rules.push({ find: findValue, replace: replaceValue });
    hideRuleForm();
    renderRules(mockStorage.rules);
    document.getElementById('status-message').textContent = 'Rule added successfully!';
});

const renderRules = jest.fn((rules) => {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = rules.map(rule => `
        <div class="rule-item">
            <span>${rule.find} → ${rule.replace}</span>
        </div>
    `).join('');
});

// Export mock functions
module.exports = {
    mockStorage,
    showRuleForm,
    hideRuleForm,
    saveRule,
    renderRules
}; 