# WhisperBox Firebase Migration - Complete Setup & Deployment Guide

**Project Status:** ✅ Production-Ready (Firebase-First Architecture)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Quick Start (Local Testing)](#quick-start-local-testing)
4. [Firebase Console Setup](#firebase-console-setup)
5. [Security Rules](#security-rules)
6. [Data Model](#data-model)
7. [Migration from MySQL](#migration-from-mysql)
8. [Deployment Checklist](#deployment-checklist)
9. [Troubleshooting](#troubleshooting)
10. [File Structure](#file-structure)

---

## 📝 Project Overview

**WhisperBox** is a real-time, anonymous self-expression platform built on **Firebase** for serverless scalability. Users can:

**Authentication Flow:**
- After successful login or signup (including Google/Facebook), users are redirected to the main `index.html` page.

**Technology Stack:**
- **Frontend:** Vanilla JavaScript (ES6+), Firestore Realtime Listeners
- **Database:** Firestore (NoSQL)
- **File Storage:** Firebase Storage
- **Authentication:** Firebase Auth (Email/Password + Google)
- **Hosting:** Firebase Hosting (recommended) or any static web server
### Collections Structure

```
firestore/
├── letters/                    # All posted letters (public reads)
│   ├── {letterId}
│   │   ├── title: string
│   │   ├── content: string
│   │   ├── category: string (enum: joy|sadness|anger|exhaustion|reflection)
│   │   ├── mood: string
│   │   ├── image: string (URL or null)
│   │   ├── authorType: string (user|guest)
│   │   ├── authorUserId: string (uid or null)
│   │   ├── authorDisplayName: string (display name or null)
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│
├── users/                      # User profiles (private, owner-only)
│   ├── {uid}
│   │   ├── uid: string
│   │   ├── email: string
│   │   ├── displayName: string
│   │   └── createdAt: timestamp
│   │
│   └── {uid}/bookmarks/        # Subcollection (per user)
│       ├── {letterId}
│       │   ├── letterId: string
│       │   └── bookmarkedAt: timestamp
```

Note: The codebase supports overriding the posts collection name at runtime. By default the collection name is `letters`. To use a different collection name such as `anonymous_posts`, set the environment variable `FIREBASE_POSTS_COLLECTION` during CI/CD; the deployment substitution script will write a small `firebase-config.js` that sets `window.__FIREBASE_COLLECTIONS__` and the client will use that value.

### Storage Structure

```
storage/
└── letters/
    ├── {timestamp}_{randomId}.jpg
    ├── {timestamp}_{randomId}.png
    └── ...
```

---

## 🚀 Quick Start (Local Testing)

### Prerequisites
- Node.js 14+ (for dev server; optional)
- Python 3 (for local HTTP server) or `http-server` (npm)
- A Firebase project configured
- Modern web browser (Chrome, Firefox, Safari, Edge)
- `.env` file created from `.env.example` and filled with your credentials
- `serviceAccountKey.json` downloaded from Firebase Console (see `.env.example` for instructions)

### Step 1: Serve the Application Locally

**Option A: Python (Built-in)**
```bash
cd "c:\xampp\htdocs\whisperbox git clone\whisperbox-firebase"
python -m http.server 5500
```

**Option B: Node.js (http-server)**
```bash
npm install -g http-server
cd "c:\xampp\htdocs\whisperbox git clone\whisperbox-firebase"
http-server -p 5500
```

**Option C: Live Server (VS Code)**
- Install "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

### Step 2: Open in Browser
- Visit: **http://localhost:5500**
- Open DevTools (F12) to monitor Firestore writes

### Step 3: Test Flows

**Test 1: Guest Posting**
1. Without signing in, click "Share Your Story"
2. Fill form (category, title, content, image optional)
3. Click "Share Anonymously"
4. Verify letter appears in "Read Anonymous Letters" section
5. Check Firestore console → `letters` collection → verify document with `authorType: 'guest'`

**Test 2: User Registration & Posting**
1. Click "Sign Up" button (top-right navbar)
2. Fill Display Name + Email + Password
3. Click "Create Account"
4. Verify Firestore `users/{uid}` document exists
5. Click "Share Your Story", post a letter
6. Verify letter includes `authorUserId`, `authorDisplayName`, `authorType: 'user'`

**Test 3: Google Sign-In**
1. Click "Continue with Google" in auth modal
2. Sign in with your Google account
3. Verify `users/{uid}` document created in Firestore
4. Post a letter → verify author metadata

**Test 4: Real-Time Updates**
1. Have two browser windows open to http://localhost:5500
2. In Window 1, post a letter
3. In Window 2, observe letter appears instantly (no refresh)

**Test 5: Bookmarks (Authenticated Only)**
1. Sign in
2. Hover/click on a letter → bookmark button (if implemented)
3. Check `users/{uid}/bookmarks/` → verify bookmark document

---

## 🔧 Firebase Console Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name: `whisperbox` (or your choice)
4. Disable Analytics (optional)
5. Create project

### Step 2: Configure Authentication

**Email/Password Auth:**
1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Save

**Google Auth:**
1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google**
3. Select project support email
4. Save

### Step 3: Set Up Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Start in **Production mode** (we'll add rules below)
4. Select a region (closest to your users, e.g., `us-central1`)
5. Create

### Step 4: Enable Storage

1. Go to **Storage**
2. Click **Get started**
3. Start in **Production mode**
4. Select same region as Firestore
5. Create

### Step 5: Copy Firebase Config

1. Go to **Project settings** (gear icon)
2. Copy your `firebaseConfig` object
3. Replace the config in `firebase.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

---

## 🔒 Security Rules

### Firestore Rules

1. Go to **Firestore** → **Rules** tab
2. Replace default rules with `firestore.rules`:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Letters collection: public reads, validated writes
    match /letters/{letterId} {
      allow read: if true;

      allow create: if
        request.resource.data.keys().hasOnly(['title','content','category','mood','image','authorType','authorUserId','authorDisplayName','createdAt','updatedAt'])
        && request.resource.data.content is string
        && request.resource.data.content.size() <= 2000
        && request.resource.data.category is string
        && (request.resource.data.authorType == 'user' || request.resource.data.authorType == 'guest')
        && (request.auth != null || request.resource.data.authorType == 'guest');

      allow update, delete: if false;
    }

    // Users: owner-only access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Bookmarks subcollection
    match /users/{userId}/bookmarks/{bookmarkId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

### Storage Rules

1. Go to **Storage** → **Rules** tab
2. Replace default rules with `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /letters/{fileId} {
      allow read: if true;
      allow write: if request.resource != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    match /{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

3. Click **Publish**

---

## 📊 Data Model

### Letters Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | No | Defaults to "Untitled Letter" |
| `content` | string | Yes | Max 2000 chars |
| `category` | string | Yes | Enum: joy, sadness, anger, exhaustion, reflection |
| `mood` | string | Yes | Same as category (denormalized) |
| `image` | string (URL) | No | Firebase Storage download URL |
| `authorType` | string | Yes | 'user' or 'guest' |
| `authorUserId` | string | No | Firebase Auth UID (null if guest) |
| `authorDisplayName` | string | No | User's display name (null if guest) |
| `createdAt` | timestamp | Yes | Firestore server timestamp |
| `updatedAt` | timestamp | Yes | Firestore server timestamp |

### Users Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `uid` | string | Yes | Firebase Auth UID |
| `email` | string | Yes | User's email |
| `displayName` | string | No | Custom display name |
| `createdAt` | timestamp | Yes | When account created |

### Bookmarks Subcollection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `letterId` | string | Yes | Reference to letter ID |
| `bookmarkedAt` | timestamp | Yes | When bookmarked |

---

## 🔄 Migration from MySQL

### Prerequisites
- Node.js 14+ installed
- MySQL server running (with old WhisperBox data)
- Firebase project created and configured
- Firebase service account key (JSON file)

### Setup

1. Install dependencies:
```bash
cd "c:\xampp\htdocs\whisperbox git clone\whisperbox-firebase"
npm install mysql2 firebase-admin dotenv
```

2. Create `.env` file in `whisperbox-firebase/`:
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=whisperbox_db
FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json
```

3. Download Firebase service account key:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in `whisperbox-firebase/`
   - **⚠️ DO NOT COMMIT THIS FILE** — add to `.gitignore`

### Run Migration

```bash
node migrate_mysql_to_firestore.js
```

**Output Example:**
```
Starting migration from MySQL to Firestore...

Found 42 posts to migrate.

✓ Migrated post 1
✓ Migrated post 2
...
✓ Migration complete: 42 successful, 0 failed
```

### Verify Migration

1. Open Firebase Console → Firestore → `letters` collection
2. Verify documents appear with correct fields
3. Check images in Storage → `letters/` folder
4. Cross-reference a few records with MySQL to confirm accuracy

---

## 📦 Deployment Checklist

### Before Going Live

- [ ] Firebase project created and all services enabled
- [ ] Firestore and Storage rules published
- [ ] Firebase config (apiKey, projectId, etc.) updated in `firebase.js`
- [ ] `.env` and `serviceAccountKey.json` added to `.gitignore`
- [ ] `.env` and `serviceAccountKey.json` created and filled with correct credentials (not committed)
- [ ] `firestore.indexes.json` present in project root
- [ ] Local testing completed (all test flows pass)
- [ ] HTTPS/SSL enabled on hosting
- [ ] Data migrated from MySQL (if applicable)
- [ ] Google OAuth consent screen configured (for Google sign-in)
- [ ] Error monitoring set up (e.g., Sentry, Firebase Crashlytics)

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login and initialize:
```bash
firebase login
firebase init hosting
```

3. Configure `firebase.json`:
```json
{
  "hosting": {
    "public": ".",
    "site": "whisperbox",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "migrate_mysql_to_firestore.js",
      ".env",
      "serviceAccountKey.json"
    ]
  }
}
```

4. Deploy:
```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage
```

### Deploy to Other Hosting (Netlify, Vercel, GitHub Pages)

Simply upload the entire `whisperbox-firebase/` folder as a static site. No build step required.

**Important:** Do not expose `serviceAccountKey.json` or `.env` to the client.

---

## 🐛 Troubleshooting

### Issue: "Permission denied" when posting

**Solution:**
- Check Firestore rules are published
- Verify `authorType` is set to 'guest' or 'user'
- Check browser console for detailed error

### Issue: Images not uploading

**Solution:**
- Verify Storage rules are published
- Check file size < 5MB
- Check file is a valid image (JPEG, PNG, GIF)
- Verify Storage bucket is accessible

### Issue: Real-time updates not working

**Solution:**
- Check network tab (DevTools) for active listeners
- Verify Firestore rules allow reads
- Restart browser
- Check browser console for errors

### Issue: Google Sign-In fails

**Solution:**
- Verify Google Auth provider enabled in Firebase Console
- Check OAuth consent screen is configured
- Verify Firebase config has correct `authDomain`
- Clear browser cookies

### Issue: User document not created on sign-in

**Solution:**
- Check `createUserDoc` is called in `onAuthStateChanged`
- Verify Firestore rules allow writes to `/users/{uid}`
- Check browser console for errors

### Issue: "Firebase App not configured"

**Solution:**
- Verify `firebaseConfig` object is correctly populated in `firebase.js`
- Check network request to Firebase APIs succeeds
- Clear browser cache and reload

---

## 📁 File Structure

```
whisperbox-firebase/
├── index.html                    # Main HTML entry point
├── script.js                     # Client-side app logic
├── firebase.js                   # Firebase SDK initialization
├── firebase_helpers.js           # Firestore/Storage helpers (realtime, uploads, bookmarks)
├── styles.css                    # UI styling
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── firestore.indexes.json        # Firestore indexes (required by firebase.json)
├── migrate_mysql_to_firestore.js # Data migration script (Node.js)
├── .env.example                  # Example environment file
├── .gitignore                    # Git ignore file
├── package.json                  # Node.js dependencies (if using npm)
└── public/                       # Static assets (if applicable)
```

---

## 🎯 Next Steps & Enhancements

### Phase 2 (Future)
- [ ] Cloud Functions for content moderation
- [ ] Rate limiting (prevent spam)
- [ ] Advanced search/filtering
- [ ] Email notifications
- [ ] Dark mode UI
- [ ] Mobile app (React Native)

### Operations
- [ ] Set up monitoring (Firebase Analytics, Sentry)
- [ ] Configure automated backups
- [ ] Implement user feedback form
- [ ] Add analytics dashboard
- [ ] Set up logging and alerting

---

## 📞 Support

For issues:
1. Check **Troubleshooting** section above
2. Review **Firebase Console** logs (Error Reporting, Firestore Activity)
3. Check browser **DevTools** console for errors
4. Review **Firestore rules** to ensure they permit your operations

---

## 📜 Version & License

- **Version:** 1.0.0 (Firebase-First Architecture)
- **Last Updated:** December 2025
- **Status:** Production-Ready ✅

---

**Built with Firebase | Hosted with Cloud** 🚀
### Migrating MySQL Data to Firestore

1. Fill out `.env` using `.env.example` as a template.
2. Download your Firebase service account key and save as `serviceAccountKey.json` (do not commit).
3. Run the migration script:
  ```bash
  node migrate_mysql_to_firestore.js
  ```
  This will transfer your MySQL `posts` table to Firestore `posts` collection. Edit the script as needed for other tables.
