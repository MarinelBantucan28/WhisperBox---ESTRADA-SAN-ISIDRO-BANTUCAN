// Import Firebase modules
import { db, storage, auth, onAuthStateChanged, googleProvider, facebookProvider } from './firebase.js';
import { listenLetters, uploadImageFile, postLetter, createUserDoc, addBookmark, removeBookmark, listenUserBookmarks } from './firebase_helpers.js';
import { initializeCrisisDetection, analyzeContentForCrisis } from './services/contentAnalysis.js';
import { showCrisisResourcesModal, proceedWithPosting as crisisProceedWithPosting, queueCrisisForModeration, initializeCrisisModal } from './ui/crisis_resources_modal.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    doc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('WhisperBox Firebase initialized!');

    // State variables
    let currentFilter = 'all';
    let currentPage = 1;
    let pageSize = 10;
    let lastDoc = null;
    let isLoading = false;
    let currentUser = null;
    let currentUserHandle = null; // anonymousHandle from Firestore user doc
    // Removed: isSignUp (no longer needed)
    let lettersUnsub = null; // for realtime listener
    let bookmarksUnsub = null; // for bookmark listener
    let userBookmarks = new Set(); // store bookmarked letter IDs

    // Shared DOM references (used across handlers)
    const letterForm = document.getElementById('letter-form');
    const categoryCards = Array.from(document.querySelectorAll('.category-card'));
    const successModal = document.getElementById('success-modal');
    const imageUpload = document.getElementById('image-upload');
    const fileName = document.getElementById('file-name');
    const imagePreview = document.getElementById('image-preview');

    // Initialize
    setupEventListeners();
    setupAuthStateListener();
    initializeCrisisModal(); // Initialize crisis modal on page load
    initializeCrisisDetection().catch(err => console.warn('Crisis detection not available:', err)); // Load crisis keywords
    // Start realtime listener on page load
    if (!lettersUnsub) {
        lettersUnsub = listenLetters(renderLetters, { filter: currentFilter, pageSize });
    }

    function setupEventListeners() {
        // Form submission
        if (letterForm) {
            letterForm.addEventListener('submit', handleFormSubmit);
        }

        // Category selection
        categoryCards.forEach(card => {
            card.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                const categorySelect = document.getElementById('category');
                if (categorySelect) {
                    categorySelect.value = category;

                    // Highlight selected category card
                    categoryCards.forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                }
            });
        });

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');

                // Update active button
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Filter letters: update currentFilter and reattach realtime listener
                currentFilter = filter;
                currentPage = 1;
                lastDoc = null;
                // Properly unsubscribe from previous listener before attaching new one
                if (lettersUnsub && typeof lettersUnsub === 'function') {
                    try { 
                        lettersUnsub(); 
                    } catch (e) { 
                        console.warn('Error unsubscribing from previous listener:', e);
                    }
                }
                lettersUnsub = listenLetters(renderLetters, { filter: currentFilter, pageSize });
            });
        });

        // Character counter
        const contentTextarea = document.getElementById('content');
        const charCounter = document.getElementById('char-counter');

        if (contentTextarea && charCounter) {
            contentTextarea.addEventListener('input', function() {
                const charCount = this.value.length;
                charCounter.textContent = charCount;

                if (charCount > 2000) {
                    charCounter.style.color = 'red';
                } else {
                    charCounter.style.color = '';
                }
            });
        }

        // Image upload preview
        if (imageUpload && fileName && imagePreview) {
            imageUpload.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    fileName.textContent = this.files[0].name;

                    const reader = new FileReader();

                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.alt = 'Preview';
                        img.src = e.target.result;
                        img.loading = 'lazy';
                        imagePreview.innerHTML = '';
                        imagePreview.appendChild(img);
                        imagePreview.style.display = 'block';
                    };

                    reader.readAsDataURL(this.files[0]);
                } else {
                    fileName.textContent = 'No file chosen';
                    imagePreview.style.display = 'none';
                    imagePreview.innerHTML = '';
                }
            });
        }

        // Modal close events
        const successModal = document.getElementById('success-modal');
        const closeModal = document.querySelector('.close-modal');
        const modalButton = document.querySelector('.modal-button');

        if (closeModal) {
            closeModal.addEventListener('click', function() {
                if (successModal) successModal.style.display = 'none';
            });
        }

        if (modalButton) {
            modalButton.addEventListener('click', function() {
                if (successModal) successModal.style.display = 'none';
            });
        }

        window.addEventListener('click', function(e) {
            if (e.target === successModal) {
                successModal.style.display = 'none';
            }
        });

        // Mobile Navigation Toggle
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger) {
            hamburger.addEventListener('click', function() {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();

                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 80;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // Check if user is authenticated
        if (!currentUser) {
            showToast('Please sign in to share your thoughts.', 'warning');
            // Redirect to login after showing toast
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 2000);
            return;
        }

        // Form validation
        const category = document.getElementById('category').value;
        const content = document.getElementById('content').value;
        const title = document.getElementById('title').value;
        const terms = document.getElementById('terms').checked;

        if (!category) {
            showToast('Please select an emotion category.', 'error');
            return;
        }

        if (!content.trim()) {
            showToast('Please write your letter.', 'error');
            return;
        }

        if (content.length > 2000) {
            showToast('Your letter exceeds the 2000 character limit.', 'error');
            return;
        }

        if (!terms) {
            showToast('Please agree to the terms before submitting.', 'error');
            return;
        }

        // Sanitize content (trim whitespace, prevent XSS via textContent usage)
        const sanitizedTitle = (title || 'Untitled Letter').trim();
        const sanitizedContent = content.trim();

        // Prepare data - ANONYMOUS (uses anonymousHandle from user doc, NOT user email/id)
        const letterData = {
            title: sanitizedTitle,
            content: sanitizedContent,
            category: category,
            authorUid: currentUser.uid,
            anonymousHandle: currentUserHandle || `user-${currentUser.uid.slice(0,6)}`,
            anonymous: true, // Critical: mark as anonymous
            createdAt: Timestamp.now()
        };
        
        // Do NOT include any user identity information like email, displayName, photoURL
        // Only authorUid is stored server-side for moderation/deletion; not shown to other users

        // === CRISIS DETECTION PHASE ===
        // Analyze content for crisis keywords BEFORE posting
        try {
            const crisisAnalysis = await analyzeContentForCrisis(sanitizedTitle, sanitizedContent);
            
            if (crisisAnalysis.hasCrisisContent) {
                // Show crisis resources modal
                // User can choose to continue posting or seek help first
                return new Promise((resolve) => {
                    showCrisisResourcesModal(crisisAnalysis, letterData, async (dataToPost) => {
                        // User decided to continue posting after viewing resources
                        await continueProceedingWithPost(dataToPost, crisisAnalysis);
                        resolve();
                    });
                });
            }
        } catch (error) {
            console.warn('Crisis detection failed, proceeding with post:', error);
            // If crisis detection fails, just continue (don't block posting)
        }

        // No crisis detected, proceed normally
        await continueProceedingWithPost(letterData);
    }

    async function continueProceedingWithPost(letterData, crisisAnalysis = null) {
        // Handle image upload (validate type + size, sanitize filename)
        const imageFile = document.getElementById('image-upload').files[0];
        if (imageFile) {
            // Basic client-side validation
            if (!imageFile.type || !imageFile.type.startsWith('image/')) {
                showToast('Selected file is not an image.', 'error');
                return;
            }

            const MAX_BYTES = 5 * 1024 * 1024; // 5MB
            if (imageFile.size > MAX_BYTES) {
                showToast('Image exceeds maximum size of 5MB.', 'error');
                return;
            }

            try {
                const uploadedUrl = await uploadImageFile(imageFile);
                letterData.image = uploadedUrl;
            } catch (error) {
                console.error('Error uploading image:', error);
                showToast('Error uploading image. Please try again.', 'error');
                return;
            }
        }

        // Submit to Firestore
        const submitBtn = letterForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        
        // Show spinner in button
        const spinnerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top:2px solid white;border-radius:50%;animation:spin 0.9s linear infinite;margin-right:8px;vertical-align:middle;"></span>';
        submitBtn.innerHTML = spinnerHTML + 'Posting your letter...';

        try {
            const letterId = await postLetter(letterData);

            // Queue for moderation if crisis detected
            if (crisisAnalysis && crisisAnalysis.shouldNotifyModeration) {
                try {
                    await queueCrisisForModeration(letterId);
                } catch (err) {
                    console.warn('Failed to queue for moderation:', err);
                    // Don't block posting if moderation queue fails
                }
            }

            showToast('Your letter has been posted successfully!', 'success');
            console.log('Letter posted successfully with ID:', letterId);

            // Show success modal
            if (successModal) {
                successModal.style.display = 'flex';
            }

            // Reset form thoroughly
            letterForm.reset();
            const charCounter = document.getElementById('char-counter');
            const fileName = document.getElementById('file-name');
            const imagePreview = document.getElementById('image-preview');
            if (charCounter) charCounter.textContent = '0';
            if (fileName) fileName.textContent = 'No file chosen';
            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.innerHTML = '';
            }
            categoryCards.forEach(card => card.classList.remove('selected'));

        } catch (error) {
            console.error('Error posting letter:', error.code || error.message, error);
            
            // Provide specific error feedback to user
            let errorMsg = 'An error occurred while posting. Please try again.';
            if (error.code === 'permission-denied') {
                errorMsg = 'You do not have permission to post. Please sign in and try again.';
            } else if (error.code === 'unauthenticated') {
                errorMsg = 'Authentication required. Please sign in to post.';
            } else if (error.message && error.message.includes('Firebase config')) {
                errorMsg = 'Firebase connection error. Please check your configuration and try again.';
            } else if (error.message) {
                errorMsg = `Error: ${error.message}`;
            }
            
            showToast(errorMsg, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    function renderLetters(letters) {
        const lettersGrid = document.querySelector('.letters-grid');
        if (!lettersGrid) return;

        if (!letters || letters.length === 0) {
            const emptyNode = document.createElement('div');
            emptyNode.className = 'no-letters';
            const p = document.createElement('p');
            p.textContent = 'No letters found. Be the first to share!';
            emptyNode.appendChild(p);
            lettersGrid.innerHTML = '';
            lettersGrid.appendChild(emptyNode);
            return;
        }

        lettersGrid.innerHTML = '';

        letters.forEach(letter => {
            const letterCard = document.createElement('div');
            letterCard.className = 'letter-card';
            letterCard.setAttribute('data-category', letter.category);

            const categoryNames = {
                'joy': 'Joy',
                'sadness': 'Sadness',
                'anger': 'Anger',
                'exhaustion': 'Exhaustion',
                'reflection': 'Reflection'
            };

            // Category
            const catDiv = document.createElement('div');
            catDiv.className = 'letter-category';
            catDiv.textContent = categoryNames[letter.category] || letter.category;
            letterCard.appendChild(catDiv);

            // Title
            if (letter.title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'letter-title';
                titleEl.textContent = letter.title;
                letterCard.appendChild(titleEl);
            }

            // Content
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'letter-content';
            const p = document.createElement('p');
            p.textContent = letter.content || '';
            contentWrapper.appendChild(p);
            letterCard.appendChild(contentWrapper);

            // Image
            if (letter.image) {
                const imgWrap = document.createElement('div');
                imgWrap.className = 'letter-image';
                const imgEl = document.createElement('img');
                imgEl.alt = 'Letter image';
                imgEl.loading = 'lazy';
                imgEl.src = letter.image;
                imgWrap.appendChild(imgEl);
                letterCard.appendChild(imgWrap);
            }

            // Author info - Show anonymousHandle (anonymity-first)
            const authorDiv = document.createElement('div');
            authorDiv.className = 'letter-author';
            authorDiv.textContent = letter.anonymousHandle || 'Anonymous'; // Show anonymous handle if available
            letterCard.appendChild(authorDiv);

            // Bookmark button (only for logged-in users)
            if (currentUser) {
                const bookmarkBtn = document.createElement('button');
                bookmarkBtn.className = 'bookmark-btn';
                bookmarkBtn.setAttribute('data-letter-id', letter.id);
                bookmarkBtn.innerHTML = '♡';
                bookmarkBtn.title = 'Bookmark this letter';
                
                // Initialize bookmark state
                const isBookmarked = userBookmarks.has(letter.id);
                if (isBookmarked) {
                    bookmarkBtn.classList.add('bookmarked');
                    bookmarkBtn.setAttribute('aria-label', 'Remove from bookmarks');
                } else {
                    bookmarkBtn.setAttribute('aria-label', 'Add to bookmarks');
                }
                
                bookmarkBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        if (userBookmarks.has(letter.id)) {
                            await removeBookmark(currentUser.uid, letter.id);
                            bookmarkBtn.classList.remove('bookmarked');
                            bookmarkBtn.setAttribute('aria-label', 'Add to bookmarks');
                            showToast('Letter removed from bookmarks.', 'success');
                        } else {
                            await addBookmark(currentUser.uid, letter.id);
                            bookmarkBtn.classList.add('bookmarked');
                            bookmarkBtn.setAttribute('aria-label', 'Remove from bookmarks');
                            showToast('Letter bookmarked!', 'success');
                        }
                    } catch (err) {
                        console.error('Bookmark error:', err);
                        showToast('Error updating bookmark.', 'error');
                    }
                });
                letterCard.appendChild(bookmarkBtn);
            }

            // Date
            const dateDiv = document.createElement('div');
            dateDiv.className = 'letter-date';
            dateDiv.textContent = letter.createdAt ? new Date(letter.createdAt.toDate()).toLocaleDateString() : '';
            letterCard.appendChild(dateDiv);

            lettersGrid.appendChild(letterCard);
        });
    }

    // Toast notifications
    function showToast(message, type = 'success') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        let backgroundColor = 'var(--success-color)';
        if (type === 'error') {
            backgroundColor = '#f44336';
        } else if (type === 'warning') {
            backgroundColor = '#ff9800';
        } else if (type === 'info') {
            backgroundColor = '#2196f3';
        }

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 12px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Add toast animations to CSS
    const toastStyles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = toastStyles;
    document.head.appendChild(styleSheet);

    // LocalStorage-based demo auth
    function setupAuthStateListener() {
        // Check Firebase auth state and sync UI
        onAuthStateChanged(auth, async (user) => {
            const authNav = document.getElementById('auth-nav');
            const userNav = document.getElementById('user-nav');
            
            if (user) {
                // User is authenticated
                currentUser = user;
                
                // Fetch user doc from Firestore to get anonymousHandle
                try {
                    const { doc: docRef, getDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
                    const userDocRef = docRef(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        currentUserHandle = userDocSnap.data().anonymousHandle;
                    } else {
                        currentUserHandle = `user-${user.uid.slice(0,6)}`;
                    }
                } catch (err) {
                    console.warn('Failed to fetch user handle:', err);
                    currentUserHandle = `user-${user.uid.slice(0,6)}`;
                }
                
                if (authNav) authNav.style.display = 'none';
                if (userNav) {
                    userNav.style.display = '';
                    const userDisplay = document.getElementById('user-display');
                    // Show anonymousHandle or email
                    userDisplay.textContent = currentUserHandle || user.email;
                    
                    const userAvatar = document.getElementById('user-avatar');
                    if (user.photoURL) {
                        userAvatar.src = user.photoURL;
                    } else {
                        userAvatar.src = 'img/default-avatar.png';
                    }
                    
                    // Dropdown toggle
                    const userMenuBtn = document.getElementById('user-menu-btn');
                    const userMenu = document.getElementById('user-menu');
                    if (userMenuBtn && userMenu) {
                        userMenuBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
                        });
                        document.addEventListener('click', (e) => {
                            if (!userMenu.contains(e.target) && e.target !== userMenuBtn) {
                                userMenu.style.display = 'none';
                            }
                        });
                    }
                    
                    // Logout
                    const logoutLink = document.getElementById('logout-link');
                    if (logoutLink) {
                        logoutLink.addEventListener('click', async (e) => {
                            e.preventDefault();
                            try {
                                await auth.signOut();
                                currentUser = null;
                                currentUserHandle = null;
                                showToast('Logged out successfully', 'success');
                                setTimeout(() => window.location.href = '/index.html', 1000);
                            } catch (error) {
                                console.error('Logout error:', error);
                                showToast('Error logging out', 'error');
                            }
                        });
                    }
                    
                    // My Letters link
                    const myLettersLink = document.getElementById('my-letters-link');
                    if (myLettersLink) {
                        myLettersLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            showToast('My Letters feature coming soon', 'info');
                        });
                    }
                    
                    // Saved Letters link
                    const savedLettersLink = document.getElementById('saved-letters-link');
                    if (savedLettersLink) {
                        savedLettersLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            showToast('Saved Letters feature coming soon', 'info');
                        });
                    }
                    
                    // Settings link
                    const settingsLink = document.getElementById('settings-link');
                    if (settingsLink) {
                        settingsLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            showToast('Settings feature coming soon', 'info');
                        });
                    }
                    
                    // Load user bookmarks
                    if (bookmarksUnsub && typeof bookmarksUnsub === 'function') {
                        try { bookmarksUnsub(); } catch (e) { console.warn('Error unsubscribing bookmarks:', e); }
                    }
                    bookmarksUnsub = listenUserBookmarks(user.uid, (bookmarks) => {
                        userBookmarks = new Set(bookmarks);
                        // Update bookmark UI for all rendered letters
                        updateBookmarkUI();
                    });
                }
            } else {
                // User is not authenticated
                currentUser = null;
                currentUserHandle = null;
                if (authNav) authNav.style.display = '';
                if (userNav) userNav.style.display = 'none';
                
                // Unsubscribe from bookmarks listener
                if (bookmarksUnsub && typeof bookmarksUnsub === 'function') {
                    try { bookmarksUnsub(); } catch (e) { console.warn('Error unsubscribing bookmarks:', e); }
                    bookmarksUnsub = null;
                }
            }
        });
    }
    
    function updateBookmarkUI() {
        // Update bookmark button state for all visible letter cards
        const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
        bookmarkBtns.forEach(btn => {
            const letterId = btn.getAttribute('data-letter-id');
            if (userBookmarks.has(letterId)) {
                btn.classList.add('bookmarked');
                btn.setAttribute('aria-label', 'Remove from bookmarks');
            } else {
                btn.classList.remove('bookmarked');
                btn.setAttribute('aria-label', 'Add to bookmarks');
            }
        });
    }























    function updateUIForAuthState(user) {
        const authNav = document.getElementById('auth-nav');
        const userNav = document.getElementById('user-nav');
        const userInfo = document.getElementById('user-info');

        if (user) {
            // User is signed in
            if (authNav) authNav.style.display = 'none';
            if (userNav) userNav.style.display = 'flex';
            if (userInfo) {
                userInfo.textContent = user.displayName || user.email;
            }

            // Start listening to user's bookmarks
            if (!bookmarksUnsub) {
                bookmarksUnsub = listenUserBookmarks(user.uid, (bookmarks) => {
                    userBookmarks = new Set(bookmarks);
                    // Update bookmark button states for all visible letters
                    updateBookmarkButtonStates();
                });
            }
        } else {
            // User is signed out
            if (authNav) authNav.style.display = 'flex';
            if (userNav) userNav.style.display = 'none';

            // Clear bookmarks and unsubscribe
            userBookmarks.clear();
            if (bookmarksUnsub) {
                bookmarksUnsub();
                bookmarksUnsub = null;
            }
        }
    }

    function updateBookmarkButtonStates() {
        // Update all bookmark buttons based on current userBookmarks set
        const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
        bookmarkBtns.forEach(btn => {
            if (btn.letterId) {
                const isBookmarked = userBookmarks.has(btn.letterId);
                if (isBookmarked) {
                    btn.classList.add('bookmarked');
                } else {
                    btn.classList.remove('bookmarked');
                }
            }
        });
    }
});
