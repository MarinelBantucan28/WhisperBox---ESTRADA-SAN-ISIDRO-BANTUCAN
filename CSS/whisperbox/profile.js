// API Base URL Configuration - Global variable for dynamic API base URL
window.API_BASE_URL = null;
if (window.location.protocol === 'file:') {
    window.API_BASE_URL = null;
    console.warn('profile.js: Running from file:// — API calls will fail. Open via http://localhost/...');
} else {
    const pathDir = window.location.pathname.replace(/\/[^\/]*$/, '');
    window.API_BASE_URL = window.location.origin + pathDir + '/backend/api';
}

document.addEventListener('DOMContentLoaded', function() {
    // Use the global API_BASE_URL computed above
    const API_BASE_URL = window.API_BASE_URL;
    
    // Check authentication
    const userId = sessionStorage.getItem('user_id');
    const username = sessionStorage.getItem('username');
    const email = sessionStorage.getItem('email');
    const displayName = sessionStorage.getItem('display_name');
    const isAuthenticated = sessionStorage.getItem('user_authenticated') === 'true';
    
    if (!isAuthenticated || !userId) {
        window.location.href = 'register.html';
        return;
    }
    
    // Initialize navbar
    initializeNavbar();
    
    // Load profile data
    loadProfileData();
    loadUserPosts();
    setupEventListeners();
    
    function initializeNavbar() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        // Safe nav creation
        const li = document.createElement('li');
        li.className = 'nav-auth';
        const span = document.createElement('span');
        span.className = 'user-info';
        span.textContent = `👤 ${username}`;
        li.appendChild(span);
        const btn = document.createElement('button');
        btn.className = 'logout-btn';
        btn.id = 'logout-btn';
        btn.textContent = 'Logout';
        li.appendChild(btn);
        navMenu.appendChild(li);

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', performLogout);
        }
    }
    
    async function performLogout() {
        try {
            await fetch(`${API_BASE_URL}/logout.php`, { method: 'POST' });
            sessionStorage.clear();
            window.location.href = 'register.html';
        } catch (error) {
            console.error('Logout error:', error);
            sessionStorage.clear();
            window.location.href = 'register.html';
        }
    }
    
    function loadProfileData() {
        document.getElementById('profile-username').textContent = username;
        document.getElementById('profile-display-name').textContent = displayName || username;
        document.getElementById('settings-email').textContent = email;
        document.getElementById('settings-display-name').textContent = displayName || '(Not set)';
        document.getElementById('current-email').value = email;
        document.getElementById('new-display-name').value = displayName || '';
        
        const joinDate = new Date(sessionStorage.getItem('created_at') || new Date());
        const formattedDate = joinDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        document.getElementById('join-date').textContent = `📅 Member since: ${formattedDate}`;
    }
    
    async function loadUserPosts() {
        try {
            const response = await fetch(`${API_BASE_URL}/posts.php?action=get_my_posts&user_id=${userId}`);
            const result = await response.json();
            
            if (result.status === 'success' && result.posts) {
                const posts = result.posts;
                
                // Update stats
                document.getElementById('total-posts').textContent = posts.length;
                document.getElementById('posts-number').textContent = posts.length;
                
                // Calculate average post length
                const avgLength = posts.length > 0 
                    ? Math.round(posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length)
                    : 0;
                document.getElementById('avg-post-length').textContent = avgLength + ' chars';
                
                // Calculate days since last post
                if (posts.length > 0) {
                    const lastPostDate = new Date(posts[0].created_at);
                    const today = new Date();
                    const daysDiff = Math.floor((today - lastPostDate) / (1000 * 60 * 60 * 24));
                    document.getElementById('last-post-days').textContent = daysDiff + ' days ago';
                } else {
                    document.getElementById('last-post-days').textContent = 'Never';
                }
                
                // Calculate most used category
                const categoryCount = {};
                posts.forEach(post => {
                    const category = post.category_name || 'Unknown';
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                });
                
                const mostUsedCategory = Object.keys(categoryCount).length > 0
                    ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
                    : '--';
                document.getElementById('most-used-category').textContent = mostUsedCategory;
                
                // Display category breakdown
                displayCategoryBreakdown(categoryCount);
                
                // Display recent posts (last 3)
                displayRecentPosts(posts.slice(0, 3));
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            document.getElementById('recent-posts-grid').innerHTML = '<p>Error loading posts. Please try again.</p>';
        }
    }
    
    function displayCategoryBreakdown(categoryCount) {
        const breakdown = document.getElementById('category-breakdown');
        const total = Object.values(categoryCount).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            breakdown.innerHTML = '';
            const p = document.createElement('p');
            p.textContent = 'No posts yet. Start sharing your thoughts!';
            breakdown.appendChild(p);
            return;
        }

        breakdown.innerHTML = '';
        Object.entries(categoryCount).forEach(([category, count]) => {
            const percentage = Math.round((count / total) * 100);
            const stat = document.createElement('div');
            stat.className = 'category-stat';

            const header = document.createElement('div');
            header.className = 'category-stat-header';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-name';
            nameSpan.textContent = category;
            const countSpan = document.createElement('span');
            countSpan.className = 'category-count';
            countSpan.textContent = `${count} posts`;
            header.appendChild(nameSpan);
            header.appendChild(countSpan);

            const bar = document.createElement('div');
            bar.className = 'category-bar';
            const fill = document.createElement('div');
            fill.className = 'category-bar-fill';
            fill.style.width = `${percentage}%`;
            bar.appendChild(fill);

            const perc = document.createElement('div');
            perc.className = 'category-percentage';
            perc.textContent = `${percentage}%`;

            stat.appendChild(header);
            stat.appendChild(bar);
            stat.appendChild(perc);
            breakdown.appendChild(stat);
        });
    }
    
    function displayRecentPosts(posts) {
        const grid = document.getElementById('recent-posts-grid');
        
        if (posts.length === 0) {
            grid.innerHTML = '';
            const p = document.createElement('p');
            p.innerHTML = 'No posts yet. <a href="index.html#submit">Share your first thought</a>!';
            grid.appendChild(p);
            return;
        }

        grid.innerHTML = '';
        const categoryEmojis = {
            'Joy': '😊',
            'Sadness': '😢',
            'Anger': '😠',
            'Exhaustion': '😴',
            'Reflection': '🤔'
        };

        posts.forEach(post => {
            const date = new Date(post.created_at).toLocaleDateString();
            const emoji = categoryEmojis[post.category_name] || '📝';

            const card = document.createElement('div');
            card.className = 'recent-post-card';

            const catDiv = document.createElement('div');
            catDiv.className = 'recent-post-category';
            catDiv.textContent = `${emoji} ${post.category_name}`;
            card.appendChild(catDiv);

            if (post.title) {
                const h = document.createElement('h3');
                h.className = 'recent-post-title';
                h.textContent = post.title;
                card.appendChild(h);
            }

            const excerpt = document.createElement('p');
            excerpt.className = 'recent-post-excerpt';
            const snippet = (post.content || '').substring(0, 100);
            excerpt.textContent = snippet + ((post.content || '').length > 100 ? '...' : '');
            card.appendChild(excerpt);

            const dateDiv = document.createElement('div');
            dateDiv.className = 'recent-post-date';
            dateDiv.textContent = date;
            card.appendChild(dateDiv);

            grid.appendChild(card);
        });
    }
    
    function setupEventListeners() {
        // Mobile menu
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }
        
        // Modal handlers
        setupModalHandlers('edit-display-name', 'edit-display-name-form', submitDisplayNameChange);
        setupModalHandlers('edit-email', 'edit-email-form', submitEmailChange);
        setupModalHandlers('change-password', 'change-password-form', submitPasswordChange);
        setupModalHandlers('delete-account', null, null, true);
        
        // Delete account confirmation
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        const cancelDeleteAccount = document.getElementById('cancel-delete-account');
        const confirmDeleteAccount = document.getElementById('confirm-delete-account');
        
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                document.getElementById('delete-account-modal').style.display = 'flex';
            });
        }
        
        if (cancelDeleteAccount) {
            cancelDeleteAccount.addEventListener('click', () => {
                document.getElementById('delete-account-modal').style.display = 'none';
            });
        }
        
        if (confirmDeleteAccount) {
            confirmDeleteAccount.addEventListener('click', submitDeleteAccount);
        }
    }
    
    function setupModalHandlers(modalName, formId, submitHandler, isConfirmModal = false) {
        const modalId = `${modalName}-modal`;
        const modal = document.getElementById(modalId);
        const closeBtn = modal?.querySelector('.close-modal');
        const cancelBtn = modal?.querySelector('.cancel-btn');
        const openBtn = document.getElementById(`${modalName}-btn`);
        const form = formId ? document.getElementById(formId) : null;
        
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (form && submitHandler) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                submitHandler();
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    async function submitDisplayNameChange() {
        const newDisplayName = document.getElementById('new-display-name').value.trim();
        
        if (!newDisplayName) {
            showToast('Please enter a display name', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_display_name',
                    display_name: newDisplayName
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                sessionStorage.setItem('display_name', newDisplayName);
                showToast('Display name updated successfully!', 'success');
                document.getElementById('edit-display-name-modal').style.display = 'none';
                loadProfileData();
            } else {
                showToast(result.message || 'Failed to update display name', 'error');
            }
        } catch (error) {
            console.error('Error updating display name:', error);
            showToast('Error updating display name', 'error');
        }
    }
    
    async function submitEmailChange() {
        const newEmail = document.getElementById('new-email').value.trim();
        const password = document.getElementById('confirm-password-email').value;
        
        if (!newEmail || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (!validateEmail(newEmail)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_email',
                    email: newEmail,
                    password: password
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                sessionStorage.setItem('email', newEmail);
                showToast('Email updated successfully!', 'success');
                document.getElementById('edit-email-modal').style.display = 'none';
                loadProfileData();
            } else {
                showToast(result.message || 'Failed to update email', 'error');
            }
        } catch (error) {
            console.error('Error updating email:', error);
            showToast('Error updating email', 'error');
        }
    }
    
    async function submitPasswordChange() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'change_password',
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Password changed successfully!', 'success');
                document.getElementById('change-password-modal').style.display = 'none';
                document.getElementById('change-password-form').reset();
            } else {
                showToast(result.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showToast('Error changing password', 'error');
        }
    }
    
    async function submitDeleteAccount() {
        if (!confirm('Are you absolutely sure? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_account'
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Account deleted. Redirecting...', 'success');
                sessionStorage.clear();
                setTimeout(() => {
                    window.location.href = 'register.html';
                }, 1500);
            } else {
                showToast(result.message || 'Failed to delete account', 'error');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            showToast('Error deleting account', 'error');
        }
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function showToast(message, type = 'success') {
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        let backgroundColor = '#28a745';
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
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
});
