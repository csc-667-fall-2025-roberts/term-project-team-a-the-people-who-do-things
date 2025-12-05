import { api } from "../api.js";

type Preferences = {
  soundEffects: boolean;
  notifications: boolean;
  theme: string;
};

const accountForm = document.getElementById("account-form") as HTMLFormElement | null;
const preferencesForm = document.getElementById("preferences-form") as HTMLFormElement | null;
const passwordForm = document.getElementById("password-form") as HTMLFormElement | null;

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const displayNameInput = document.getElementById("display-name") as HTMLInputElement | null;
  const emailInput = document.getElementById("email") as HTMLInputElement | null;
  if (!displayNameInput || !emailInput) return;

  const displayName = displayNameInput.value.trim();
  const email = emailInput.value.trim();

  try {
    await api.request("/api/users/update", {
      method: "PUT",
      body: JSON.stringify({ displayName, email }),
    });

    alert("Account updated successfully!");
  } catch (error) {
    if (error instanceof Error) {
      alert(`Failed to update account: ${error.message}`);
    } else {
      alert("Failed to update account. Please try again.");
    }
  }
});

async function loadPreferences() {
  if (!preferencesForm) return;

  try {
    const { preferences } = (await api.request("/api/users/preferences")) as {
      preferences: Partial<Preferences>;
    };

    const soundInput = document.getElementById("sound-effects") as HTMLInputElement | null;
    const notificationsInput = document.getElementById("notifications") as HTMLInputElement | null;
    const themeSelect = document.getElementById("theme") as HTMLSelectElement | null;

    if (!soundInput || !notificationsInput || !themeSelect) return;

    soundInput.checked = preferences.soundEffects ?? false;
    notificationsInput.checked = preferences.notifications ?? false;
    themeSelect.value = preferences.theme ?? "light";

    applyTheme(preferences.theme ?? "light");
  } catch (error) {
    console.error("Failed to load preferences:", error);
  }
}

preferencesForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const soundInput = document.getElementById("sound-effects") as HTMLInputElement | null;
  const notificationsInput = document.getElementById("notifications") as HTMLInputElement | null;
  const themeSelect = document.getElementById("theme") as HTMLSelectElement | null;
  if (!soundInput || !notificationsInput || !themeSelect) return;

  const preferences: Preferences = {
    soundEffects: soundInput.checked,
    notifications: notificationsInput.checked,
    theme: themeSelect.value,
  };

  try {
    await api.request("/api/users/preferences", {
      method: "PUT",
      body: JSON.stringify({ preferences }),
    });

    applyTheme(preferences.theme);
    alert("Preferences saved successfully!");
  } catch (error) {
    if (error instanceof Error) {
      alert(`Failed to save preferences: ${error.message}`);
    } else {
      alert("Failed to save preferences. Please try again.");
    }
  }
});

function applyTheme(theme: string) {
  document.body.className = theme === "dark" ? "dark-theme" : "light-theme";
}

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentPasswordInput = document.getElementById(
    "current-password",
  ) as HTMLInputElement | null;
  const newPasswordInput = document.getElementById("new-password") as HTMLInputElement | null;
  const confirmPasswordInput = document.getElementById(
    "confirm-password",
  ) as HTMLInputElement | null;

  if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match");
    return;
  }

  if (newPassword.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  try {
    await api.request("/api/users/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    alert("Password changed successfully!");
    passwordForm.reset();
  } catch (error) {
    if (error instanceof Error) {
      alert(`Failed to change password: ${error.message}`);
    } else {
      alert("Failed to change password. Please try again.");
    }
  }
});

void loadPreferences();
