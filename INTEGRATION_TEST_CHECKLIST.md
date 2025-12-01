# WhisperBox Integration Test Checklist

**Date:** November 30, 2025  
**Status:** Ready for Testing  
**Focus:** End-to-End Letter Loading & Creation Flow

---

## 🎯 Overview

All critical code fixes have been applied. The frontend and backend are now properly synchronized:

- ✅ Frontend API calls use correct action names (`action=get_posts&category=all`)
- ✅ Backend Post.php queries fixed for actual database schema
- ✅ Guest post creation flow verified
- ✅ Pagination configured
- ✅ Category filtering configured

**Next Step:** Run live tests to confirm everything works in practice.

---

## 📋 Pre-Test Requirements

### Local Setup
- [ ] MySQL/MariaDB server running
- [ ] Database `whisperbox_db` created (run `database_setup.sql`)
- [ ] Web server (Apache/Nginx) or PHP built-in server running on port 8000
- [ ] Frontend accessible at `http://localhost/...`

### Environment Check
```bash
# Check if PHP can reach database
curl http://localhost/backend/api/posts.php?action=get_posts&category=all
# Should return JSON with posts or empty array, NOT a connection error
```

---

## ✅ Test Cases

### Test 1: Load Initial Letters (No Filter)
**Objective:** Verify API returns posts and frontend displays them

**Steps:**
1. Open `index.html` via web server (not `file://`)
2. Scroll to **"Read Anonymous Letters"** section
3. Observe the letters grid

**Expected Result:**
- ✅ Sample posts appear (from database_setup.sql)
- ✅ Each letter shows: title, content snippet, category badge, timestamp
- ✅ No error messages in browser console

**If Failed:**
- Open browser DevTools → Console tab
- Check for error messages about API calls
- Verify `console.log('API_BASE_URL computed:', window.API_BASE_URL)` shows correct URL
- Example correct URL: `http://localhost/CSS/whisperbox/backend/api`

---

### Test 2: Create Guest Post (Anonymous Submission)
**Objective:** Verify guest post submission creates new letter

**Steps:**
1. Scroll to **"Share Your Thoughts"** section
2. Select category: **"Joy"**
3. Enter title: **"Test Letter"**
4. Enter content: **"This is a test post to verify the system works"**
5. Check terms checkbox
6. Click **"Share Anonymously"** button
7. Wait 2 seconds and scroll down to "Read Letters" section

**Expected Result:**
- ✅ Success toast notification appears: "Your letter has been posted successfully!"
- ✅ Form resets (clears all fields)
- ✅ New letter appears in the letters grid **immediately**
- ✅ New letter shows in "Joy" category

**If Failed:**
- DevTools → Console: Check for fetch errors
- DevTools → Network: Check POST request status (should be 200)
- Backend logs: Check for SQL errors or permission issues
- Verify `API_BASE_URL` is correct

---

### Test 3: Filter by Category (Joy)
**Objective:** Verify category filter returns only matching posts

**Prerequisites:** Test 2 must succeed (at least 1 Joy post exists)

**Steps:**
1. In "Read Letters" section, click filter button **"Joy"**
2. Observe the letters grid

**Expected Result:**
- ✅ Only posts with mood='joy' appear
- ✅ All displayed posts have "Joy" category badge
- ✅ If pagination appears, clicking "Next" shows more Joy posts
- ✅ Count shown matches database (e.g., "Showing 3 of 5")

**If Failed:**
- Check browser console for filter error
- Verify `readByCategory('joy')` SQL in Post.php filters on `p.mood = :category`
- Query in backend should execute: `SELECT p.* FROM posts p WHERE p.mood = 'joy' ...`

---

### Test 4: Filter by Category (Sadness)
**Objective:** Verify filter works for different categories

**Prerequisites:** Sample data exists in database (from database_setup.sql)

**Steps:**
1. Click filter button **"Sadness"**
2. Observe the letters grid

**Expected Result:**
- ✅ Only Sadness posts appear
- ✅ No Joy posts visible
- ✅ All posts show "Sadness" category badge

**If Failed:**
- Check Post.php `readByCategory()` method is correctly updated
- Verify SQL WHERE clause: `WHERE p.mood = :category`

---

### Test 5: Pagination (Load More)
**Objective:** Verify pagination works when more than 10 posts exist

**Prerequisites:** Database has >10 posts (create more with Test 2)

**Steps:**
1. Click filter **"All"** to show all posts
2. Check pagination controls at bottom of letters grid
3. If "Page 2" button appears, click it
4. Observe new set of posts loads

**Expected Result:**
- ✅ New page of posts loads
- ✅ Page number updates
- ✅ Each page shows 10 posts
- ✅ Total count displayed matches database

**If Failed:**
- Check browser console for pagination error
- Verify `countAll()` in Post.php has correct SQL (no `is_public` WHERE clause)
- Backend should return `"total_count"` in JSON response

---

### Test 6: Date Range Filter
**Objective:** Verify date filtering returns posts within range

**Prerequisites:** Posts exist in current and past dates

**Steps:**
1. In "Read Letters" section, find date filter controls
2. Enter:
   - From: (yesterday's date in YYYY-MM-DD format)
   - To: (today's date)
3. Click **"Apply"** button
4. Observe letters grid

**Expected Result:**
- ✅ Only posts created between dates appear
- ✅ Posts outside range are hidden
- ✅ Total count updates

**If Failed:**
- Check `readByDateRange()` in Post.php
- Verify SQL: `WHERE DATE(p.created_at) BETWEEN ? AND ?`

---

### Test 7: Responsive Design
**Objective:** Verify UI works on different screen sizes

**Steps:**
1. Open index.html in browser
2. Press F12 → Device Toolbar (toggle responsive design)
3. Test screen sizes: 375px (mobile), 768px (tablet), 1440px (desktop)
4. Test form submission and letter display on each size

**Expected Result:**
- ✅ Layout adapts to screen size
- ✅ Letters grid columns adjust
- ✅ Form remains usable
- ✅ No horizontal scroll on mobile

---

### Test 8: Error Handling
**Objective:** Verify graceful error handling

**Steps:**
1. Stop MySQL server (simulate database unavailable)
2. Try to load letters (refresh page)
3. Try to submit a new post
4. Restart MySQL
5. Try again

**Expected Result:**
- ✅ Error message appears: "Unable to load letters. Please try again later."
- ✅ Form shows error on submission
- ✅ After restart, page works again
- ✅ No console errors with stack traces visible to users

---

## 🔧 Debug Checklist

If any test fails, use this systematic approach:

### 1. Check API Connectivity
```javascript
// Open browser console and run:
fetch('http://localhost/CSS/whisperbox/backend/api/posts.php?action=get_posts&category=all')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected output:**
```json
{
  "status": "success",
  "posts": [...],
  "total_count": 5,
  "page": 1,
  "per_page": 10
}
```

### 2. Verify Database
```sql
-- Log into MySQL
USE whisperbox_db;
SELECT COUNT(*) FROM posts;       -- Should show sample data
SELECT mood, COUNT(*) FROM posts GROUP BY mood;  -- Check category distribution
```

### 3. Check Backend Logs
```bash
# View PHP error log (location varies by system)
tail -f /var/log/apache2/error.log   # Linux Apache
tail -f /var/log/php-fpm.log         # Linux PHP-FPM
```

### 4. Verify Frontend Configuration
```javascript
// Check console for:
console.log('API_BASE_URL computed:', window.API_BASE_URL);

// Should output: http://localhost/CSS/whisperbox/backend/api
// NOT: file:// protocol
```

---

## 📊 Success Criteria

All of the following must pass:

- [x] **Code Review:** All files analyzed and fixed
  - [x] script.js using correct API actions
  - [x] Post.php queries match schema
  - [x] Backend handlers configured
  
- [ ] **Functional Tests:** All 8 test cases pass
  - [ ] Letters load without errors
  - [ ] Guest posts can be created
  - [ ] Category filtering works
  - [ ] Date range filtering works
  - [ ] Pagination works
  - [ ] Error handling is graceful
  - [ ] UI is responsive
  - [ ] API returns correct JSON format

- [ ] **Browser Console:** No errors
  - [ ] No 404 errors for API calls
  - [ ] No CORS errors
  - [ ] No JSON parsing errors

- [ ] **Database State:** Clean and consistent
  - [ ] Posts table has correct records
  - [ ] No orphaned guest sessions
  - [ ] Timestamps are accurate

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Commit code** to repository
   ```bash
   git add .
   git commit -m "Fix critical letter loading bugs - align frontend/backend API, fix Post.php queries"
   git push origin main
   ```

2. **Implement Refresh Tokens** (Task 3)
   - Add refresh_tokens table to database_setup.sql
   - Create refresh token endpoint in auth.php
   - Add frontend logic to refresh expired tokens

3. **Deploy to Cloud Run & Firebase** (Task 4)
   - GitHub Actions will auto-deploy on push to main
   - Verify staging environment works
   - Promote to production

4. **Performance Testing**
   - Load test with 100+ concurrent users
   - Monitor database performance
   - Check upload storage limits

---

## 📞 Support

**If tests fail:**
1. Check the **Debug Checklist** above
2. Review backend error logs
3. Verify all Post.php methods are properly fixed
4. Ensure database_setup.sql has been executed

**Key Files Modified:**
- `CSS/whisperbox/script.js` - Fixed loadAllLetters() API call
- `CSS/whisperbox/backend/models/Post.php` - Fixed all query methods
- `CSS/whisperbox/backend/config/bootstrap.php` - Centralized auth/CORS
- `CSS/whisperbox/backend/api/posts.php` - GET/POST handlers

**Integration Complete:** ✅ Frontend and backend are now synchronized and ready for testing.
