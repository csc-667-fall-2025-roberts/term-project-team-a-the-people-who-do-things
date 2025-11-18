// Main entry point - dynamically loads the appropriate screen based on the current route
const path = window.location.pathname;

// Import and initialize the appropriate screen module
if (path === '/lobby' || path.startsWith('/lobby')) {
  import('./screens/lobby.ts');
} else if (path === '/login' || path.startsWith('/login')) {
  import('./screens/login.ts');
} else if (path === '/signup' || path.startsWith('/signup')) {
  import('./screens/signup.ts');
} else if (path.startsWith('/game/') && path.endsWith('/results')) {
  import('./screens/gameResults.ts');
} else if (path.startsWith('/game/')) {
  import('./screens/gameRoom.ts');
} else if (path === '/settings' || path.startsWith('/settings')) {
  import('./screens/settings.ts');
} else {
  import('./screens/landing.ts');
}

