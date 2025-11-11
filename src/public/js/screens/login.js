import { api } from '../api.js';

const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').textContent;
    const password = document.getElementById('password').textContent;

    try {
        await api.auth.login(email, password);
        window.location.href = '/lobby';
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});