import { api } from '../api.js';


const accountForm = document.getElementById('account-form');
accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const displayName = document.getElementById('display-name').textContent;
    const email = document.getElementById('email').textContent;

    try {
        await api.request('/api/users/update', {
            method: 'PUT',
            body: JSON.stringify({ displayName, email })
        });

        alert('Account updated successfully!');
    } catch (error) {
        alert('Failed to update account: ' + error.message);
    }
});

const preferencesForm = document.getElementById('preferences-form');

async function loadPreferences() {
    try {
        const { preferences } = await api.request('/api/users/preferences');

        document.getElementById('sound-effects').checked = preferences.soundEffects || false;
        document.getElementById('notifications').checked = preferences.notifications || false;
        document.getElementById('theme').value = preferences.theme || 'light';

        applyTheme(preferences.theme || 'light');
    } catch (error) {
        console.error('Failed to load preferences:', error);
    }
}

preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const preferences = {
        soundEffects: document.getElementById('sound-effects').checked,
        notifications: document.getElementById('notifications').checked,
        theme: document.getElementById('theme').value
    };

    try {
        await api.request('/api/users/preferences', {
            method: 'PUT',
            body: JSON.stringify({ preferences })
        });

        applyTheme(preferences.theme);
        alert('Preferences saved successfully!');
    } catch (error) {
        alert('Failed to save preferences: ' + error.message);
    }
});

function applyTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
}

const passwordForm = document.getElementById('password-form');
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').textContent;
    const newPassword = document.getElementById('new-password').textContent;
    const confirmPassword = document.getElementById('confirm-password').textContent;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        await api.request('/api/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        alert('Password changed successfully!');
        passwordForm.addEventListener('submit', async (e) => {});
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
});

loadPreferences();