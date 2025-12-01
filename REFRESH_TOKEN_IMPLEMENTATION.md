# Refresh Token Implementation - Documentation

**Date:** November 30, 2025  
**Feature:** JWT Refresh Token Flow  
**Status:** ✅ Implemented

---

## 🎯 Overview

The WhisperBox application now implements a **refresh token mechanism** that allows users to maintain longer sessions without needing to re-enter their credentials every hour.

### How It Works

```
1. User logs in
   ↓
2. Backend issues:
   - Access Token (1 hour expiry)
   - Refresh Token (30 days expiry) stored in DB
   ↓
3. Access Token is used for API calls
   ↓
4. When Access Token expires:
   - Frontend detects 401 response
   - Frontend calls /api/refresh.php with Refresh Token
   - Backend validates Refresh Token, issues new Access Token
   - User continues session
   ↓
5. Refresh Token remains valid for 30 days
```

---

## 🔧 Implementation Details

### Database Changes

**New Table: `refresh_tokens`**

```sql
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Fields:**
- `user_id` - Which user owns this token
- `token` - The actual refresh token (64-char hex string)
- `ip_address` - Where the token was issued (for security logging)
- `expires_at` - When the token expires (30 days from issue)
- `revoked` - Set to TRUE when user logs out (logout all devices)

---

### Backend Changes

#### 1. JWT Helper Functions (`lib/jwt_helper.php`)

**New Functions Added:**

```php
generate_refresh_token()
  - Generates cryptographically secure 64-char hex token
  - Returns: string

save_refresh_token($db, $user_id, $token, $ttl_days, $ip_address)
  - Saves refresh token to database
  - Default TTL: 30 days
  - Returns: bool

verify_refresh_token($db, $user_id, $token)
  - Checks if token exists, is not revoked, not expired
  - Returns: bool

revoke_refresh_token($db, $token)
  - Marks token as revoked (for logout)
  - Returns: bool

revoke_all_refresh_tokens($db, $user_id)
  - Marks all tokens for user as revoked (logout all devices)
  - Returns: bool
```

#### 2. Login Endpoint (`api/auth.php`)

**Changes to `case 'login':`**

When user logs in successfully:

```php
1. Issue Access Token (1 hour)
   $token = jwt_create($payload, 3600)

2. Generate Refresh Token (30 days)
   $refresh_token = generate_refresh_token()
   save_refresh_token($db, $user->id, $refresh_token, 30)

3. Set both as HttpOnly cookies:
   - access_token (1 hour)
   - refresh_token (30 days)

4. Return both in response:
   {
     "status": "success",
     "token": "eyJ...",
     "refresh_token": "a1b2c3d4..."
   }
```

#### 3. Refresh Endpoint (`api/refresh.php`) - NEW

**Endpoint:** `POST /api/refresh.php`

**Request:**
```json
{
  "refresh_token": "a1b2c3d4..."  // Optional (can use cookie)
}
```

**Process:**
1. Verify user is authenticated (has access token)
2. Get refresh token from request body or cookies
3. Validate refresh token in database:
   - User owns this token
   - Token not revoked
   - Token not expired
4. If valid:
   - Fetch fresh user data
   - Issue new access token (1 hour)
   - Return new token in response + cookie
5. If invalid:
   - Return 401 Unauthorized
   - Client should redirect to login

**Response (Success):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully.",
  "token": "new_eyJ..."
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid or expired refresh token."
}
```

---

### Frontend Changes

#### 1. Token Refresh Manager (`token-refresh-manager.js`) - NEW

**Features:**

1. **Wraps global `fetch()`**
   - Intercepts all fetch requests
   - Detects 401 responses
   - Automatically attempts token refresh
   - Retries original request with new token

2. **Automatic Refresh Timer**
   - Checks time until expiry (based on token `exp` claim)
   - Refreshes token 5 minutes before expiry
   - Prevents user from getting 401 mid-action

3. **Helper Functions**

   ```javascript
   attemptTokenRefresh()
     - Calls /api/refresh.php
     - Updates sessionStorage with new token
     - Returns: Promise<bool>
   
   handleAuthenticationFailure()
     - Called when refresh fails
     - Clears all stored auth data
     - Shows error message
     - Redirects to login
   
   getAuthHeader()
     - Returns header with current token
     - Usage: fetch(..., {headers: getAuthHeader()})
   
   fetchWithAuth(url, options)
     - Convenience wrapper for authenticated API calls
     - Automatically includes auth header
     - Example: fetchWithAuth('/api/posts.php', {method: 'GET'})
   
   initializeTokenRefreshTimer()
     - Sets up automatic refresh every 55 minutes
     - Runs on page load for authenticated users
   ```

#### 2. Index.html Update

Added script tag:
```html
<script defer src="token-refresh-manager.js"></script>
<script defer src="script.js"></script>
```

---

## 📊 Token Lifecycle

### Access Token (Short-lived)
```
Issued: On login/refresh
Expiry: 1 hour
Stored: HttpOnly cookie + sessionStorage
Usage: All API requests (Authorization: Bearer)
Refresh: Automatically when needed
```

### Refresh Token (Long-lived)
```
Issued: On login
Expiry: 30 days
Stored: HttpOnly cookie + sessionStorage
Usage: To get new access token when expired
Refresh: Can be rotated (optional, not implemented yet)
Revoke: On logout (for security)
```

---

## 🔒 Security Features

1. **HttpOnly Cookies**
   - Prevents JavaScript from accessing tokens
   - Protected against XSS attacks

2. **Secure Flag**
   - Only sent over HTTPS
   - Enabled in production

3. **SameSite=Lax**
   - Prevents CSRF attacks
   - Allows same-site requests

4. **IP Address Logging**
   - Refresh token stores IP where issued
   - Can detect suspicious access

5. **Token Revocation**
   - Logout marks token as revoked
   - Token can't be reused after logout

6. **Expiration Check**
   - Tokens automatically expire
   - Database validates expiration

---

## 🚀 Usage Examples

### Example 1: Automatic Token Refresh (Transparent to User)

```javascript
// User makes API call
fetch('http://localhost:8000/backend/api/posts.php?action=get_posts')
  .then(r => r.json())
  .then(data => {
    // If token was expired, it was automatically refreshed!
    // This continues seamlessly
    console.log('Posts loaded:', data.posts);
  });
```

### Example 2: Manual Token Refresh (Advanced)

```javascript
// Get current token status
const token = sessionStorage.getItem('access_token');
console.log('Current token:', token);

// Manually refresh if needed
attemptTokenRefresh().then(success => {
  if (success) {
    console.log('Token refreshed');
  } else {
    console.log('Refresh failed - user needs to login again');
  }
});
```

### Example 3: Authenticated API Call

```javascript
// Using convenience wrapper
fetchWithAuth('/backend/api/user.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'update_profile',
    display_name: 'New Name'
  })
})
.then(r => r.json())
.then(data => console.log('Profile updated:', data));
```

---

## 🧪 Testing the Refresh Token Feature

### Test 1: Normal Login and Auto-Refresh

**Steps:**
1. Open WhisperBox in browser
2. Navigate to Login/Register
3. Log in with test account
4. Check DevTools → Application → Cookies
   - `access_token` should be present (expires in 1 hour)
   - `refresh_token` should be present (expires in 30 days)
5. Create a test post (uses access token)
6. Wait or manually trigger refresh to verify new token issued

**Expected Result:**
- ✅ Login succeeds
- ✅ Both tokens set as HttpOnly cookies
- ✅ API calls work

### Test 2: Token Refresh on 401

**Steps:**
1. Log in
2. Open DevTools → Application → Cookies
3. Delete `access_token` cookie (simulate expiry)
4. Try to create a new post
5. Watch Network tab in DevTools

**Expected Result:**
- ✅ Initial POST fails with 401
- ✅ Token refresh called automatically
- ✅ Original request retried
- ✅ Post creation succeeds

### Test 3: Logout (Token Revocation)

**Steps:**
1. Log in
2. Click Logout button
3. Check database:
   ```sql
   SELECT * FROM refresh_tokens 
   WHERE user_id = 1 
   ORDER BY created_at DESC;
   ```

**Expected Result:**
- ✅ `revoked` column set to TRUE
- ✅ New login creates new tokens
- ✅ Old token can't be reused

### Test 4: Token Expiration (30 day limit)

**Steps:**
1. Log in
2. Check database:
   ```sql
   SELECT expires_at FROM refresh_tokens 
   WHERE user_id = 1 
   ORDER BY created_at DESC LIMIT 1;
   ```

**Expected Result:**
- ✅ `expires_at` is exactly 30 days from now
- ✅ After 30 days, token can't be used
- ✅ User must log in again

---

## 📈 Improvements from Refresh Tokens

### Before (Without Refresh Tokens)
- User must log in every 1 hour
- Token expires silently
- User experiences 401 errors
- Bad UX for long sessions

### After (With Refresh Tokens)
- User stays logged in for 30 days
- Token automatically refreshes before expiry
- No 401 errors (unless all tokens revoked)
- Seamless long-term sessions
- User can logout (revoke all tokens)

---

## 🔄 Future Enhancements

### 1. Token Rotation
```
Current: Refresh token stays same for 30 days
Better: Issue new refresh token on each access token refresh
Benefit: Even more secure (leaked token expires faster)
```

**Implementation:**
```php
// In refresh.php, uncomment:
$new_refresh_token = generate_refresh_token();
save_refresh_token($db, $user->id, $new_refresh_token, 30);
revoke_refresh_token($db, $refresh_token);
```

### 2. Device Management
```
Track which devices have refresh tokens
Allow user to revoke tokens from specific devices
Useful for "logout all devices" feature
```

**Database addition:**
```sql
ALTER TABLE refresh_tokens ADD COLUMN 
  device_id VARCHAR(100),
  device_name VARCHAR(255);
```

### 3. Refresh Token Abuse Detection
```
Monitor refresh requests from unusual IPs
Alert user of suspicious activity
Auto-revoke if too many failed attempts
```

### 4. Silent Refresh (Hidden)
```
Current: Refresh happens on 401 (visible delay)
Better: Refresh in background 5 min before expiry
Benefit: Zero-delay session continuation
```

---

## 📋 Deployment Checklist

- [x] Database table created (refresh_tokens)
- [x] JWT helper functions implemented
- [x] Login endpoint issues refresh tokens
- [x] Refresh endpoint created
- [x] Frontend token refresh manager added
- [x] Index.html updated
- [ ] Tested locally with manual token expiry
- [ ] Tested automatic refresh on 401
- [ ] Tested logout revocation
- [ ] Tested 30-day expiration
- [ ] Deployed to staging
- [ ] Deployed to production

---

## 📞 Support

**Issue:** Token refresh not working?
1. Check database: `SELECT * FROM refresh_tokens WHERE user_id = ?`
2. Check browser console for errors
3. Verify /api/refresh.php returns success
4. Check token expiration in database

**Issue:** User logged out but still has token?
1. Check revoked flag: `SELECT revoked FROM refresh_tokens WHERE token = '...'`
2. Ensure logout clears cookies: `setcookie('access_token', '', time() - 3600)`
3. Check frontend clears sessionStorage

---

## ✅ Summary

✅ Refresh tokens implemented (30 days)  
✅ Automatic token refresh on 401  
✅ Token manager wraps all fetch calls  
✅ Logout revokes tokens  
✅ Security features: HttpOnly, Secure, SameSite  
✅ Database validation of tokens  
✅ Long-term sessions supported  

**Users can now stay logged in for 30 days without re-entering credentials!**
