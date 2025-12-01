// Firestore rules tests for WhisperBox auth
// Run with Firebase Emulator Suite (requires firebase-tools)
// Usage: firebase emulators:exec --only firestore,auth 'npm test'

const firebase = require('@firebase/app');
const { initializeTestApp, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, serverTimestamp } = require('@firebase/firestore');

const PROJECT_ID = 'whisperbox-test';

describe('Firestore Rules — WhisperBox', () => {
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: PROJECT_ID });
  });

  describe('Users collection', () => {
    it('allows authenticated user to create their own user doc with required fields', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123', email: 'test@example.com' }
      });
      const db = app.firestore();

      const userDoc = {
        uid: 'user123',
        createdAt: serverTimestamp(),
        anonymousHandle: 'user-abc123',
        emailVerified: false
      };

      await assertSucceeds(setDoc(doc(db, 'users', 'user123'), userDoc));
    });

    it('blocks creation of user doc with missing required fields', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const db = app.firestore();

      const incompleteDoc = {
        uid: 'user123',
        anonymousHandle: 'user-abc123'
        // missing createdAt and emailVerified
      };

      await assertFails(setDoc(doc(db, 'users', 'user123'), incompleteDoc));
    });

    it('blocks user from creating docs for other users', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const db = app.firestore();

      const userDoc = {
        uid: 'otherUser',
        createdAt: serverTimestamp(),
        anonymousHandle: 'user-other',
        emailVerified: false
      };

      await assertFails(setDoc(doc(db, 'users', 'otherUser'), userDoc));
    });

    it('blocks unauthenticated users from creating user docs', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: null
      });
      const db = app.firestore();

      const userDoc = {
        uid: 'user123',
        createdAt: serverTimestamp(),
        anonymousHandle: 'user-abc123',
        emailVerified: false
      };

      await assertFails(setDoc(doc(db, 'users', 'user123'), userDoc));
    });

    it('prevents reading user docs (not public)', async () => {
      const adminApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'admin', isAdmin: true }
      });
      const userApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const adminDb = adminApp.firestore();
      const userDb = userApp.firestore();

      // Admin writes a user doc
      await setDoc(doc(adminDb, 'users', 'user123'), {
        uid: 'user123',
        createdAt: serverTimestamp(),
        anonymousHandle: 'user-abc123',
        emailVerified: true
      });

      // Another user tries to read it — should fail
      await assertFails(getDoc(doc(userDb, 'users', 'user123')));
    });
  });

  describe('Posts collection', () => {
    it('allows authenticated user to create a post', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const db = app.firestore();

      const post = {
        authorUid: 'user123',
        anonymousHandle: 'user-abc123',
        content: 'This is a test post',
        createdAt: serverTimestamp()
      };

      await assertSucceeds(setDoc(doc(db, 'posts', 'post123'), post));
    });

    it('blocks posts with PII (email field)', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const db = app.firestore();

      const postWithEmail = {
        authorUid: 'user123',
        anonymousHandle: 'user-abc123',
        content: 'Test',
        email: 'user@example.com',
        createdAt: serverTimestamp()
      };

      await assertFails(setDoc(doc(db, 'posts', 'post123'), postWithEmail));
    });

    it('blocks posts without required fields', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user123' }
      });
      const db = app.firestore();

      const incompletePost = {
        content: 'Test post'
        // missing authorUid, anonymousHandle, createdAt
      };

      await assertFails(setDoc(doc(db, 'posts', 'post123'), incompletePost));
    });

    it('allows reading posts (public)', async () => {
      const adminApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'admin' }
      });
      const userApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'user456' }
      });
      const adminDb = adminApp.firestore();
      const userDb = userApp.firestore();

      // Admin creates a post
      const post = {
        authorUid: 'admin',
        anonymousHandle: 'admin-handle',
        content: 'Public post',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(adminDb, 'posts', 'public1'), post);

      // Different user reads it — should succeed
      await assertSucceeds(getDoc(doc(userDb, 'posts', 'public1')));
    });

    it('blocks unauthenticated users from creating posts', async () => {
      const app = initializeTestApp({
        projectId: PROJECT_ID,
        auth: null
      });
      const db = app.firestore();

      const post = {
        authorUid: 'user123',
        anonymousHandle: 'user-abc123',
        content: 'Test',
        createdAt: serverTimestamp()
      };

      await assertFails(setDoc(doc(db, 'posts', 'post123'), post));
    });
  });

  describe('Public resources', () => {
    it('allows anyone to read public docs', async () => {
      const adminApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: { uid: 'admin' }
      });
      const anonApp = initializeTestApp({
        projectId: PROJECT_ID,
        auth: null
      });
      const adminDb = adminApp.firestore();
      const anonDb = anonApp.firestore();

      await setDoc(doc(adminDb, 'public', 'config'), { name: 'App Config' });
      await assertSucceeds(getDoc(doc(anonDb, 'public', 'config')));
    });
  });
});
