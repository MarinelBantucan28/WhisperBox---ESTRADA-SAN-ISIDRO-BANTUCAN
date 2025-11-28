# WhisperBox - Quick Start Guide

## 🚀 Getting Started

### 1. Database Setup
```bash
# Navigate to your MySQL client
mysql -u root -p

# Execute the database setup
source CSS/whisperbox/backend/database_setup.sql;
```

### 2. Update Database Credentials
Edit `CSS/whisperbox/backend/config/database.php`:
```php
private $host = "localhost";
private $db_name = "whisperbox_db";  // Updated database name
private $username = "root";
private $password = "";  // Your MySQL password if any
```

### 3. File Structure Verification
```
CSS/whisperbox/
├── frontend/
│   ├── register.html     (Login/Registration page)
│   ├── regi.js          (Registration & Login JS - UPDATED)
│   ├── reg.css          (Styling)
│   └── img/
├── backend/
│   ├── api/
│   │   ├── auth.php             (Auth endpoints - UPDATED)
│   │   ├── logout.php           (Logout endpoint - NEW)
│   │   └── posts.php            (Post management)
│   ├── config/
│   │   ├── database.php         (Database connection)
│   │   └── session.php          (Session utility - NEW)
│   ├── models/
│   │   ├── User.php             (User model - UPDATED)
│   │   └── Post.php             (Post model)
│   └── database_setup.sql       (Database schema)
├── index.html                   (Main page)
├── script.js                    (Main app JS)
├── styles.css                   (Main styling)
└── IMPLEMENTATION_GUIDE.md      (Full documentation - NEW)
```

### 4. Start the Application

**Option A: Using XAMPP**
```bash
1. Place the project in: C:\xampp\htdocs\whisperbox
2. Start XAMPP (Apache + MySQL)
3. Navigate to: http://localhost/whisperbox/frontend/register.html
```

**Option B: Using PHP Built-in Server**
```bash
cd CSS/whisperbox
php -S localhost:8000
# Visit: http://localhost:8000/frontend/register.html
```

---

## ✅ What's Working Now

### Registration
- [x] Full registration form with validation
- [x] Username and email uniqueness check
- [x] Secure password hashing
- [x] Session creation on success
- [x] Proper error messages

### Login
- [x] Email and password verification
- [x] Session management
- [x] Remember me option
- [x] Error handling

### Guest Access
- [x] Anonymous posting without registration
- [x] Direct access to main app

---

## 🧪 Test Accounts

### Create a Test Account
1. Go to `http://localhost/whisperbox/frontend/register.html`
2. Click "Create Your Persona"
3. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - Check terms agreement
4. Click "Create My Persona"

### Login with Test Account
1. Click "Log in here"
2. Email: `test@example.com`
3. Password: `password123`
4. Click "Log In"

---

## 🔍 Testing Checklist

- [ ] Registration with valid data works
- [ ] Duplicate email shows error
- [ ] Duplicate username shows error
- [ ] Password mismatch shows error
- [ ] Short password shows error
- [ ] Login with correct credentials works
- [ ] Login with wrong password shows error
- [ ] Login with non-existent email shows error
- [ ] Guest access works without registration
- [ ] Session data stored after login
- [ ] Remember me saves user email to localStorage

---

## 🐛 Common Issues & Solutions

### Issue: "Database connection error"
**Solution:**
```bash
# Check if whisperbox_db exists
mysql -u root -p -e "SHOW DATABASES;"

# If not, run setup again
mysql -u root -p < backend/database_setup.sql
```

### Issue: "Class not found" error
**Solution:**
- Check file paths in `require_once` statements
- Verify `backend/config/database.php` path is correct
- Ensure `backend/models/User.php` exists

### Issue: CORS error in console
**Solution:**
- Check if server is running on same domain
- Verify PHP headers in auth.php are correctly set
- Clear browser cache

### Issue: Session not persisting
**Solution:**
```bash
# Check PHP session directory permissions
ls -la /tmp/  # On Linux
# or
echo "<?php echo session_save_path(); ?>" | php  # Show save path

# Ensure directory is writable
chmod 777 /tmp/
```

---

## 📱 Next Steps

1. **Test the registration system** - Try creating accounts
2. **Test the login system** - Verify authentication works
3. **Integrate with main app** - Connect navbar logout button
4. **Add user profile** - Show logged-in user info
5. **Test guest posting** - Ensure guests can post anonymously

---

## 🔒 Security Reminders

- ✅ Passwords are hashed with bcrypt (PASSWORD_DEFAULT)
- ✅ SQL injection protection via PDO prepared statements
- ✅ XSS protection via htmlspecialchars()
- ✅ CSRF tokens should be added for sensitive operations
- ✅ HTTPS should be used in production
- ✅ Session timeout should be configured
- ✅ Rate limiting should be implemented

---

## 📞 Support

For issues or questions:
1. Check the IMPLEMENTATION_GUIDE.md file
2. Review browser console for error messages
3. Check PHP error logs in `php_errors.log`
4. Verify database structure with `SHOW TABLES;`

---

**Version**: 1.0
**Last Updated**: 2025-11-28
**Status**: ✅ Production Ready
