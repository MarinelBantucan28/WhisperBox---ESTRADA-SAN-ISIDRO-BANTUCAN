document.addEventListener('DOMContentLoaded', function() {
    console.log('WhisperBox initialized!');

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
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
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

    // Letter Form Submission
    const letterForm = document.getElementById('letter-form');
    const successModal = document.getElementById('success-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalButton = document.querySelector('.modal-button');
    
    if (letterForm) {
        letterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            const category = document.getElementById('category').value;
            const content = document.getElementById('content').value;
            const terms = document.getElementById('terms').checked;
            
            if (!category) {
                alert('Please select an emotion category.');
                return;
            }
            
            if (!content.trim()) {
                alert('Please write your letter.');
                return;
            }
            
            if (content.length > 2000) {
                alert('Your letter exceeds the 2000 character limit.');
                return;
            }
            
            if (!terms) {
                alert('Please agree to the terms before submitting.');
                return;
            }
            
            // Create a new letter object
            const newLetter = {
                id: Date.now(), // Simple ID generation
                category: category,
                title: document.getElementById('title').value,
                content: content,
                image: null,
                date: new Date().toISOString().split('T')[0]
            };
            
            // Handle image upload if present
            const imageFile = document.getElementById('image-upload').files[0];
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    newLetter.image = e.target.result;
                    saveLetter(newLetter);
                };
                reader.readAsDataURL(imageFile);
            } else {
                saveLetter(newLetter);
            }
        });
    }
    
    // Function to save letter to localStorage and update display
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
        
        // Update letters display
        filterLetters('all');
        // Also update My Letters section
        loadMyLetters();
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
    
    // Sample Data for Letters
    const sampleLetters = [
        {
            id: 1,
            category: 'joy',
            title: 'A Small Victory',
            content: 'Today I finally finished a project I\'ve been working on for months. It felt amazing to see it all come together. Sometimes the small wins are what keep us going.',
            image: null,
            date: '2023-10-15'
        },
        {
            id: 2,
            category: 'sadness',
            title: 'Missing You',
            content: 'It\'s been a year since you left, and not a day goes by that I don\'t think about you. I wish I could tell you about everything that\'s happened.',
            image: null,
            date: '2023-10-12'
        },
        {
            id: 3,
            category: 'reflection',
            title: 'On Growing Older',
            content: 'I turned 30 last week and have been thinking a lot about what it means to be an adult. I don\'t feel as grown up as I thought I would at this age.',
            image: null,
            date: '2023-10-08'
        },
        {
            id: 4,
            category: 'exhaustion',
            title: 'Just Tired',
            content: 'Work has been overwhelming lately. I feel like I\'m running on empty and don\'t know how to recharge. Maybe I just need a good night\'s sleep.',
            image: null,
            date: '2023-10-05'
        },
        {
            id: 5,
            category: 'anger',
            title: 'Frustrated with Injustice',
            content: 'I saw something unfair happen today and it made me so angry. Why do some people think they can treat others poorly without consequences?',
            image: null,
            date: '2023-10-01'
        },
        {
            id: 6,
            category: 'joy',
            title: 'Unexpected Kindness',
            content: 'A stranger paid for my coffee today when I was having a rough morning. It completely turned my day around. Small acts of kindness really do matter.',
            image: null,
            date: '2023-09-28'
        }
    ];
    
    // Initialize with sample data if no data exists
    if (!localStorage.getItem('whisperbox-letters')) {
        localStorage.setItem('whisperbox-letters', JSON.stringify(sampleLetters));
    }

    // Function to filter and display letters in Read section
    function filterLetters(filter) {
        const allLetters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
        const filteredLetters = filter === 'all' ? allLetters : allLetters.filter(letter => letter.category === filter);
        
        const lettersGrid = document.querySelector('.letters-grid');
        if (lettersGrid) {
            if (filteredLetters.length === 0) {
                lettersGrid.innerHTML = '<div class="no-letters"><p>No letters found in this category. Be the first to share!</p></div>';
            } else {
                lettersGrid.innerHTML = '';
                
                filteredLetters.forEach(letter => {
                    const letterCard = document.createElement('div');
                    letterCard.className = 'letter-card';
                    letterCard.setAttribute('data-letter-id', letter.id);
                    letterCard.setAttribute('data-category', letter.category);
                    
                    const categoryNames = {
                        'joy': 'Joy',
                        'sadness': 'Sadness',
                        'anger': 'Anger',
                        'exhaustion': 'Exhaustion',
                        'reflection': 'Reflection'
                    };
                    
                    letterCard.innerHTML = `
                        <div class="letter-category">${categoryNames[letter.category]}</div>
                        ${letter.title ? `<h3 class="letter-title">${letter.title}</h3>` : ''}
                        <div class="letter-content">
                            <p>${letter.content}</p>
                        </div>
                        ${letter.image ? `
                        <div class="letter-image">
                            <img src="${letter.image}" alt="Letter image">
                        </div>
                        ` : ''}
                        <div class="letter-date">${letter.date}</div>
                    `;
                    
                    lettersGrid.appendChild(letterCard);
                });
            }
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

    function loadMyLetters() {
        const myLetters = getMyLetters();
        displayMyLetters(myLetters);
        updateLettersCount(myLetters.length);
        updateClearAllButton();
    }

    function getMyLetters() {
        return JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
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
            
            letterCard.innerHTML = `
                <input type="checkbox" class="letter-checkbox" data-letter-id="${letter.id}">
                <div class="letter-header">
                    <div class="letter-meta">
                        <div class="letter-identifier">ID: ${letter.id}</div>
                        <div class="letter-category" style="border-left-color: ${categoryColors[letter.category]}">
                            ${categoryNames[letter.category]}
                        </div>
                        ${letter.title ? `<h3 class="letter-title">${letter.title}</h3>` : ''}
                    </div>
                    <div class="letter-actions">
                        <button class="edit-btn" data-letter-id="${letter.id}">
                            ✏️ Edit
                        </button>
                        <button class="delete-btn" data-letter-id="${letter.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="letter-content">
                    <p>${letter.content}</p>
                </div>
                ${letter.image ? `
                <div class="letter-image">
                    <img src="${letter.image}" alt="Letter image">
                </div>
                ` : ''}
                <div class="letter-date">Submitted on ${formatDate(letter.date)}</div>
            `;
            
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

    function deleteBulkLetters() {
        const selectedCheckboxes = document.querySelectorAll('.letter-checkbox:checked');
        const letterIds = Array.from(selectedCheckboxes).map(checkbox => 
            parseInt(checkbox.getAttribute('data-letter-id'))
        );
        
        let letters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
        letters = letters.filter(letter => !letterIds.includes(letter.id));
        localStorage.setItem('whisperbox-letters', JSON.stringify(letters));
        
        showToast(`${letterIds.length} letter${letterIds.length > 1 ? 's' : ''} deleted successfully`);
        loadMyLetters();
    }

    function deleteAllMyLetters() {
        localStorage.removeItem('whisperbox-letters');
        showToast('All your letters have been deleted');
        loadMyLetters();
    }

    function updateLettersCount(count) {
        const countElement = document.getElementById('my-letters-count');
        if (countElement) {
            countElement.textContent = `${count} letter${count !== 1 ? 's' : ''}`;
        }
    }

    function updateClearAllButton() {
        const clearAllBtn = document.getElementById('clear-all-btn');
        const myLetters = getMyLetters();
        
        if (clearAllBtn) {
            clearAllBtn.disabled = myLetters.length === 0;
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

    function deleteConfirmedLetter() {
    const deleteModal = document.getElementById('delete-modal');
    const letterId = parseInt(deleteModal.getAttribute('data-letter-id'));
    const source = deleteModal.getAttribute('data-source');
    
    deleteLetter(letterId);
    deleteModal.style.display = 'none';
    
    // Refresh both sections to ensure consistency
    refreshAllSections();
}

function deleteBulkLetters() {
    const selectedCheckboxes = document.querySelectorAll('.letter-checkbox:checked');
    const letterIds = Array.from(selectedCheckboxes).map(checkbox => 
        parseInt(checkbox.getAttribute('data-letter-id'))
    );
    
    let letters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
    letters = letters.filter(letter => !letterIds.includes(letter.id));
    localStorage.setItem('whisperbox-letters', JSON.stringify(letters));
    
    showToast(`${letterIds.length} letter${letterIds.length > 1 ? 's' : ''} deleted successfully`);
    
    // Refresh both sections
    refreshAllSections();
}

function deleteAllMyLetters() {
    localStorage.removeItem('whisperbox-letters');
    showToast('All your letters have been deleted');
    
    // Refresh both sections
    refreshAllSections();
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

    // Toast notifications
    function showToast(message) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--success-color);
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