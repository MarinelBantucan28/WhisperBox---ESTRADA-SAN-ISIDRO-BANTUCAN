// WhisperBox Auth with Firebase
// Handles login, signup, password toggle, feedback, and Firebase OAuth

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
    signInWithGoogle,
    signInWithFacebook,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    auth
} from '../firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // Password visibility toggles
  const togglePassword = document.getElementById('toggle-password');
  const loginPassword = document.getElementById('login-password');
  if (togglePassword && loginPassword) {
    togglePassword.addEventListener('click', () => {
      const isHidden = loginPassword.type === 'password';
      loginPassword.type = isHidden ? 'text' : 'password';
      togglePassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      togglePassword.setAttribute('aria-pressed', String(isHidden));
      togglePassword.textContent = isHidden ? '🙈' : '👁️';
    });
  }

  const toggleSignupPassword = document.getElementById('toggle-signup-password');
  const signupPassword = document.getElementById('signup-password');
  if (toggleSignupPassword && signupPassword) {
    toggleSignupPassword.addEventListener('click', () => {
      const isHidden = signupPassword.type === 'password';
      signupPassword.type = isHidden ? 'text' : 'password';
      toggleSignupPassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      toggleSignupPassword.setAttribute('aria-pressed', String(isHidden));
      toggleSignupPassword.textContent = isHidden ? '🙈' : '👁️';
    });
  }

  // Password strength meter
  if (signupPassword) {
    signupPassword.addEventListener('input', () => {
      const meter = document.getElementById('password-strength');
      meter.value = getPasswordStrength(signupPassword.value);
    });
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      const remember = loginForm.remember.checked;
      const feedback = document.getElementById('login-feedback');
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      feedback.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing In...';

      if (!validateEmail(email)) {
        feedback.textContent = 'Please enter a valid email.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      if (!password) {
        feedback.textContent = 'Please enter your password.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      try {
        // Set persistence
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        
        // Sign in
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        feedback.textContent = 'Login successful! Redirecting...';
        feedback.style.color = '#4CAF50';
        
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 1000);
      } catch (error) {
        console.error('Login error:', error.code);
        let errorMsg = 'An error occurred. Please try again.';
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMsg = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsg = 'Too many login attempts. Please try again later.';
        }
        
        feedback.textContent = errorMsg;
        feedback.style.color = '#d32f2f';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = signupForm.name.value.trim();
      const display = signupForm.display.value.trim();
      const email = signupForm.email.value.trim();
      const password = signupForm.password.value;
      const terms = signupForm.terms.checked;
      const feedback = document.getElementById('signup-feedback');
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      feedback.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      if (!name) {
        feedback.textContent = 'Please enter your full name.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      if (!validateEmail(email)) {
        feedback.textContent = 'Please enter a valid email.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      if (!validatePassword(password)) {
        feedback.textContent = 'Password must be at least 6 characters with uppercase, lowercase, and a number.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      if (!terms) {
        feedback.textContent = 'You must accept the Terms and Privacy Policy.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      try {
        // Create user with Firebase
        const userCred = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile with display name
        const displayName = display || name;
        await updateProfile(userCred.user, { 
          displayName: displayName
        });

        // Send email verification
        await sendEmailVerification(userCred.user);

        feedback.textContent = 'Account created! Verification email sent. Redirecting...';
        feedback.style.color = '#4CAF50';

        setTimeout(() => {
          window.location.href = '../index.html';
        }, 2000);
      } catch (error) {
        console.error('Signup error:', error.code);
        let errorMsg = 'An error occurred. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMsg = 'An account with this email already exists.';
        } else if (error.code === 'auth/weak-password') {
          errorMsg = 'Password is too weak. Use uppercase, lowercase, and numbers.';
        } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email format.';
        }
        
        feedback.textContent = errorMsg;
        feedback.style.color = '#d32f2f';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Social login/signup (Firebase)
  const googleLogin = document.getElementById('google-login');
  if (googleLogin) {
    googleLogin.addEventListener('click', async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithGoogle();
        alert('Google login successful! Redirecting...');
        window.location.href = '../index.html';
      } catch (error) {
        console.error('Google login error:', error);
        alert('Google login failed: ' + error.message);
      }
    });
  }

  const googleSignup = document.getElementById('google-signup');
  if (googleSignup) {
    googleSignup.addEventListener('click', async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithGoogle();
        alert('Google signup successful! Redirecting...');
        window.location.href = '../index.html';
      } catch (error) {
        console.error('Google signup error:', error);
        alert('Google signup failed: ' + error.message);
      }
    });
  }

  const facebookLogin = document.getElementById('facebook-login');
  if (facebookLogin) {
    facebookLogin.addEventListener('click', async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithFacebook();
        alert('Facebook login successful! Redirecting...');
        window.location.href = '../index.html';
      } catch (error) {
        console.error('Facebook login error:', error);
        alert('Facebook login failed: ' + error.message);
      }
    });
  }

  const facebookSignup = document.getElementById('facebook-signup');
  if (facebookSignup) {
    facebookSignup.addEventListener('click', async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithFacebook();
        alert('Facebook signup successful! Redirecting...');
        window.location.href = '../index.html';
      } catch (error) {
        console.error('Facebook signup error:', error);
        alert('Facebook signup failed: ' + error.message);
      }
    });
  }

  // Forgot password (Firebase)
  const forgotPassword = document.getElementById('forgot-password');
  if (forgotPassword) {
    forgotPassword.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your email for password reset:');
      if (!email) return;
      if (!validateEmail(email)) {
        alert('Please enter a valid email.');
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Check your inbox.');
      } catch (error) {
        console.error('Password reset error:', error);
        alert('Error: ' + (error.message || 'Could not send reset email.'));
      }
    });
  }
});

// Helper functions
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  // At least 6 chars, includes uppercase, lowercase, and number
  if (password.length < 6) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
