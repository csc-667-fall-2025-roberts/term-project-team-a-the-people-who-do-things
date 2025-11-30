import { api } from "../api.js";

const form = document.getElementById("signup-form") as HTMLFormElement | null;
const errorMessage = document.getElementById("error-message");
const emailInput = document.getElementById("email") as HTMLInputElement | null;
const displayNameInput = document.getElementById("display-name") as HTMLInputElement | null;
const passwordInput = document.getElementById("password") as HTMLInputElement | null;
const confirmPasswordInput = document.getElementById("confirm-password") as HTMLInputElement | null;

if (
  form &&
  errorMessage &&
  emailInput &&
  displayNameInput &&
  passwordInput &&
  confirmPasswordInput
) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const displayName = displayNameInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      errorMessage.textContent = "Passwords do not match";
      return;
    }

    try {
      await api.auth.signup(email, password, displayName);
      window.location.href = "/lobby";
    } catch (error) {
      if (error instanceof Error) {
        errorMessage.textContent = error.message;
      } else {
        errorMessage.textContent = "Signup failed. Please try again.";
      }
    }
  });
}
