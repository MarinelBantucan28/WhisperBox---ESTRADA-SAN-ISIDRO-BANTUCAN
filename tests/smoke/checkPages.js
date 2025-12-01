const fs = require('fs');
const path = require('path');

function checkFileContains(filePath, substr) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(2);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(substr)) {
    console.error(`File ${filePath} does not contain expected text: ${substr}`);
    process.exit(3);
  }
}

// Check auth pages
const loginPath = path.join(__dirname, '..', '..', 'auth', 'login.html');
const signupPath = path.join(__dirname, '..', '..', 'auth', 'signup.html');
const configPath = path.join(__dirname, '..', '..', 'auth', 'firebase-config.js');

console.log('Checking login page...');
checkFileContains(loginPath, 'WhisperBox');
console.log('Checking signup page...');
checkFileContains(signupPath, 'Create an account');

if (fs.existsSync(configPath)) {
  console.log('Checking runtime config file...');
  checkFileContains(configPath, '__FIREBASE_CONFIG__');
} else {
  console.warn('Warning: runtime firebase-config.js not present; ensure CI substitution runs.');
}

console.log('✓ Smoke checks passed');
