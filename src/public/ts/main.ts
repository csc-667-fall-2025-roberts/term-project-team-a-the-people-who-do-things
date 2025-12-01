// Import Tailwind CSS
import '../styles/main.css';

// Initialize Scrabble logo animation (available on all pages)
import './scrabbleLogo.ts';

// Main entry point - dynamically loads the appropriate screen based on the current route

const path = window.location.pathname;
import "../styles/main.css";

if (path === "/lobby" || path.startsWith("/lobby")) {
  import("./screens/lobby.js");
} else if (path === "/login" || path.startsWith("/login")) {
  import("./screens/login.js");
} else if (path === "/signup" || path.startsWith("/signup")) {
  import("./screens/signup.js");
} else if (path.startsWith("/game/") && path.endsWith("/results")) {
  import("./screens/gameResults.js");
} else if (path.startsWith("/game/")) {
  import("./screens/gameRoom.js");
} else if (path === "/settings" || path.startsWith("/settings")) {
  import("./screens/settings.js");
} else {
  import("./screens/landing.js");
}

