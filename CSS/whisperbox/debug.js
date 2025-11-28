/**
 * WhisperBox Debug Helper
 * 
 * Add this script to index.html's head temporarily for debugging:
 * <script src="debug.js" defer></script>
 * 
 * Then open browser console and run:
 * debugWhisperBox();
 * 
 * This will test all key functionality
 */

// Ensure API_BASE_URL is global (computed in script.js)
if (!window.API_BASE_URL) {
    if (window.location.protocol === 'file:') {
        window.API_BASE_URL = null;
    } else {
        const pathDir = window.location.pathname.replace(/\/[^\/]*$/, '');
        window.API_BASE_URL = window.location.origin + pathDir + '/backend/api';
    }
}

async function debugWhisperBox() {
    console.log('=== WhisperBox Debug Test Started ===\n');
    
    const API_BASE_URL = window.API_BASE_URL;
    const tests = [];
    
    // Test 1: Check authentication state
    console.log('TEST 1: Authentication State');
    const userId = sessionStorage.getItem('user_id');
    const isAuth = sessionStorage.getItem('user_authenticated') === 'true';
    console.log('  User ID:', userId || 'Not authenticated');
    console.log('  Authenticated:', isAuth);
    tests.push({ name: 'Auth State', passed: true });
    
    // Test 2: Check if API is reachable
    console.log('\nTEST 2: API Reachability');
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php?action=get_all_posts&page=1&per_page=1`);
        const data = await response.json();
        console.log('  Status:', response.status);
        console.log('  Response status:', data.status);
        const passed = response.status === 200 && data.status === 'success';
        console.log('  ✓ API is reachable' + (passed ? '' : ' (with issues)'));
        tests.push({ name: 'API Reachability', passed });
    } catch (err) {
        console.error('  ✗ API Error:', err.message);
        tests.push({ name: 'API Reachability', passed: false });
    }
    
    // Test 3: Check post structure
    console.log('\nTEST 3: Post Structure');
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php?action=get_all_posts&page=1&per_page=1`);
        const data = await response.json();
        
        if (data.posts && data.posts.length > 0) {
            const post = data.posts[0];
            console.log('  Sample Post Fields:');
            console.log('    - id:', post.id, typeof post.id);
            console.log('    - title:', post.title ? post.title.substring(0, 30) + '...' : '(none)');
            console.log('    - category:', post.category, '(should be string like "joy", "sadness")');
            console.log('    - content:', post.content ? post.content.substring(0, 30) + '...' : '(empty)');
            console.log('    - created_at:', post.created_at);
            console.log('    - author_user_id:', post.author_user_id);
            
            const hasRequiredFields = post.id && post.content && post.category !== undefined;
            console.log('  ✓ Required fields present:', hasRequiredFields);
            tests.push({ name: 'Post Structure', passed: hasRequiredFields });
        } else {
            console.log('  ⚠ No posts in database');
            tests.push({ name: 'Post Structure', passed: true, note: 'No posts' });
        }
    } catch (err) {
        console.error('  ✗ Error:', err.message);
        tests.push({ name: 'Post Structure', passed: false });
    }
    
    // Test 4: Check bookmarks initialization
    console.log('\nTEST 4: Bookmarks Initialization');
    console.log('  window.bookmarkedPostIds type:', typeof window.bookmarkedPostIds);
    console.log('  Is Set?', window.bookmarkedPostIds instanceof Set);
    console.log('  Size:', window.bookmarkedPostIds?.size || 0);
    const bookmarksPassed = window.bookmarkedPostIds instanceof Set;
    console.log('  ✓ Bookmarks initialized:', bookmarksPassed);
    tests.push({ name: 'Bookmarks Init', passed: bookmarksPassed });
    
    // Test 5: Check DOM elements
    console.log('\nTEST 5: DOM Elements');
    const lettersGrid = document.querySelector('.letters-grid');
    const pagination = document.getElementById('pagination');
    const filterBtns = document.querySelectorAll('.filter-btn');
    console.log('  - .letters-grid exists:', !!lettersGrid);
    console.log('  - #pagination exists:', !!pagination);
    console.log('  - .filter-btn count:', filterBtns.length);
    const domPassed = lettersGrid && pagination && filterBtns.length > 0;
    console.log('  ✓ DOM ready:', domPassed);
    tests.push({ name: 'DOM Ready', passed: domPassed });
    
    // Test 6: Pagination metadata
    console.log('\nTEST 6: Pagination Metadata');
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php?action=get_all_posts&page=1&per_page=10`);
        const data = await response.json();
        console.log('  - total_count:', data.total_count);
        console.log('  - page:', data.page);
        console.log('  - per_page:', data.per_page);
        console.log('  - posts returned:', data.posts?.length);
        const pagPassed = data.total_count !== undefined && data.page !== undefined;
        console.log('  ✓ Pagination metadata present:', pagPassed);
        tests.push({ name: 'Pagination', passed: pagPassed });
    } catch (err) {
        console.error('  ✗ Error:', err.message);
        tests.push({ name: 'Pagination', passed: false });
    }
    
    // Summary
    console.log('\n=== Debug Test Summary ===');
    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;
    console.log(`✓ Passed: ${passed}/${total}`);
    
    tests.forEach(t => {
        const icon = t.passed ? '✓' : '✗';
        const note = t.note ? ` (${t.note})` : '';
        console.log(`  ${icon} ${t.name}${note}`);
    });
    
    if (passed === total) {
        console.log('\n✓✓✓ All tests passed! The issue should be fixed. ✓✓✓');
    } else {
        console.log('\n⚠ Some tests failed. Check details above.');
    }
}

// Auto-run if debug mode is enabled
if (window.location.hash === '#debug') {
    document.addEventListener('DOMContentLoaded', debugWhisperBox);
}

console.log('Debug helper loaded. Run: debugWhisperBox() or open page with #debug hash');
