# 🚀 WhisperBox - Quick Reference Guide

## ⚡ Quick Start (5 Minutes)

### 1. Start XAMPP
```
XAMPP Control Panel → Start Apache & MySQL
```

### 2. Setup Database
```bash
mysql -u root -p < "C:\xampp\htdocs\whisperbox git clone\WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN\CSS\whisperbox\backend\database_setup.sql"
```

### 3. Access Application
```
Registration: http://localhost/whisperbox/frontend/register.html
Main App: http://localhost/whisperbox/
```

---

## 📝 Quick API Reference

### Register User
```javascript
POST /backend/api/auth.php
{
    "action": "register",
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure123"
}
Response: { "status": "success", "user_id": 1, "user": {...} }
```

### Login User
```javascript
POST /backend/api/auth.php
{
    "action": "login",
    "email": "john@example.com",
    "password": "secure123"
}
Response: { "status": "success", "user": {...} }
```

### Create Post
```javascript
POST /backend/api/posts.php
FormData:
- action: create_post (or create_guest_post)
- title: "My Letter"
- content: "Letter content..."
- category_id: 1
- mood: "joy"
- user_id: 1 (if authenticated)
Response: { "status": "success", "post_id": 123 }
```

### Get All Posts
```javascript
GET /backend/api/posts.php?action=get_all_posts
Response: { "status": "success", "posts": [...] }
```

### Logout
```javascript
POST /backend/api/logout.php
Response: { "status": "success", "message": "Logged out successfully" }
```

---

## 🎯 User Flows at a Glance

### New User Registration
```
Register Page → Fill Form → Validate → Create Account → 
Store Session → Display in Navbar → Redirect to Main
```

### Login
```
Register Page → Click Login → Enter Credentials → 
Verify → Create Session → Redirect to Main → Show Username
```

### Guest Posting
```
Register Page → Click Anonymous → Main Page → 
Fill Post Form → Submit → API Create Guest Post → 
Display in Feed
```

### Authenticated User Posting
```
Logged In → Fill Post Form → Submit → API Create Post → 
Display in Feed AND My Letters Section
```

---

## 📊 Quick File Reference

### Frontend Files
| File | Purpose |
|------|---------|
| `register.html` | Registration/Login page |
| `regi.js` | Auth logic |
| `index.html` | Main application |
| `script.js` | App logic & API calls |
| `styles.css` | Styling |

### Backend Files
| File | Purpose |
|------|---------|
| `auth.php` | Auth endpoints |
| `logout.php` | Logout endpoint |
| `posts.php` | Post CRUD |
| `User.php` | User model |
| `database.php` | DB connection |

---

## 🔑 Key Variables in SessionStorage

```javascript
// After successful login/registration:
sessionStorage.getItem('user_id')           // User's ID
sessionStorage.getItem('username')          // Username
sessionStorage.getItem('email')             // Email
sessionStorage.getItem('user_authenticated') // true/false
sessionStorage.getItem('display_name')      // Display name
```

---

## 🎨 Category ID Mapping

```
'joy' → 1
'sadness' → 2
'anger' → 3
'exhaustion' → 4
'reflection' → 5
```

---

## 🛠️ Common Tasks

### Check If User Is Logged In
```javascript
const isAuthenticated = sessionStorage.getItem('user_authenticated') === 'true';
const userId = sessionStorage.getItem('user_id');
```

### Get Current User Info
```javascript
const username = sessionStorage.getItem('username');
const email = sessionStorage.getItem('email');
```

### Clear User Session (Logout)
```javascript
sessionStorage.clear();
window.location.href = 'frontend/register.html';
```

### Make API Call
```javascript
const response = await fetch('backend/api/posts.php', {
    method: 'POST',
    body: formData
});
const result = await response.json();
```

### Show Toast Message
```javascript
showToast('Success message', 'success');   // Green
showToast('Error message', 'error');       // Red
showToast('Warning message', 'warning');   // Orange
showToast('Info message', 'info');         // Blue
```

---

## 🐛 Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| MySQL connection error | Check database.php credentials |
| 404 on API call | Check API_BASE_URL in script.js |
| CORS error | Verify auth.php has CORS headers |
| Session not persisting | Check php.ini session settings |
| Blank page | Check browser console for errors |

---

## 📱 Responsive Design

The application is designed to work on:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (320px - 767px)

All modals and forms adapt to screen size automatically.

---

## 🔒 Security Reminders

For Production:
- [ ] Enable HTTPS/SSL
- [ ] Set SECURE flag on session cookies
- [ ] Implement rate limiting
- [ ] Add CSRF tokens to forms
- [ ] Enable firewall rules
- [ ] Use environment variables for DB credentials
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## 📊 Database Connection

**Default Settings** (in `database.php`):
```php
$host = "localhost";
$db_name = "whisperbox_db";
$username = "root";
$password = "";
```

**Change if needed** for your setup.

---

## 🎓 Code Examples

### Check Authentication in Script
```javascript
const userId = sessionStorage.getItem('user_id');
const isAuth = sessionStorage.getItem('user_authenticated') === 'true';

if (isAuth) {
    // Show authenticated UI
    loadMyLetters();
} else {
    // Show guest UI
    showLoginPrompt();
}
```

### Handle API Response
```javascript
fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Success!', 'success');
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(err => showToast('Error: ' + err.message, 'error'));
```

### Validate Form Input
```javascript
if (!email || !email.includes('@')) {
    showToast('Invalid email', 'error');
    return;
}
if (password.length < 6) {
    showToast('Password too short', 'error');
    return;
}
```

---

## 📈 Performance Tips

1. **Cache posts** in memory to reduce API calls
2. **Lazy load** images for better performance
3. **Minify** CSS/JS for production
4. **Use pagination** for large datasets
5. **Enable gzip** compression on server
6. **Optimize images** before upload
7. **Use CDN** for static files

---

## ✨ Features by User Type

### Authenticated User
- ✅ Create posts
- ✅ View all posts
- ✅ View my posts
- ✅ Edit own posts (future)
- ✅ Delete own posts (future)
- ✅ Persistent identity

### Guest User
- ✅ Create posts anonymously
- ✅ View all posts
- ✅ Cannot view own posts (by design)
- ✅ Cannot edit/delete
- ✅ No persistent identity

---

## 🎯 Testing Checklist

### Registration
- [ ] Can create account with valid data
- [ ] Rejects duplicate email
- [ ] Rejects duplicate username
- [ ] Validates password length
- [ ] Shows error messages

### Login
- [ ] Can login with correct credentials
- [ ] Rejects wrong password
- [ ] Rejects non-existent email
- [ ] Creates session
- [ ] Shows username in navbar

### Posts
- [ ] Can create post when logged in
- [ ] Can create anonymous post as guest
- [ ] Can filter by category
- [ ] Posts display correctly
- [ ] Toast notifications work

### Navigation
- [ ] Navbar displays correctly
- [ ] Logout button appears when logged in
- [ ] Login link appears when guest
- [ ] Links navigate correctly
- [ ] Mobile menu works

---

## 🚀 Deployment Checklist

- [ ] Database setup complete
- [ ] All files uploaded to server
- [ ] PHP version >= 7.4
- [ ] MySQL version >= 5.7
- [ ] Session directory writable
- [ ] File permissions set correctly
- [ ] Database credentials updated
- [ ] HTTPS enabled
- [ ] Error logging configured
- [ ] Backups configured

---

## 📞 Quick Support Links

- **Technical Guide**: IMPLEMENTATION_GUIDE.md
- **Getting Started**: QUICK_START.md
- **Project Status**: PROJECT_STATUS.md
- **Change Log**: CHANGES_SUMMARY.md
- **Completion Report**: COMPLETION_REPORT.md

---

**Last Updated**: November 28, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
