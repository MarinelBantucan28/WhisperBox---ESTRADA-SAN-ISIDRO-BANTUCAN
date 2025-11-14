document.addEventListener('DOMContentLoaded', function() {
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
                }
                
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
    const lettersGrid = document.querySelector('.letters-grid');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter letters (in a real app, this would fetch from a server)
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
    
    // Sample Data for Letters (in a real app, this would come from a server)
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

    // Function to filter and display letters
    function filterLetters(filter) {
        const allLetters = JSON.parse(localStorage.getItem('whisperbox-letters')) || [];
        const filteredLetters = filter === 'all' ? allLetters : allLetters.filter(letter => letter.category === filter);
        
        if (lettersGrid) {
            if (filteredLetters.length === 0) {
                lettersGrid.innerHTML = '<div class="no-letters"><p>No letters found in this category. Be the first to share!</p></div>';
            } else {
                lettersGrid.innerHTML = '';
                
                filteredLetters.forEach(letter => {
                    const letterCard = document.createElement('div');
                    letterCard.className = 'letter-card';
                    
                    const categoryNames = {
                        'joy': 'Joy',
                        'sadness': 'Sadness',
                        'anger': 'Anger',
                        'exhaustion': 'Exhaustion',
                        'reflection': 'Reflection'
                    };
                    
                    // In the filterLetters function, update the letterCard creation:
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
// Add this line after setting innerHTML:
letterCard.setAttribute('data-category', letter.category);
                    
                    lettersGrid.appendChild(letterCard);
                });
            }
        }
    }
    
    // Initialize with all letters
    filterLetters('all');
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed header
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});