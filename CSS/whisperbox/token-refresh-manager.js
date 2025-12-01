/**
 * Token Refresh Manager for WhisperBox
 * 
 * Handles automatic token refresh when access token expires
 * Intercepts 401 responses and attempts to refresh the token
 */

// Store original fetch to wrap it
const originalFetch = window.fetch;

// Wrap fetch to handle 401 and refresh token
window.fetch = async function(...args) {
    let response = await originalFetch.apply(this, args);
    
    // If we get a 401 (Unauthorized), try to refresh the token
    if (response.status === 401) {
        console.log('Token expired (401 response). Attempting to refresh...');
        
        // Try to refresh the token
        const refreshed = await attemptTokenRefresh();
        
        if (refreshed) {
            console.log('Token refreshed successfully. Retrying request...');
            // Retry the original request with the new token
            response = await originalFetch.apply(this, args);
        } else {
            console.warn('Token refresh failed. User needs to log in again.');
            // Token refresh failed - user needs to login again
            handleAuthenticationFailure();
        }
    }
    
    return response;
};

/**
 * Attempt to refresh the access token using the refresh token
 * @returns {Promise<boolean>} true if refresh succeeded, false otherwise
 */
async function attemptTokenRefresh() {
    try {
        // Get API base URL
        const API_BASE_URL = window.API_BASE_URL;
        if (!API_BASE_URL) {
            console.error('API_BASE_URL not configured');
            return false;
        }
        
        // Call refresh endpoint
        const response = await originalFetch(`${API_BASE_URL}/refresh.php`, {
            method: 'POST',
            credentials: 'include',  // Include cookies (refresh_token)
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (sessionStorage.getItem('access_token') || '')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success' && data.token) {
            // Store new token in sessionStorage
            sessionStorage.setItem('access_token', data.token);
            
            // If a new refresh token was issued, update it too (token rotation)
            if (data.refresh_token) {
                sessionStorage.setItem('refresh_token', data.refresh_token);
            }
            
            console.log('New access token obtained');
            return true;
        } else {
            console.warn('Token refresh failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

/**
 * Handle authentication failure - redirect to login
 */
function handleAuthenticationFailure() {
    // Clear stored tokens
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('user_authenticated');
    
    // Show error message
    showToast('Your session has expired. Please log in again.', 'error');
    
    // Redirect to login
    setTimeout(() => {
        window.location.href = 'frontend/register.html';
    }, 2000);
}

/**
 * Get authorization header with current access token
 * @returns {Object} Header object with Authorization
 */
function getAuthHeader() {
    const token = sessionStorage.getItem('access_token') || '';
    return {
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Make an authenticated API call with automatic token refresh
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithAuth(url, options = {}) {
    // Add authorization header
    options.headers = {
        ...options.headers,
        ...getAuthHeader()
    };
    
    // Include credentials for cookies
    if (!options.hasOwnProperty('credentials')) {
        options.credentials = 'include';
    }
    
    // Use our wrapped fetch (which handles 401 refresh)
    return fetch(url, options);
}

/**
 * Initialize token refresh timer
 * Automatically refresh token 5 minutes before it expires (if we know expiration)
 */
function initializeTokenRefreshTimer() {
    // Access tokens expire in 1 hour (3600 seconds)
    // Refresh after 55 minutes (3300 seconds)
    const REFRESH_INTERVAL = 55 * 60 * 1000;  // 55 minutes in milliseconds
    
    setInterval(async () => {
        console.log('Automatic token refresh timer triggered');
        const refreshed = await attemptTokenRefresh();
        if (!refreshed) {
            console.warn('Automatic token refresh failed');
        }
    }, REFRESH_INTERVAL);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is authenticated
    const isAuthenticated = sessionStorage.getItem('user_authenticated') === 'true';
    if (isAuthenticated) {
        console.log('Initializing token refresh timer');
        initializeTokenRefreshTimer();
    }
});
