import "../../styles/main.css";

import { api } from "../api.js";

const form = document.getElementById("login-form") as HTMLFormElement | null;
const errorMessage = document.getElementById("error-message");
const emailInput = document.getElementById("email") as HTMLInputElement | null;
const passwordInput = document.getElementById("password") as HTMLInputElement | null;

if (form && emailInput && passwordInput && errorMessage) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      await api.auth.login(email, password);
      window.location.href = "/lobby";
    } catch (error) {
      if (error instanceof Error) {
        errorMessage.textContent = error.message;
      } else {
        errorMessage.textContent = "Login failed. Please try again.";
      }
    }
  });
}
