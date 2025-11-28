# WhisperBox - Future Enhancement Guide

## Complete Roadmap of Remaining Features

This document provides detailed specifications for implementing the remaining 7 optional enhancements.

---

## Feature 4: Date Range Filter (15-20 minutes)

### Specification
Allow users to filter posts by date range (last day, week, month, year, or custom range).

### Implementation Steps

#### Frontend (`script.js`)

1. Add date filter UI:
```html
<div class="date-filter">
    <input type="date" id="date-from" placeholder="From">
    <input type="date" id="date-to" placeholder="To">
    <button id="apply-filter">Filter</button>
    <button id="clear-filter">Clear</button>
</div>
```

2. Add filter function:
```javascript
async function filterByDateRange(fromDate, toDate) {
    const response = await fetch(
        `${API_BASE_URL}/posts.php?action=get_posts&from=${fromDate}&to=${toDate}`
    );
    // Process and display results
}
```

#### Backend (`posts.php`)

```php
case 'get_posts':
    $from_date = $_GET['from'] ?? null;
    $to_date = $_GET['to'] ?? null;
    
    if ($from_date && $to_date) {
        // Use new Post method: readByDateRange($from, $to)
        $stmt = $post->readByDateRange($from_date, $to_date);
    } else {
        $stmt = $post->readAll();
    }
    break;
```

#### Post Model (`Post.php`)

```php
public function readByDateRange($from, $to) {
    $from = date('Y-m-d', strtotime($from));
    $to = date('Y-m-d', strtotime($to));
    
    $query = "SELECT * FROM posts 
              WHERE DATE(created_at) BETWEEN ? AND ?
              AND is_public = 1
              ORDER BY created_at DESC";
    
    $stmt = $this->conn->prepare($query);
    $stmt->bindParam(1, $from);
    $stmt->bindParam(2, $to);
    $stmt->execute();
    
    return $stmt;
}
```

### UI Enhancements
- Add date input fields to filter section
- Add quick select buttons: "Last 24h", "Last Week", "Last Month"
- Show number of results found
- Add loading state during filter

### Files to Modify
- `script.js` - Add filter function
- `posts.php` - Add date range condition
- `Post.php` - Add readByDateRange() method
- `styles.css` - Add date filter styling

---

## Feature 5: Bookmark/Favorite Posts (25-30 minutes)

### Specification
Allow users to bookmark posts they like and view them in a dedicated section.

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_bookmark (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

### Implementation

#### Frontend (`script.js`)

```javascript
async function toggleBookmark(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookmarks.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'toggle_bookmark',
                post_id: postId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update button UI (filled/unfilled heart)
            updateBookmarkButton(postId, result.bookmarked);
            showToast(result.message, 'success');
        }
    } catch (error) {
        console.error('Bookmark error:', error);
    }
}
```

#### New API Endpoint (`backend/api/bookmarks.php`)

```php
<?php
// Requires authentication
// Actions: toggle_bookmark, get_bookmarks, remove_bookmark
// Returns bookmark status and list

switch ($action) {
    case 'toggle_bookmark':
        // Check if exists, insert or delete
        break;
    case 'get_bookmarks':
        // Get all bookmarked posts for user
        break;
}
?>
```

#### Post Card Update

```html
<!-- Add bookmark button to each post card -->
<button class="bookmark-btn" data-post-id="${post.id}">
    ${isBookmarked ? '❤️' : '🤍'}
</button>
```

### Features
- ✅ Toggle bookmark on any post
- ✅ Visual feedback (filled/unfilled heart)
- ✅ Bookmark count display
- ✅ View bookmarked posts in profile
- ✅ Remove bookmarks

### Files to Create
- `backend/api/bookmarks.php` - New API (150 lines)

### Files to Modify
- `script.js` - Add bookmark functionality
- `Post.php` - Add bookmark count to queries
- `profile.js` - Add bookmarks section to profile
- `profile.html` - Add bookmarks display section
- `styles.css` - Add bookmark button styling

---

## Feature 6: Comments System (45-60 minutes)

### Specification
Allow users to comment on posts and have discussions.

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT,
    guest_session_id INT,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_session_id) REFERENCES guest_sessions(id) ON DELETE SET NULL
);
```

### Implementation

#### Comments API (`backend/api/comments.php`)

```php
// Actions: create_comment, get_comments, delete_comment, edit_comment
```

#### Comment Model (`backend/models/Comment.php`)

```php
class Comment {
    public function create()
    public function readByPost($post_id)
    public function update()
    public function delete()
}
```

#### Frontend (`script.js`)

```javascript
// Show comment form when clicking post
function openCommentForm(postId)

// Submit comment
async function submitComment(postId, content)

// Load and display comments
async function loadComments(postId)
```

#### UI Components

```html
<!-- Comment section in post card -->
<div class="post-comments">
    <div class="comments-list">
        <!-- Comments displayed here -->
    </div>
    <form class="comment-form">
        <textarea placeholder="Add a comment..."></textarea>
        <button type="submit">Post Comment</button>
    </form>
</div>
```

### Features
- ✅ Add comments to posts
- ✅ Display comments with usernames and timestamps
- ✅ Edit own comments
- ✅ Delete own comments
- ✅ Comment count on posts
- ✅ Comment moderation (optional)
- ✅ Reply to comments (nested)

### Files to Create
- `backend/api/comments.php` - Comments API (200 lines)
- `backend/models/Comment.php` - Comment model (150 lines)

### Files to Modify
- `script.js` - Comment functionality
- `index.html` - Comment form HTML
- `styles.css` - Comment styling

---

## Feature 7: Post Sharing (20-25 minutes)

### Specification
Allow users to share posts via URL, social media, or copy link.

### Implementation

#### Unique Post URLs

```php
// Update posts table to add slug or use ID
// URL format: /post.php?id=123
// Or: /posts/joy-my-first-post-123/
```

#### Share Buttons

```javascript
async function sharePost(postId, title) {
    const shareUrl = `${window.location.origin}/post.php?id=${postId}`;
    
    const shareData = {
        title: 'WhisperBox Post',
        text: title || 'Check out this post',
        url: shareUrl
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    
    // Or use Web Share API
    if (navigator.share) {
        navigator.share(shareData);
    }
}
```

#### Share Modal UI

```html
<div class="share-modal">
    <div class="share-link">
        <input type="text" id="share-url" readonly>
        <button id="copy-btn">Copy Link</button>
    </div>
    <div class="share-buttons">
        <a class="share-twitter">Share on Twitter</a>
        <a class="share-facebook">Share on Facebook</a>
        <a class="share-whatsapp">Share on WhatsApp</a>
    </div>
</div>
```

### Files to Modify
- `script.js` - Add share functionality
- `index.html` - Add share button and modal
- `styles.css` - Share button and modal styling

---

## Feature 8: User Statistics (25 minutes)

### Specification
Display comprehensive user statistics in profile (Already 60% done).

### Completion Tasks

#### Already Implemented
- ✅ Total posts count
- ✅ Average post length
- ✅ Favorite category
- ✅ Days since last post
- ✅ Category breakdown chart

#### To Add
- [ ] Posts per day (engagement rate)
- [ ] Most active posting time
- [ ] Word frequency cloud
- [ ] Category trends over time
- [ ] Monthly post statistics

### Implementation

```javascript
// Calculate posts per day
const daysSinceJoin = Math.floor((today - joinDate) / (1000*60*60*24));
const postsPerDay = (totalPosts / daysSinceJoin).toFixed(2);

// Most active time (analyze created_at times)
function getMostActiveTime(posts) {
    // Group by hour and find most frequent
}

// Category trends
function getCategoryTrends(posts) {
    // Show category distribution by month
}
```

### Files to Modify
- `profile.html` - Add new stats section
- `profile.js` - Add calculation functions
- `styles.css` - Add stats visualization styling

---

## Feature 9: Email Notifications (40-50 minutes)

### Specification
Send users email notifications for comments, bookmarks, and account updates.

### Setup Required

1. **SMTP Configuration** (in `backend/config/mail.php`)
```php
<?php
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'your-email@gmail.com');
define('SMTP_PASS', 'app-password');
define('FROM_EMAIL', 'noreply@whisperbox.com');
?>
```

2. **Install PHPMailer** (Composer)
```bash
composer require phpmailer/phpmailer
```

### Implementation

#### Email Templates

```php
// backend/config/email_templates.php

const TEMPLATES = [
    'comment_notification' => [
        'subject' => 'New comment on your post',
        'body' => 'Someone commented on your post: {post_title}'
    ],
    'bookmark_notification' => [
        'subject' => 'Someone bookmarked your post',
        'body' => 'Your post "{post_title}" was bookmarked'
    ],
    'welcome_email' => [
        'subject' => 'Welcome to WhisperBox',
        'body' => 'Welcome {username}! Start sharing your thoughts.'
    ]
];
```

#### Notification API (`backend/api/notifications.php`)

```php
// Actions: send_email, get_preferences, update_preferences
```

#### Email Sending Function

```php
function sendEmail($to, $template, $data) {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;
    $mail->Password = SMTP_PASS;
    $mail->SMTPSecure = 'tls';
    $mail->Port = SMTP_PORT;
    
    $mail->setFrom(FROM_EMAIL);
    $mail->addAddress($to);
    $mail->Subject = $template['subject'];
    $mail->Body = formatTemplate($template['body'], $data);
    
    return $mail->send();
}
```

#### Notification Triggers

- New comment on user's post
- Someone bookmarked user's post
- Account security alerts
- Weekly digest of popular posts

### Files to Create
- `backend/config/mail.php` - SMTP config
- `backend/config/email_templates.php` - Email templates
- `backend/api/notifications.php` - Notification API
- `backend/helpers/email_sender.php` - Utility functions

### Files to Modify
- `comments.php` - Trigger email on comment
- `bookmarks.php` - Trigger email on bookmark
- `profile.html` - Add notification preferences
- `profile.js` - Notification preference management

---

## Feature 10: Two-Factor Authentication (60-90 minutes)

### Specification
Add 2FA using TOTP (Time-based One-Time Password) like Google Authenticator.

### Setup Required

1. **Install TOTP Library** (Composer)
```bash
composer require pragma/oauth2
```

### Implementation

#### 2FA Setup Endpoint

```php
// backend/api/auth.php?action=setup_2fa

// Generate secret key
$secret = $authenticator->createSecret();

// Generate QR code
$qrCode = $authenticator->getQRCodeImageAsDataUri('WhisperBox', $secret);

// User scans and enters code to verify
```

#### 2FA Verification

```php
// During login
if ($user['two_factor_enabled']) {
    // Ask for 2FA code
    // Verify code: $authenticator->verifyCode($secret, $code)
    // Grant session
}
```

#### Database Changes

```sql
ALTER TABLE users ADD COLUMN (
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    backup_codes JSON
);
```

#### Frontend Components

**2FA Setup Screen:**
```html
<div class="2fa-setup">
    <p>Scan this QR code with your authenticator app:</p>
    <img id="qr-code" src="">
    <p>Or enter this code: <code id="secret-key">xxxxx</code></p>
    <input type="text" placeholder="Enter 6-digit code" id="2fa-verify">
    <button>Enable 2FA</button>
</div>
```

**2FA Login:**
```html
<form id="2fa-form">
    <input type="text" placeholder="Enter 6-digit code" id="2fa-code" maxlength="6">
    <button type="submit">Verify</button>
</form>
```

**Backup Codes:**
```javascript
// Generate 10 backup codes when enabling 2FA
// Display for user to save
// Each can be used once if phone lost
```

### Implementation Steps

1. Update `auth.php` with 2FA check
2. Create `backend/api/totp.php` for TOTP operations
3. Add 2FA setup to `profile.html`
4. Add 2FA verification to login form
5. Generate and display backup codes
6. Add 2FA disable option

### Files to Create
- `backend/api/totp.php` - TOTP operations (150 lines)
- `backend/helpers/authenticator.php` - Authenticator wrapper

### Files to Modify
- `auth.php` - Add 2FA verification step
- `regi.js` - 2FA login form
- `profile.html` - 2FA setup section
- `profile.js` - 2FA management
- Database schema migration

---

## Implementation Priority Recommendations

### Phase 1 (Immediate - 1-2 hours)
1. ✅ Date Range Filter (15 min) - *Easy win*
2. ✅ Bookmark System (25 min) - *Straightforward*
3. ✅ Post Sharing (20 min) - *Quick feature*
4. **Complete User Statistics (15 min) - *Finish existing*

### Phase 2 (Short-term - 2-3 hours)
5. Comments System (60 min) - *Most complex*
6. Email Notifications (45 min) - *Infrastructure needed*

### Phase 3 (Medium-term - 2-3 hours)
7. Two-Factor Authentication (90 min) - *Security important*

### Phase 4 (Optional Enhancements)
- Post editing drafts
- User mentions in comments
- Post analytics
- Trending posts
- User following system
- Direct messaging
- Admin moderation panel

---

## Testing Strategy

For each feature:
1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test API endpoints
3. **User Acceptance Tests** - Test complete flows
4. **Security Tests** - Test authorization and input validation
5. **Performance Tests** - Test with large datasets

---

## Deployment Checklist

Before going live with each feature:
- [ ] Database migrations completed
- [ ] API endpoints tested
- [ ] Frontend UI tested on all browsers
- [ ] Mobile responsive verified
- [ ] Security review completed
- [ ] Performance tested
- [ ] Documentation updated
- [ ] No console errors
- [ ] Toast notifications working
- [ ] Error handling implemented

---

## Quick Start for Developers

To implement a new feature:

1. **Plan** - Understand requirements and design
2. **Database** - Create/modify schema if needed
3. **Backend** - Build API endpoints
4. **Models** - Update data models
5. **Frontend** - Build UI and logic
6. **Styling** - Add CSS for new components
7. **Testing** - Test all scenarios
8. **Documentation** - Update guides
9. **Deploy** - Push to production

---

**Document Complete** ✅  
**Total Estimated Time for All Features**: ~8-10 hours  
**Difficulty: Beginner to Intermediate**
