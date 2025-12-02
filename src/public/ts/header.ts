import { api } from "./api.js";

function initHeader() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await api.auth.logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}

initHeader();