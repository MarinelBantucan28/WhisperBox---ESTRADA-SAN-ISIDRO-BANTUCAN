<?php
/**
 * WhisperBox Smoke Test Suite
 * 
 * Tests core API endpoints: posts (create, read, filter, paginate, bookmark)
 * Run from CLI: php smoke_test.php
 * 
 * Requirements:
 * - Running XAMPP/local MySQL server with WhisperBox database
 * - PHP CLI with curl extension
 */

// Configuration
define('API_BASE', 'http://localhost/whisperbox%20git%20clone/WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN/CSS/whisperbox/backend/api');
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'whisperbox');

// Test results tracking
$tests_run = 0;
$tests_passed = 0;
$tests_failed = 0;
$test_results = [];

// ANSI color codes for terminal output
const COLOR_GREEN = "\033[92m";
const COLOR_RED = "\033[91m";
const COLOR_YELLOW = "\033[93m";
const COLOR_RESET = "\033[0m";
const COLOR_BLUE = "\033[94m";

/**
 * Print colored output
 */
function print_color($text, $color) {
    echo $color . $text . COLOR_RESET . "\n";
}

/**
 * Make HTTP request
 */
function make_request($method, $endpoint, $data = null, $session_id = null) {
    $url = API_BASE . '/' . $endpoint;
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    // Add session cookie if available
    if ($session_id) {
        curl_setopt($ch, CURLOPT_COOKIE, 'PHPSESSID=' . $session_id);
    }
    
    if ($method === 'POST' && $data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    } elseif ($method === 'GET' && $data) {
        $url .= '?' . http_build_query($data);
        curl_setopt($ch, CURLOPT_URL, $url);
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'status' => $http_code,
        'body' => $response ? json_decode($response, true) : null,
        'raw' => $response,
        'error' => $error
    ];
}

/**
 * Assert test condition
 */
function assert_test($test_name, $condition, $details = '') {
    global $tests_run, $tests_passed, $tests_failed, $test_results;
    $tests_run++;
    
    if ($condition) {
        $tests_passed++;
        print_color("  ✓ $test_name", COLOR_GREEN);
    } else {
        $tests_failed++;
        print_color("  ✗ $test_name", COLOR_RED);
        if ($details) {
            print_color("    Details: $details", COLOR_YELLOW);
        }
    }
    $test_results[] = ['name' => $test_name, 'passed' => $condition, 'details' => $details];
}

/**
 * Test 1: POST - Create guest post
 */
function test_create_guest_post() {
    print_color("\n[TEST] Create Guest Post", COLOR_BLUE);
    
    $data = [
        'action' => 'create_guest_post',
        'title' => 'Test Guest Letter',
        'content' => 'This is a test guest post for smoke testing.',
        'category_id' => 'sadness',
        'mood' => 'sadness',
        'tags' => 'test,smoke'
    ];
    
    $response = make_request('POST', 'posts.php', $data);
    
    assert_test(
        'Status 200 or 201',
        in_array($response['status'], [200, 201]),
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response has success status',
        isset($response['body']['status']) && $response['body']['status'] === 'success',
        json_encode($response['body'] ?? [])
    );
    
    assert_test(
        'Response contains post_id',
        isset($response['body']['post_id']) && $response['body']['post_id'] > 0,
        'post_id: ' . ($response['body']['post_id'] ?? 'missing')
    );
    
    return $response['body']['post_id'] ?? null;
}

/**
 * Test 2: GET - Fetch all posts
 */
function test_get_all_posts() {
    print_color("\n[TEST] Get All Posts", COLOR_BLUE);
    
    $response = make_request('GET', 'posts.php', [
        'action' => 'get_all_posts',
        'page' => 1,
        'per_page' => 10
    ]);
    
    assert_test(
        'Status 200',
        $response['status'] === 200,
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response has success status',
        isset($response['body']['status']) && $response['body']['status'] === 'success',
        json_encode($response['body'] ?? [])
    );
    
    assert_test(
        'Response contains posts array',
        isset($response['body']['posts']) && is_array($response['body']['posts']),
        'posts type: ' . gettype($response['body']['posts'] ?? null)
    );
    
    assert_test(
        'Response contains pagination metadata',
        isset($response['body']['total_count']) && isset($response['body']['page']),
        'total_count: ' . ($response['body']['total_count'] ?? 'missing')
    );
    
    return $response['body']['posts'] ?? [];
}

/**
 * Test 3: GET - Filter by category
 */
function test_filter_by_category() {
    print_color("\n[TEST] Filter Posts by Category", COLOR_BLUE);
    
    $response = make_request('GET', 'posts.php', [
        'action' => 'get_posts',
        'category' => 'joy',
        'page' => 1,
        'per_page' => 5
    ]);
    
    assert_test(
        'Status 200',
        $response['status'] === 200,
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response has success status',
        isset($response['body']['status']) && $response['body']['status'] === 'success',
        json_encode($response['body'] ?? [])
    );
    
    assert_test(
        'Response contains posts array',
        isset($response['body']['posts']) && is_array($response['body']['posts']),
        'posts type: ' . gettype($response['body']['posts'] ?? null)
    );
}

/**
 * Test 4: GET - Filter by date range
 */
function test_filter_by_date_range() {
    print_color("\n[TEST] Filter Posts by Date Range", COLOR_BLUE);
    
    $from = date('Y-m-d', strtotime('-30 days'));
    $to = date('Y-m-d');
    
    $response = make_request('GET', 'posts.php', [
        'action' => 'get_posts',
        'from' => $from,
        'to' => $to,
        'page' => 1,
        'per_page' => 10
    ]);
    
    assert_test(
        'Status 200',
        $response['status'] === 200,
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response has success status',
        isset($response['body']['status']) && $response['body']['status'] === 'success',
        json_encode($response['body'] ?? [])
    );
    
    assert_test(
        'Response contains posts array',
        isset($response['body']['posts']) && is_array($response['body']['posts']),
        'posts type: ' . gettype($response['body']['posts'] ?? null)
    );
}

/**
 * Test 5: Invalid date range
 */
function test_invalid_date_range() {
    print_color("\n[TEST] Invalid Date Range (Error Handling)", COLOR_BLUE);
    
    $response = make_request('GET', 'posts.php', [
        'action' => 'get_posts',
        'from' => 'not-a-date',
        'to' => 'also-not-a-date'
    ]);
    
    assert_test(
        'Status 400 for invalid dates',
        $response['status'] === 400,
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response contains error message',
        isset($response['body']['status']) && $response['body']['status'] === 'error',
        json_encode($response['body'] ?? [])
    );
}

/**
 * Test 6: Pagination - page 2
 */
function test_pagination() {
    print_color("\n[TEST] Pagination", COLOR_BLUE);
    
    $page1 = make_request('GET', 'posts.php', [
        'action' => 'get_posts',
        'category' => 'all',
        'page' => 1,
        'per_page' => 5
    ]);
    
    $page2 = make_request('GET', 'posts.php', [
        'action' => 'get_posts',
        'category' => 'all',
        'page' => 2,
        'per_page' => 5
    ]);
    
    assert_test(
        'Page 1 returns data',
        $page1['status'] === 200 && isset($page1['body']['posts']),
        "Status: {$page1['status']}"
    );
    
    assert_test(
        'Page 2 returns data',
        $page2['status'] === 200 && isset($page2['body']['posts']),
        "Status: {$page2['status']}"
    );
    
    // Check if results differ (if enough posts exist)
    if (isset($page1['body']['total_count']) && $page1['body']['total_count'] > 5) {
        $page1_ids = array_map(fn($p) => $p['id'], $page1['body']['posts']);
        $page2_ids = array_map(fn($p) => $p['id'], $page2['body']['posts']);
        $same_results = count(array_intersect($page1_ids, $page2_ids)) === 0;
        assert_test(
            'Page 1 and Page 2 have different posts',
            $same_results,
            'Page 1 IDs: ' . implode(',', $page1_ids) . ' | Page 2 IDs: ' . implode(',', $page2_ids)
        );
    }
}

/**
 * Test 7: Bookmarks - Unauthenticated (should fail)
 */
function test_bookmarks_unauthenticated() {
    print_color("\n[TEST] Bookmarks (Unauthenticated - Should Fail)", COLOR_BLUE);
    
    $response = make_request('POST', 'posts.php', [
        'action' => 'add_bookmark',
        'post_id' => 1
    ]);
    
    // Should fail because no session
    assert_test(
        'Status 401 (Unauthorized)',
        $response['status'] === 401,
        "Got status: {$response['status']}"
    );
    
    assert_test(
        'Response contains error',
        isset($response['body']['status']) && $response['body']['status'] === 'error',
        json_encode($response['body'] ?? [])
    );
}

/**
 * Test 8: Invalid post ID for bookmark
 */
function test_bookmark_invalid_post_id() {
    print_color("\n[TEST] Bookmark - Invalid Post ID", COLOR_BLUE);
    
    $response = make_request('POST', 'posts.php', [
        'action' => 'add_bookmark',
        'post_id' => null
    ]);
    
    assert_test(
        'Status 400 or 401',
        in_array($response['status'], [400, 401]),
        "Got status: {$response['status']}"
    );
}

/**
 * Test 9: Check database connection
 */
function test_database_connection() {
    print_color("\n[TEST] Database Connection", COLOR_BLUE);
    
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        assert_test(
            'MySQL connection successful',
            true
        );
        
        // Check tables exist
        $stmt = $pdo->query("SHOW TABLES LIKE 'posts'");
        $posts_table_exists = $stmt->rowCount() > 0;
        assert_test(
            'Posts table exists',
            $posts_table_exists
        );
        
        $stmt = $pdo->query("SHOW TABLES LIKE 'bookmarks'");
        $bookmarks_table_exists = $stmt->rowCount() > 0;
        assert_test(
            'Bookmarks table exists',
            $bookmarks_table_exists,
            'Run create_bookmarks_table.sql if missing'
        );
        
        return true;
    } catch (PDOException $e) {
        assert_test(
            'MySQL connection successful',
            false,
            'Connection failed: ' . $e->getMessage()
        );
        return false;
    }
}

/**
 * Test 10: Verify API base URL is reachable
 */
function test_api_reachable() {
    print_color("\n[TEST] API Endpoint Reachability", COLOR_BLUE);
    
    $ch = curl_init(API_BASE . '/posts.php');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    assert_test(
        'API Base URL reachable',
        !empty($http_code) && $http_code < 500,
        "HTTP Code: $http_code, Error: $error"
    );
}

/**
 * Run all smoke tests
 */
function run_all_tests() {
    print_color("\n" . str_repeat("=", 60), COLOR_BLUE);
    print_color("WhisperBox Smoke Test Suite", COLOR_BLUE);
    print_color(str_repeat("=", 60), COLOR_BLUE);
    
    // Test connectivity first
    test_api_reachable();
    test_database_connection();
    
    // Run functional tests
    $guest_post_id = test_create_guest_post();
    $all_posts = test_get_all_posts();
    test_filter_by_category();
    test_filter_by_date_range();
    test_invalid_date_range();
    test_pagination();
    test_bookmarks_unauthenticated();
    test_bookmark_invalid_post_id();
    
    // Print summary
    print_color("\n" . str_repeat("=", 60), COLOR_BLUE);
    print_color("Test Summary", COLOR_BLUE);
    print_color(str_repeat("=", 60), COLOR_BLUE);
    print_color("Total Tests: $tests_run", COLOR_BLUE);
    print_color("Passed: $tests_passed", COLOR_GREEN);
    print_color("Failed: $tests_failed", $tests_failed > 0 ? COLOR_RED : COLOR_GREEN);
    
    if ($tests_failed > 0) {
        print_color("\nFailed Tests:", COLOR_RED);
        foreach ($test_results as $result) {
            if (!$result['passed']) {
                print_color("  - {$result['name']}", COLOR_RED);
                if ($result['details']) {
                    print_color("    {$result['details']}", COLOR_YELLOW);
                }
            }
        }
    }
    
    print_color("\n" . str_repeat("=", 60), COLOR_BLUE);
    
    // Return exit code
    return $tests_failed === 0 ? 0 : 1;
}

// Run tests
$exit_code = run_all_tests();
exit($exit_code);
?>
