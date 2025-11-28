// API Configuration - Global variable for dynamic API base URL
// Compute API base dynamically so the frontend works when served via Apache/localhost.
// If the page is opened via file://, API calls will fail — show guidance instead.
window.API_BASE_URL = null;
if (window.location.protocol === 'file:') {
    // Running from file system — backend won't be reachable. Keep null and show a warning later.
    window.API_BASE_URL = null;
    console.warn('Running from file:// — API calls will fail. Open the site via http://localhost/...');
} else {
    // Remove filename from path, keep directory containing index.html
    const pathDir = window.location.pathname.replace(/\/[^\/]*$/, '');
    window.API_BASE_URL = window.location.origin + pathDir + '/backend/api';
}
console.log('API_BASE_URL computed:', window.API_BASE_URL);

document.addEventListener('DOMContentLoaded', async function() {
    console.log('WhisperBox initialized!');
    
    // Use the global API_BASE_URL computed above
    const API_BASE_URL = window.API_BASE_URL;
    
    // Check user authentication from sessionStorage
    const userId = sessionStorage.getItem('user_id');
    const username = sessionStorage.getItem('username');
    const email = sessionStorage.getItem('email');
    const isAuthenticated = sessionStorage.getItem('user_authenticated') === 'true';
    
    console.log('User authenticated:', isAuthenticated, 'Username:', username);
    
    // ===== PAGINATION STATE - Declare at top, before any functions that use them =====
    let currentFilter = 'all';
    let currentPage = 1;
    let currentPerPage = 10;
    let currentFrom = null;
    let currentTo = null;
    let totalCount = 0;
    
    // Initialize navbar with user info
    initializeNavbar();

    // After navbar, fetch user bookmarks if authenticated, THEN load letters
    if (isAuthenticated) {
        await fetchUserBookmarks();
    } else {
        window.bookmarkedPostIds = new Set();
    }
    
    // Now load all letters after bookmarks are fetched
    loadAllLetters();
    
    // Function to initialize navbar with user info
    function initializeNavbar() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        // Create auth section
        let authHTML = '';
        
        if (isAuthenticated && username) {
            authHTML = `
                <li class="nav-auth">
                    <span class="user-info">👤 ${username}</span>
                    <button class="logout-btn" id="logout-btn">Logout</button>
                </li>
            `;
        } else {
            authHTML = `
                <li class="nav-auth">
                    <a href="frontend/register.html" class="login-btn">Login / Register</a>
                </li>
            `;
        }
        
        // Build auth DOM safely
        const li = document.createElement('li');
        li.className = 'nav-auth';
        if (isAuthenticated && username) {
            const span = document.createElement('span');
            span.className = 'user-info';
            span.textContent = `👤 ${username}`;
            li.appendChild(span);

            const btn = document.createElement('button');
            btn.className = 'logout-btn';
            btn.id = 'logout-btn';
            btn.textContent = 'Logout';
            li.appendChild(btn);
        } else {
            const a = document.createElement('a');
            a.href = 'frontend/register.html';
            a.className = 'login-btn';
            a.textContent = 'Login / Register';
            li.appendChild(a);
        }

        navMenu.appendChild(li);

        // Add logout handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', performLogout);
        }
    }

    // Apply date filter handler
    async function applyDateFilter() {
        const fromInput = document.getElementById('filter-from');
        const toInput = document.getElementById('filter-to');
        if (!fromInput || !toInput) return;

        const from = fromInput.value;
        const to = toInput.value;

        if (!from || !to) {
            showToast('Please select both From and To dates.', 'error');
            return;
        }

        try {
            // Set current date filter state and reset to first page
            currentFrom = from;
            currentTo = to;
            currentPage = 1;

            const response = await fetch(`${API_BASE_URL}/posts.php?action=get_posts&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${currentPage}&per_page=${currentPerPage}`);
            const result = await response.json();

            if (result.status === 'success') {
                // Clear category active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                renderPosts(result.posts || []);
                totalCount = result.total_count || 0;
                renderPagination(totalCount, currentPage, currentPerPage);
            } else {
                showToast(result.message || 'No letters found for the selected date range.', 'info');
                renderPosts([]);
                renderPagination(0, 1, currentPerPage);
            }
        } catch (error) {
            console.error('Error applying date filter:', error);
            showToast('An error occurred while filtering by date.', 'error');
            renderPosts([]);
            renderPagination(0, 1, currentPerPage);
        }
    }

    // Bookmarks utilities
    async function fetchUserBookmarks() {
        try {
            const res = await fetch(`${API_BASE_URL}/posts.php?action=get_bookmarks`);
            const data = await res.json();
            if (data.status === 'success' && Array.isArray(data.bookmarks)) {
                window.bookmarkedPostIds = new Set(data.bookmarks.map(id => Number(id)));
            } else {
                window.bookmarkedPostIds = new Set();
            }
        } catch (err) {
            console.error('Failed to fetch bookmarks:', err);
            window.bookmarkedPostIds = new Set();
        }
    }

    async function addBookmark(postId) {
        try {
            const res = await fetch(`${API_BASE_URL}/posts.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_bookmark', post_id: postId })
            });
            const data = await res.json();
            if (data.status === 'success') {
                window.bookmarkedPostIds = window.bookmarkedPostIds || new Set();
                window.bookmarkedPostIds.add(Number(postId));
                return true;
            }
            return false;
        } catch (err) {
            console.error('addBookmark error:', err);
            return false;
        }
    }

    async function removeBookmark(postId) {
        try {
            const res = await fetch(`${API_BASE_URL}/posts.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove_bookmark', post_id: postId })
            });
            const data = await res.json();
            if (data.status === 'success') {
                window.bookmarkedPostIds = window.bookmarkedPostIds || new Set();
                window.bookmarkedPostIds.delete(Number(postId));
                return true;
            }
            return false;
        } catch (err) {
            console.error('removeBookmark error:', err);
            return false;
        }
    }

    async function toggleBookmark(postId, buttonEl) {
        if (!isAuthenticated) {
            showToast('Please log in to use bookmarks.', 'info');
            return;
        }

        const isBookmarked = window.bookmarkedPostIds && window.bookmarkedPostIds.has(Number(postId));
        buttonEl.disabled = true;
        if (isBookmarked) {
            const ok = await removeBookmark(postId);
            if (ok) {
                buttonEl.classList.remove('bookmarked');
                buttonEl.title = 'Add bookmark';
            }
        } else {
            const ok = await addBookmark(postId);
            if (ok) {
                buttonEl.classList.add('bookmarked');
                buttonEl.title = 'Remove bookmark';
            }
        }
        buttonEl.disabled = false;
    }
    
    // Function to perform logout
    async function performLogout() {
        try {
            const response = await fetch(`${API_BASE_URL}/logout.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Clear session storage
                sessionStorage.clear();
                
                // Redirect to register page
                window.location.href = 'frontend/register.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            sessionStorage.clear();
            window.location.href = 'frontend/register.html';
        }
    }

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
    
    // Character Counter for Letter Content
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

    // Image Upload Preview
    const imageUpload = document.getElementById('image-upload');
    const fileName = document.getElementById('file-name');
    const imagePreview = document.getElementById('image-preview');
    
    if (imageUpload && fileName && imagePreview) {
        imageUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                fileName.textContent = this.files[0].name;
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Create image preview safely
                    const img = document.createElement('img');
                    img.alt = 'Preview';
                    img.src = e.target.result; // data URL from FileReader
                    img.loading = 'lazy';
                    imagePreview.innerHTML = ''; // clear
                    imagePreview.appendChild(img);
                    imagePreview.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                fileName.textContent = 'No file chosen';
                imagePreview.style.display = 'none';
                // Clear preview
                while (imagePreview.firstChild) imagePreview.removeChild(imagePreview.firstChild);
            }
        });
    }
    
    // Category Selection in Submit Form
    const categoryCards = document.querySelectorAll('.category-card');
    const categorySelect = document.getElementById('category');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            if (categorySelect) {
                categorySelect.value = category;
                
                // Highlight selected category card
                categoryCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });
    
    // Letter Filtering
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter letters
            filterLetters(filter);
        });
    });

    // Date filter controls (From / To and Apply/Clear)
    const applyDateBtn = document.getElementById('apply-date-filter');
    const clearDateBtn = document.getElementById('clear-date-filter');

    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', applyDateFilter);
    }

    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', function() {
            const fromInput = document.getElementById('filter-from');
            const toInput = document.getElementById('filter-to');
            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
            // Reset category filter and reload all letters
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
            if (allBtn) allBtn.classList.add('active');
            loadAllLetters();
        });
    }

    // Letter Form Submission
    const letterForm = document.getElementById('letter-form');
    const successModal = document.getElementById('success-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalButton = document.querySelector('.modal-button');

    if (letterForm) {
        letterForm.addEventListener('submit', async function(e) {
            e.preventDefault();

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

            // Prepare post data
            const categoryMap = {
                'joy': 1,
                'sadness': 2,
                'anger': 3,
                'exhaustion': 4,
                'reflection': 5
            };

            const formData = new FormData();
            formData.append('action', isAuthenticated ? 'create_post' : 'create_guest_post');
            formData.append('title', title || 'Untitled Letter');
            formData.append('content', content);
            formData.append('category_id', categoryMap[category] || 1);
            formData.append('mood', category);
            
            if (isAuthenticated) {
                formData.append('user_id', userId);
            }

            // Handle image upload if present
            const imageFile = document.getElementById('image-upload').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const submitBtn = letterForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            // If API_BASE_URL wasn't computed (e.g., page opened via file://), warn and abort
            if (!API_BASE_URL) {
                alert('Unable to post: please open the site via your web server (http://localhost/...) so the backend API is reachable.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/posts.php`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Your letter has been posted successfully!', 'success');
                    
                    // Show success modal
                    if (successModal) {
                        successModal.style.display = 'flex';
                    }

                    // Reset form
                    letterForm.reset();
                    document.getElementById('char-counter').textContent = '0';
                    document.getElementById('file-name').textContent = 'No file chosen';
                    document.getElementById('image-preview').style.display = 'none';
                    // Clear image preview
                    const iprev = document.getElementById('image-preview');
                    if (iprev) { while (iprev.firstChild) iprev.removeChild(iprev.firstChild); }
                    categoryCards.forEach(card => card.classList.remove('selected'));

                    // Refresh display
                    loadAllLetters();
                    if (isAuthenticated) {
                        loadMyLetters();
                    }
                } else {
                    showToast('Error posting letter: ' + result.message, 'error');
                }
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            } catch (error) {
                console.error('Error submitting letter:', error);
                showToast('An error occurred while posting. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Modal Close Events
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            successModal.style.display = 'none';
        });
    }
    
    if (modalButton) {
        modalButton.addEventListener('click', function() {
            successModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
    
    // Load all letters on page initialization
    if (isAuthenticated) {
        fetchUserBookmarks().then(() => loadAllLetters());
    } else {
        loadAllLetters();
    }

    // Function to load all letters from API (paginated)
    function loadAllLetters(page = 1, per_page = 10) {
        if (!API_BASE_URL) {
            console.warn('API not configured (page likely opened via file://). Open via http://localhost/... to fetch posts.');
            const lettersGrid = document.querySelector('.letters-grid');
            if (lettersGrid) {
                // Show friendly warning element
                const warning = document.createElement('div');
                warning.className = 'no-letters';
                const p = document.createElement('p');
                p.textContent = 'Unable to load letters — open the site via your web server (http://localhost/...) to enable the backend.';
                warning.appendChild(p);
                lettersGrid.innerHTML = '';
                lettersGrid.appendChild(warning);
            }
            return;
        }
        currentFilter = 'all';
        currentPage = page;
        currentPerPage = per_page;
        currentFrom = null;
        currentTo = null;

        fetch(`${API_BASE_URL}/posts.php?action=get_all_posts&page=${currentPage}&per_page=${currentPerPage}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    renderPosts(data.posts || []);
                    totalCount = data.total_count || 0;
                    renderPagination(totalCount, currentPage, currentPerPage);
                } else {
                    console.log('No posts found yet');
                    renderPosts([]);
                    renderPagination(0, 1, currentPerPage);
                }
            })
            .catch(error => {
                console.error('Error loading posts:', error);
                renderPosts([]);
                renderPagination(0, 1, currentPerPage);
            });
    }

    // Render posts helper used by multiple filters (date range, category, all)
    function renderPosts(posts) {
        const lettersGrid = document.querySelector('.letters-grid');
        if (!lettersGrid) return;

        if (!posts || posts.length === 0) {
            const emptyNode = document.createElement('div');
            emptyNode.className = 'no-letters';
            const p2 = document.createElement('p');
            p2.textContent = 'No letters found. Be the first to share!';
            emptyNode.appendChild(p2);
            lettersGrid.innerHTML = '';
            lettersGrid.appendChild(emptyNode);
            return;
        }

        lettersGrid.innerHTML = '';

        posts.forEach(post => {
            const letterCard = document.createElement('div');
            letterCard.className = 'letter-card';
            letterCard.setAttribute('data-letter-id', post.id);
            letterCard.setAttribute('data-category', post.category);

            const categoryNames = {
                'joy': 'Joy',
                'sadness': 'Sadness',
                'anger': 'Anger',
                'exhaustion': 'Exhaustion',
                'reflection': 'Reflection'
            };

            // Check if current user is the author
            const isAuthor = isAuthenticated && post.author_user_id == userId;
            
            // Bookmark button (for authenticated users)
            const postId = Number(post.id);
            const isBookmarked = window.bookmarkedPostIds && window.bookmarkedPostIds.has(postId);
            let bookmarkButton = '';
            if (isAuthenticated) {
                bookmarkButton = `<button class="bookmark-btn" data-post-id="${post.id}" title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">${isBookmarked ? '🔖' : '🔖'}</button>`;
            }

            let actionButtons = '';
            if (isAuthor) {
                actionButtons = `
                    <div class="letter-actions">
                        <button class="edit-btn" data-post-id="${post.id}" title="Edit this letter">✏️ Edit</button>
                        <button class="delete-btn" data-post-id="${post.id}" title="Delete this letter">🗑️ Delete</button>
                        ${bookmarkButton}
                    </div>
                `;
            } else {
                // Non-author users can still bookmark
                if (bookmarkButton) {
                    actionButtons = `
                        <div class="letter-actions">
                            ${bookmarkButton}
                        </div>
                    `;
                }
            }

            // Safe rendering: build elements and set textContent instead of using innerHTML
            // Category
            const catDiv = document.createElement('div');
            catDiv.className = 'letter-category';
            catDiv.textContent = categoryNames[post.category] || post.category;
            letterCard.appendChild(catDiv);

            // Title (if any)
            if (post.title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'letter-title';
                titleEl.textContent = post.title;
                letterCard.appendChild(titleEl);
            }

            // Content
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'letter-content';
            const p = document.createElement('p');
            p.textContent = post.content || '';
            contentWrapper.appendChild(p);
            letterCard.appendChild(contentWrapper);

            // Image (validate src to avoid injecting arbitrary urls)
            if (post.image) {
                const imageSrc = String(post.image);
                // allow only local uploads path or data URLs
                if (imageSrc.startsWith('uploads/') || imageSrc.startsWith('/uploads/') || imageSrc.startsWith('data:')) {
                    const imgWrap = document.createElement('div');
                    imgWrap.className = 'letter-image';
                    const imgEl = document.createElement('img');
                    imgEl.alt = 'Letter image';
                    imgEl.loading = 'lazy';
                    imgEl.src = imageSrc.startsWith('/') ? imageSrc : '/' + imageSrc.replace(/^\/+/, '');
                    imgWrap.appendChild(imgEl);
                    letterCard.appendChild(imgWrap);
                }
            }

            // Date
            const dateDiv = document.createElement('div');
            dateDiv.className = 'letter-date';
            dateDiv.textContent = post.created_at ? new Date(post.created_at).toLocaleDateString() : (post.date || '');
            letterCard.appendChild(dateDiv);

            // Action buttons container
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'letter-actions';

            if (isAuthor) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.setAttribute('data-post-id', post.id);
                editBtn.title = 'Edit this letter';
                editBtn.textContent = '✏️ Edit';
                actionsContainer.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.setAttribute('data-post-id', post.id);
                deleteBtn.title = 'Delete this letter';
                deleteBtn.textContent = '🗑️ Delete';
                actionsContainer.appendChild(deleteBtn);

                if (bookmarkButton) {
                    // bookmarkButton was built as string earlier; construct a safe button
                    const bm = document.createElement('button');
                    bm.className = 'bookmark-btn';
                    bm.setAttribute('data-post-id', post.id);
                    bm.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
                    bm.textContent = isBookmarked ? '🔖' : '🔖';
                    actionsContainer.appendChild(bm);
                }
            } else {
                if (bookmarkButton) {
                    const bm = document.createElement('button');
                    bm.className = 'bookmark-btn';
                    bm.setAttribute('data-post-id', post.id);
                    bm.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
                    bm.textContent = isBookmarked ? '🔖' : '🔖';
                    actionsContainer.appendChild(bm);
                }
            }

            // Only append actions container if it has children
            if (actionsContainer.children.length > 0) {
                letterCard.appendChild(actionsContainer);
            }

            lettersGrid.appendChild(letterCard);

            if (isAuthor) {
                const editBtn = letterCard.querySelector('.edit-btn');
                const deleteBtn = letterCard.querySelector('.delete-btn');
                if (editBtn) editBtn.addEventListener('click', () => openEditModal(post));
                if (deleteBtn) deleteBtn.addEventListener('click', () => openDeleteModal(post.id));
            }

            // Attach bookmark handler if present
            const bookmarkBtn = letterCard.querySelector('.bookmark-btn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const pid = this.getAttribute('data-post-id');
                    await toggleBookmark(pid, this);
                });
            }
        });
    }

    // Render pagination controls
    function renderPagination(total, page, per_page) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        pagination.innerHTML = '';
        const totalPages = Math.max(1, Math.ceil(total / per_page));

        // Prev button
        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = page <= 1;
        prev.addEventListener('click', () => handlePageChange(page - 1));
        pagination.appendChild(prev);

        // Page numbers (show up to 7 pages around current)
        const start = Math.max(1, page - 3);
        const end = Math.min(totalPages, page + 3);

        for (let p = start; p <= end; p++) {
            const btn = document.createElement('button');
            btn.textContent = p;
            if (p === page) btn.classList.add('active');
            btn.addEventListener('click', () => handlePageChange(p));
            pagination.appendChild(btn);
        }

        // Next button
        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = page >= totalPages;
        next.addEventListener('click', () => handlePageChange(page + 1));
        pagination.appendChild(next);
    }

    function handlePageChange(page) {
        if (page < 1) page = 1;
        currentPage = page;

        if (currentFrom && currentTo) {
            // date range pagination
            fetch(`${API_BASE_URL}/posts.php?action=get_posts&from=${encodeURIComponent(currentFrom)}&to=${encodeURIComponent(currentTo)}&page=${currentPage}&per_page=${currentPerPage}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        renderPosts(data.posts || []);
                        totalCount = data.total_count || 0;
                        renderPagination(totalCount, currentPage, currentPerPage);
                    } else {
                        showToast(data.message || 'Error loading page', 'error');
                    }
                }).catch(err => {
                    console.error('Pagination fetch error:', err);
                });
        } else if (currentFilter && currentFilter !== 'all') {
            filterLetters(currentFilter, currentPage, currentPerPage);
        } else {
            loadAllLetters(currentPage, currentPerPage);
        }
    }

    // Function to filter and display letters in Read section
    async function filterLetters(filter, page = 1, per_page = currentPerPage) {
        try {
            currentFilter = filter;
            currentPage = page;
            currentPerPage = per_page;
            currentFrom = null;
            currentTo = null;

            const response = await fetch(`${API_BASE_URL}/posts.php?action=get_posts&category=${filter}&page=${currentPage}&per_page=${currentPerPage}`);
            const result = await response.json();
            if (result.status === 'success') {
                renderPosts(result.posts || []);
                totalCount = result.total_count || 0;
                renderPagination(totalCount, currentPage, currentPerPage);
            } else {
                showToast(result.message || 'Error loading letters', 'error');
                renderPosts([]);
                renderPagination(0, 1, currentPerPage);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            showToast('Unable to load letters. Please try again later.', 'error');
            renderPosts([]);
            renderPagination(0, 1, currentPerPage);
        }
    }

    // My Letters Management System
    function initMyLettersSection() {
        setupMyLettersEvents();
        loadMyLetters();
    }

    function setupMyLettersEvents() {
        // Bulk select button
        const bulkSelectBtn = document.querySelector('.bulk-select-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const bulkDeleteBtn = document.querySelector('.bulk-delete-selected');
        
        if (bulkSelectBtn) {
            bulkSelectBtn.addEventListener('click', toggleBulkSelection);
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', confirmClearAllLetters);
        }
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', confirmBulkDelete);
        }
        
        // Update clear all button state
        updateClearAllButton();
    }

    async function loadMyLetters() {
        if (!isAuthenticated || !userId) {
            // User not logged in - show login prompt
            const myLettersGrid = document.querySelector('.my-letters-grid');
            if (myLettersGrid) {
                myLettersGrid.innerHTML = `
                    <div class="no-letters-message">
                        <h3>Please log in</h3>
                        <p>You need to <a href="frontend/register.html">log in</a> to view your letters.</p>
                    </div>
                `;
            }
            updateLettersCount(0);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/posts.php?action=get_my_posts&user_id=${userId}`);
            const result = await response.json();

            if (result.status === 'success') {
                displayMyLetters(result.posts || []);
                updateLettersCount(result.posts ? result.posts.length : 0);
                updateClearAllButton();
            } else {
                console.error('Error loading my letters:', result.message);
                displayMyLetters([]);
                updateLettersCount(0);
                updateClearAllButton();
            }
        } catch (error) {
            console.error('Error fetching my letters:', error);
            displayMyLetters([]);
            updateLettersCount(0);
            updateClearAllButton();
        }
    }

    function displayMyLetters(letters) {
        const myLettersGrid = document.querySelector('.my-letters-grid');
        if (!myLettersGrid) return;
        
        if (letters.length === 0) {
            myLettersGrid.innerHTML = `
                <div class="no-letters-message">
                    <h3>No letters yet</h3>
                    <p>You haven't submitted any letters yet. <a href="#submit">Share your first thought</a> to get started!</p>
                </div>
            `;
            return;
        }
        
        const categoryNames = {
            'joy': 'Joy',
            'sadness': 'Sadness',
            'anger': 'Anger',
            'exhaustion': 'Exhaustion',
            'reflection': 'Reflection'
        };
        
        const categoryColors = {
            'joy': '#28a745',
            'sadness': '#17a2b8',
            'anger': '#dc3545',
            'exhaustion': '#ffc107',
            'reflection': '#6c63ff'
        };
        
        myLettersGrid.innerHTML = '';
        
        letters.forEach(letter => {
            const letterCard = document.createElement('div');
            letterCard.className = 'my-letter-card';
            letterCard.setAttribute('data-letter-id', letter.id);
            
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'letter-checkbox';
            checkbox.setAttribute('data-letter-id', letter.id);
            letterCard.appendChild(checkbox);

            // Header
            const header = document.createElement('div');
            header.className = 'letter-header';

            const meta = document.createElement('div');
            meta.className = 'letter-meta';

            const identifier = document.createElement('div');
            identifier.className = 'letter-identifier';
            identifier.textContent = `ID: ${letter.id}`;
            meta.appendChild(identifier);

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'letter-category';
            categoryDiv.style.borderLeftColor = categoryColors[letter.category] || '';
            categoryDiv.textContent = categoryNames[letter.category] || letter.category;
            meta.appendChild(categoryDiv);

            if (letter.title) {
                const t = document.createElement('h3');
                t.className = 'letter-title';
                t.textContent = letter.title;
                meta.appendChild(t);
            }

            header.appendChild(meta);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'letter-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.setAttribute('data-letter-id', letter.id);
            editBtn.textContent = '✏️ Edit';
            actionsDiv.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.setAttribute('data-letter-id', letter.id);
            delBtn.textContent = '🗑️ Delete';
            actionsDiv.appendChild(delBtn);

            header.appendChild(actionsDiv);
            letterCard.appendChild(header);

            // Content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'letter-content';
            const cp = document.createElement('p');
            cp.textContent = letter.content || '';
            contentDiv.appendChild(cp);
            letterCard.appendChild(contentDiv);

            // Image
            if (letter.image) {
                const imageSrc = String(letter.image);
                if (imageSrc.startsWith('uploads/') || imageSrc.startsWith('/uploads/') || imageSrc.startsWith('data:')) {
                    const imgWrap = document.createElement('div');
                    imgWrap.className = 'letter-image';
                    const imgEl = document.createElement('img');
                    imgEl.alt = 'Letter image';
                    imgEl.loading = 'lazy';
                    imgEl.src = imageSrc.startsWith('/') ? imageSrc : '/' + imageSrc.replace(/^\/+/, '');
                    imgWrap.appendChild(imgEl);
                    letterCard.appendChild(imgWrap);
                }
            }

            const dateDiv = document.createElement('div');
            dateDiv.className = 'letter-date';
            dateDiv.textContent = `Submitted on ${formatDate(letter.date)}`;
            letterCard.appendChild(dateDiv);

            myLettersGrid.appendChild(letterCard);
        });
        
        // Add event listeners
        addMyLettersEventListeners();
    }

    function addMyLettersEventListeners() {
        // Delete buttons
        const deleteButtons = document.querySelectorAll('.my-letter-card .delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const letterId = this.getAttribute('data-letter-id');
                showDeleteModal(letterId, 'my-letters');
            });
        });
        
        // Edit buttons
        const editButtons = document.querySelectorAll('.my-letter-card .edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const letterId = this.getAttribute('data-letter-id');
                editLetter(letterId);
            });
        });
        
        // Checkboxes
        const checkboxes = document.querySelectorAll('.letter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBulkActionsPanel);
        });
        
        // Letter card clicks (for selection)
        const letterCards = document.querySelectorAll('.my-letter-card');
        letterCards.forEach(card => {
            card.addEventListener('click', function(e) {
                if (!e.target.matches('.delete-btn, .edit-btn, .letter-checkbox')) {
                    const checkbox = this.querySelector('.letter-checkbox');
                    checkbox.checked = !checkbox.checked;
                    updateBulkActionsPanel();
                }
            });
        });
    }

    function toggleBulkSelection() {
        const checkboxes = document.querySelectorAll('.letter-checkbox');
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        updateBulkActionsPanel();
    }

    function updateBulkActionsPanel() {
        const bulkActionsPanel = document.querySelector('.bulk-actions-panel');
        const selectedCount = document.querySelector('.selected-count');
        const checkboxes = document.querySelectorAll('.letter-checkbox:checked');
        
        if (checkboxes.length > 0) {
            bulkActionsPanel.classList.add('show');
            selectedCount.textContent = `${checkboxes.length} letter${checkboxes.length > 1 ? 's' : ''} selected`;
        } else {
            bulkActionsPanel.classList.remove('show');
        }
        
        // Update card selection styles
        const letterCards = document.querySelectorAll('.my-letter-card');
        letterCards.forEach(card => {
            const checkbox = card.querySelector('.letter-checkbox');
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    function confirmBulkDelete() {
        const selectedCheckboxes = document.querySelectorAll('.letter-checkbox:checked');
        if (selectedCheckboxes.length === 0) return;
        
        const bulkDeleteModal = document.getElementById('bulk-delete-modal');
        const message = bulkDeleteModal.querySelector('#bulk-delete-message');
        
        message.textContent = `Are you sure you want to delete ${selectedCheckboxes.length} letter${selectedCheckboxes.length > 1 ? 's' : ''}? This action cannot be undone.`;
        bulkDeleteModal.style.display = 'flex';
        bulkDeleteModal.setAttribute('data-delete-type', 'bulk');
    }

    function confirmClearAllLetters() {
        const myLetters = getMyLetters();
        if (myLetters.length === 0) return;
        
        const bulkDeleteModal = document.getElementById('bulk-delete-modal');
        const message = bulkDeleteModal.querySelector('#bulk-delete-message');
        
        message.textContent = `Are you sure you want to delete all ${myLetters.length} of your letters? This action cannot be undone.`;
        bulkDeleteModal.style.display = 'flex';
        bulkDeleteModal.setAttribute('data-delete-type', 'all');
    }

    async function deleteBulkLetters() {
        const selectedCheckboxes = document.querySelectorAll('.letter-checkbox:checked');
        const letterIds = Array.from(selectedCheckboxes).map(checkbox =>
            parseInt(checkbox.getAttribute('data-letter-id'))
        );

        try {
            const response = await fetch('backend/api/posts.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=delete_bulk_posts&post_ids=${letterIds.join(',')}`
            });
            const result = await response.json();

            if (result.status === 'success') {
                showToast(`${letterIds.length} letter${letterIds.length > 1 ? 's' : ''} deleted successfully`);
                refreshAllSections();
            } else {
                alert('Failed to delete letters: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting bulk letters:', error);
            alert('An error occurred while deleting the letters.');
        }
    }

    async function deleteAllMyLetters() {
        try {
            const response = await fetch('backend/api/posts.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=delete_all_my_posts'
            });
            const result = await response.json();

            if (result.status === 'success') {
                showToast('All your letters have been deleted');
                refreshAllSections();
            } else {
                alert('Failed to delete all letters: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting all letters:', error);
            alert('An error occurred while deleting all letters.');
        }
    }

    function updateLettersCount(count) {
        const countElement = document.getElementById('my-letters-count');
        if (countElement) {
            countElement.textContent = `${count} letter${count !== 1 ? 's' : ''}`;
        }
    }

    async function updateClearAllButton() {
        const clearAllBtn = document.getElementById('clear-all-btn');

        try {
            const response = await fetch('backend/api/posts.php?action=get_my_posts');
            const result = await response.json();

            if (result.status === 'success') {
                const myLetters = result.posts || [];
                if (clearAllBtn) {
                    clearAllBtn.disabled = myLetters.length === 0;
                }
            } else {
                console.error('Error checking my letters count:', result.message);
                if (clearAllBtn) {
                    clearAllBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Error fetching my letters count:', error);
            if (clearAllBtn) {
                clearAllBtn.disabled = true;
            }
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function editLetter(letterId) {
        // Basic edit functionality
        const letters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
        const letter = letters.find(l => l.id === letterId);
        
        if (letter) {
            document.querySelector('#submit').scrollIntoView({ behavior: 'smooth' });
            showToast('Edit functionality coming soon! For now, please create a new letter.');
        }
    }

    function showDeleteModal(letterId, source = 'read') {
        const deleteModal = document.getElementById('delete-modal');
        if (!deleteModal) {
            console.error('Delete modal not found!');
            return;
        }
        deleteModal.setAttribute('data-letter-id', letterId);
        deleteModal.setAttribute('data-source', source);
        deleteModal.style.display = 'flex';
    }

    async function deleteConfirmedLetter() {
        const deleteModal = document.getElementById('delete-modal');
        const letterId = parseInt(deleteModal.getAttribute('data-letter-id'));
        const source = deleteModal.getAttribute('data-source');

        try {
            const response = await fetch('backend/api/posts.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=delete_post&post_id=${letterId}`
            });
            const result = await response.json();

            if (result.status === 'success') {
                showToast('Letter deleted successfully');
                deleteModal.style.display = 'none';
                // Refresh both sections to ensure consistency
                refreshAllSections();
            } else {
                alert('Failed to delete letter: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting letter:', error);
            alert('An error occurred while deleting the letter.');
        }
    }



// New function to refresh both sections
function refreshAllSections() {
    // Refresh My Letters section
    loadMyLetters();
    
    // Refresh Read Letters section with current filter
    const currentFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
    filterLetters(currentFilter);
}

// Also update the saveLetter function to refresh both sections
function saveLetter(letter) {
    // Get existing letters from localStorage
    let letters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
    
    // Add new letter
    letters.unshift(letter); // Add to beginning of array
    
    // Save back to localStorage
    localStorage.setItem('whisperbox-letters', JSON.stringify(letters));
    
    // Show success modal
    if (successModal) {
        successModal.style.display = 'flex';
    }

    // Reset form
    letterForm.reset();
    charCounter.textContent = '0';
    fileName.textContent = 'No file chosen';
    imagePreview.style.display = 'none';
    imagePreview.innerHTML = '';
    categoryCards.forEach(card => card.classList.remove('selected'));
    
    // Refresh both sections
    refreshAllSections();
}

    function deleteLetter(letterId) {
        let letters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
        letters = letters.filter(letter => letter.id !== letterId);
        localStorage.setItem('whisperbox-letters', JSON.stringify(letters));
        
        showToast('Letter deleted successfully');
    }

    // Edit Post Modal Functions
    let currentEditingPostId = null;
    
    function openEditModal(post) {
        currentEditingPostId = post.id;
        
        const editModal = document.getElementById('edit-post-modal');
        const categoryMap = {
            'Joy': 'joy',
            'Sadness': 'sadness',
            'Anger': 'anger',
            'Exhaustion': 'exhaustion',
            'Reflection': 'reflection'
        };
        
        // Populate form with current post data
        document.getElementById('edit-post-id').value = post.id;
        document.getElementById('edit-category').value = categoryMap[post.category_name] || post.mood;
        document.getElementById('edit-title').value = post.title || '';
        document.getElementById('edit-content').value = post.content;
        document.getElementById('edit-char-counter').textContent = post.content.length;
        
        editModal.style.display = 'flex';
        
        // Handle form submission
        const editForm = document.getElementById('edit-post-form');
        editForm.onsubmit = submitEditPost;
        
        // Close button
        const closeBtn = document.getElementById('close-edit-modal');
        closeBtn.onclick = () => {
            editModal.style.display = 'none';
            currentEditingPostId = null;
        };
        
        // Cancel button
        const cancelBtn = document.getElementById('cancel-edit-btn');
        cancelBtn.onclick = () => {
            editModal.style.display = 'none';
            currentEditingPostId = null;
        };
        
        // Character counter for edit content
        const editContent = document.getElementById('edit-content');
        editContent.addEventListener('input', function() {
            document.getElementById('edit-char-counter').textContent = this.value.length;
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === editModal) {
                editModal.style.display = 'none';
                currentEditingPostId = null;
            }
        });
    }
    
    async function submitEditPost(e) {
        e.preventDefault();
        
        const postId = document.getElementById('edit-post-id').value;
        const category = document.getElementById('edit-category').value;
        const title = document.getElementById('edit-title').value;
        const content = document.getElementById('edit-content').value;
        
        // Validation
        if (!category) {
            showToast('Please select a category', 'error');
            return;
        }
        
        if (!content.trim()) {
            showToast('Please write something in your letter', 'error');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('id', postId);
            formData.append('title', title);
            formData.append('content', content);
            formData.append('category_id', category);
            formData.append('mood', category);
            
            const response = await fetch(`${API_BASE_URL}/posts.php`, {
                method: 'PUT',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Your letter has been updated successfully!', 'success');
                document.getElementById('edit-post-modal').style.display = 'none';
                currentEditingPostId = null;
                
                // Reload posts
                filterLetters(currentFilter);
                loadMyLetters();
            } else {
                showToast(result.message || 'Failed to update letter', 'error');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            showToast('Error updating your letter. Please try again.', 'error');
        }
    }
    
    // Delete Post Modal Functions
    let currentDeletingPostId = null;
    
    function openDeleteModal(postId) {
        currentDeletingPostId = postId;
        
        const deleteModal = document.getElementById('delete-post-modal');
        deleteModal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirm-delete-post');
        const cancelBtn = document.getElementById('cancel-delete-post');
        
        confirmBtn.onclick = submitDeletePost;
        cancelBtn.onclick = () => {
            deleteModal.style.display = 'none';
            currentDeletingPostId = null;
        };
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
                currentDeletingPostId = null;
            }
        });
    }
    
    async function submitDeletePost() {
        if (!currentDeletingPostId) return;
        
        try {
            const formData = new FormData();
            formData.append('id', currentDeletingPostId);
            
            const response = await fetch(`${API_BASE_URL}/posts.php`, {
                method: 'DELETE',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Your letter has been deleted', 'success');
                document.getElementById('delete-post-modal').style.display = 'none';
                currentDeletingPostId = null;
                
                // Reload posts
                filterLetters(currentFilter);
                loadMyLetters();
            } else {
                showToast(result.message || 'Failed to delete letter', 'error');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            showToast('Error deleting your letter. Please try again.', 'error');
        }
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

    // Setup delete modals
    function setupDeleteModals() {
        const deleteModal = document.getElementById('delete-modal');
        const bulkDeleteModal = document.getElementById('bulk-delete-modal');
        
        if (deleteModal) {
            const cancelBtn = deleteModal.querySelector('.cancel-btn');
            const confirmBtn = deleteModal.querySelector('.confirm-delete-btn');
            
            cancelBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
            
            confirmBtn.addEventListener('click', deleteConfirmedLetter);
        }
        
        if (bulkDeleteModal) {
            const bulkCancelBtn = bulkDeleteModal.querySelector('.bulk-cancel');
            const bulkConfirmBtn = bulkDeleteModal.querySelector('.bulk-confirm');
            
            bulkCancelBtn.addEventListener('click', () => {
                bulkDeleteModal.style.display = 'none';
            });
            
            bulkConfirmBtn.addEventListener('click', function() {
                const deleteType = bulkDeleteModal.getAttribute('data-delete-type');
                if (deleteType === 'bulk') {
                    deleteBulkLetters();
                } else if (deleteType === 'all') {
                    deleteAllMyLetters();
                }
                bulkDeleteModal.style.display = 'none';
            });
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
            if (e.target === bulkDeleteModal) {
                bulkDeleteModal.style.display = 'none';
            }
        });
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

    // Initialize everything
setupDeleteModals();
initMyLettersSection();
filterLetters('all'); // This will load the Read Letters section

// Make sure both sections are in sync on page load
function initializeBothSections() {
    loadMyLetters();
    filterLetters('all');
}

// Call this after DOM is fully loaded
initializeBothSections();
    
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
});