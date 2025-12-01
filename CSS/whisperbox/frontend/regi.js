// API Base URL Configuration (computed globally)
window.API_BASE_URL = null;
if (window.location.protocol === 'file:') {
    window.API_BASE_URL = null;
    console.warn('regi.js: Running from file:// — API calls will fail. Open via http://localhost/...');
} else {
    const pathDir = window.location.pathname.replace(/\/[^\/]*$/, '');
    window.API_BASE_URL = window.location.origin + pathDir + '/backend/api';
}

// Use the global API_BASE_URL
const API_BASE_URL = window.API_BASE_URL;

// Attempt to import Firebase auth if available. Falls back to PHP backend API.
let firebaseAvailable = false;
let fb = null;
async function tryInitFirebase() {
    try {
        // Relative path to project firebase.js (adjusted for this file location)
        fb = await import('../../../../whisperbox-firebase/firebase.js');
        if (fb && fb.createUserWithEmailAndPassword) {
            firebaseAvailable = true;
            console.log('regi.js: Firebase detected and will be used for auth flows');
        }
    } catch (err) {
        firebaseAvailable = false;
        console.warn('regi.js: Firebase not available; falling back to server-side auth API');
    }
}

// Start initialize in background (it's fine if it finishes after page load)
tryInitFirebase();

// DOM Elements
const guestButton = document.getElementById('guest-button');
const registerButton = document.getElementById('register-button');
const guestPopup = document.getElementById('guest-popup');
const registerPopup = document.getElementById('register-popup');
const closeGuestPopup = document.getElementById('close-guest-popup');
const closeRegisterPopup = document.getElementById('close-register-popup');
const guestProceed = document.getElementById('guest-proceed');
const registerProceed = document.getElementById('register-proceed');
const loginFromOption = document.getElementById('login-from-option');

// Modal elements
const registrationModal = document.getElementById('registration-modal');
const loginModal = document.getElementById('login-modal');
const closeRegistrationModal = document.getElementById('close-registration-modal');
const closeLoginModal = document.getElementById('close-login-modal');
const switchToLogin = document.getElementById('switch-to-login');
const switchToRegister = document.getElementById('switch-to-register');
const forgotPassword = document.getElementById('forgot-password');

// Modal Management
function openModal(modal) {
    if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

function closeAllModals() {
    [registrationModal, loginModal, guestPopup, registerPopup].forEach(m => {
        if (m) m.style.display = 'none';
    });
}

// Guest Button Events
if (guestButton) {
    guestButton.addEventListener('click', () => {
        openModal(guestPopup);
    });
}

// Register Button Events
if (registerButton) {
    registerButton.addEventListener('click', () => {
        openModal(registerPopup);
    });
}

// Close Pop-up Events
if (closeGuestPopup) {
    closeGuestPopup.addEventListener('click', () => {
        closeModal(guestPopup);
    });
}

if (closeRegisterPopup) {
    closeRegisterPopup.addEventListener('click', () => {
        closeModal(registerPopup);
    });
}

// Popup Proceed Buttons
if (guestProceed) {
    guestProceed.addEventListener('click', () => {
        closeAllModals();
        // Redirect to main page without authentication (guest mode)
        window.location.href = 'index.html';
    });
}

if (registerProceed) {
    registerProceed.addEventListener('click', () => {
        closeModal(registerPopup);
        openModal(registrationModal);
    });
}

// Login from Option
if (loginFromOption) {
    loginFromOption.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openModal(loginModal);
    });
}

// Modal Close Buttons
if (closeRegistrationModal) {
    closeRegistrationModal.addEventListener('click', () => {
        closeModal(registrationModal);
    });
}

if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
        closeModal(loginModal);
    });
}

// Switch Between Login and Registration
if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(registrationModal);
        openModal(loginModal);
    });
}

if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(registrationModal);
    });
}

// Close Modals When Clicking Outside
window.addEventListener('click', (e) => {
    if (e.target === registrationModal) closeModal(registrationModal);
    if (e.target === loginModal) closeModal(loginModal);
    if (e.target === guestPopup) closeModal(guestPopup);
    if (e.target === registerPopup) closeModal(registerPopup);
});

// Forgot Password
if (forgotPassword) {
    forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Password reset functionality coming soon. Please contact support.');
    });
}

// Helper Functions
function showMessage(message, type = 'info') {
    // Remove existing message
    const existing = document.querySelector('.message');
    if (existing) existing.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

// Registration Form Submission
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const termsChecked = document.getElementById('terms').checked;
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    if (!termsChecked) {
        showMessage('You must agree to the Terms of Service', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    try {
        if (firebaseAvailable && fb) {
            // Use Firebase Auth for registration
            const { auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = fb;
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            // set display name to username
            try {
                await updateProfile(userCred.user, { displayName: username });
            } catch (uErr) {
                console.warn('regi.js: updateProfile failed', uErr);
            }
            try {
                await sendEmailVerification(userCred.user);
            } catch (vErr) {
                console.warn('regi.js: sendEmailVerification failed', vErr);
            }

            showMessage('Account created successfully! Verification email sent. Logging you in...', 'success');
            sessionStorage.setItem('user_id', userCred.user.uid);
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('email', email);
            sessionStorage.setItem('user_authenticated', 'true');
            e.target.reset();
            setTimeout(() => { window.location.href = '../../../../../whisperbox-firebase/index.html'; }, 1500);
        } else {
            // Fallback to server-side PHP API
            const formData = new FormData();
            formData.append('action', 'register');
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage('Account created successfully! Logging you in...', 'success');

                // Store session info
                sessionStorage.setItem('user_id', result.user_id);
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('email', email);
                sessionStorage.setItem('user_authenticated', 'true');

                // Clear form
                e.target.reset();

                // Redirect after brief delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showMessage(`Registration failed: ${result.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('An error occurred. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Login Form Submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validation
    if (!email || !password) {
        showMessage('Please enter email and password', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging In...';
    
    try {
        if (firebaseAvailable && fb) {
            // Use Firebase Auth for login
            const { auth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } = fb;
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            showMessage('Login successful! Redirecting...', 'success');
            sessionStorage.setItem('user_id', userCred.user.uid);
            sessionStorage.setItem('username', userCred.user.displayName || userCred.user.email);
            sessionStorage.setItem('email', userCred.user.email);
            sessionStorage.setItem('user_authenticated', 'true');
            e.target.reset();
            setTimeout(() => { window.location.href = '../../../../../whisperbox-firebase/index.html'; }, 1500);
        } else {
            // Fallback to server-side API
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success' && result.user) {
                showMessage('Login successful! Redirecting...', 'success');

                // Store session info
                sessionStorage.setItem('user_id', result.user.id);
                sessionStorage.setItem('username', result.user.username);
                sessionStorage.setItem('email', result.user.email);
                sessionStorage.setItem('display_name', result.user.display_name);
                sessionStorage.setItem('user_authenticated', 'true');

                // Store remember me preference
                if (rememberMe) {
                    localStorage.setItem('remember_user', JSON.stringify({
                        email: result.user.email,
                        username: result.user.username
                    }));
                }

                // Clear form
                e.target.reset();

                // Redirect after brief delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showMessage(`Login failed: ${result.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('An error occurred. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .message {
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);

console.log('Registration and Login system initialized!');