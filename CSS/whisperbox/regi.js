// Pop-up functionality
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

// Open pop-ups
guestButton.addEventListener('click', () => {
    guestPopup.style.display = 'flex';
});

registerButton.addEventListener('click', () => {
    registerPopup.style.display = 'flex';
});

// Close pop-ups
closeGuestPopup.addEventListener('click', () => {
    guestPopup.style.display = 'none';
});

closeRegisterPopup.addEventListener('click', () => {
    registerPopup.style.display = 'none';
});

// Proceed buttons
guestProceed.addEventListener('click', () => {
    alert('Guest access would be granted here. In a real app, this would redirect to the posting interface.');
    guestPopup.style.display = 'none';
});

registerProceed.addEventListener('click', () => {
    registerPopup.style.display = 'none';
    registrationModal.style.display = 'flex';
});

// Login from option container
loginFromOption.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'flex';
});

// Close pop-ups when clicking outside the content
window.addEventListener('click', (e) => {
    if (e.target === guestPopup) {
        guestPopup.style.display = 'none';
    }
    if (e.target === registerPopup) {
        registerPopup.style.display = 'none';
    }
});

// Modal functionality
closeRegistrationModal.addEventListener('click', () => {
    registrationModal.style.display = 'none';
});

closeLoginModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

// Switch between login and registration
switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registrationModal.style.display = 'none';
    loginModal.style.display = 'flex';
});

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    registrationModal.style.display = 'flex';
});

// Forgot password
forgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Password reset functionality would be implemented here');
});

// Close modals when clicking outside the content
window.addEventListener('click', (e) => {
    if (e.target === registrationModal) {
        registrationModal.style.display = 'none';
    }
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

// Form submission
document.getElementById('registration-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    alert('Registration would be processed here. In a real app, this would connect to your backend.');
    registrationModal.style.display = 'none';
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Login would be processed here. In a real app, this would connect to your backend.');
    loginModal.style.display = 'none';
});