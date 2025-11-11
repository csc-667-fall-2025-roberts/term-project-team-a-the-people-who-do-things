import { api } from '../api.js';

const form = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').textContent;
    const displayName = document.getElementById('display-name').textContent;
    const password = document.getElementById('password').textContent;
    const confirmPassword = document.getElementById('confirm-password').textContent;

    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        return;
    }

    try {
        await api.auth.signup(email, password, displayName);
        window.location.href = '/lobby';
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});