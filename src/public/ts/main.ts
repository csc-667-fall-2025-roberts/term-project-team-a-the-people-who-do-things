import "../styles/main.css";
import './scrabbleLogo.ts';

const path = window.location.pathname;

if (path === "/lobby" || path.startsWith("/lobby")) {
  import("./screens/lobby.js");
} else if (path === "/login" || path.startsWith("/login")) {
  import("./screens/login.js");
} else if (path === "/signup" || path.startsWith("/signup")) {
  import("./screens/signup.js");
} else if (path.startsWith("/game/") && path.endsWith("/results")) {
  import("./screens/gameResults.js");
} else if (path.startsWith("/game/") && path.endsWith("/lobby")) {
  console.log("main.ts: Loading gameLobby screen for path:", path);
  import("./screens/gameLobby.js");
} else if (path.startsWith("/game/")) {
  import("./screens/gameRoom.js");
} else if (path === "/settings" || path.startsWith("/settings")) {
  import("./screens/settings.js");
} else {
  import("./screens/landing.js");
}

