# WhisperBox Smoke Test Suite

## Overview

Comprehensive automated test suite for WhisperBox API endpoints. Validates all core functionality including POST creation, retrieval, filtering, pagination, and bookmarks.

## Test Coverage

### Connectivity Tests
- ✓ API endpoint reachability (`http://localhost/whisperbox...`)
- ✓ MySQL database connection
- ✓ Required database tables exist (posts, bookmarks)

### Functional Tests
- **Post Creation**: Create guest post with title, content, category, mood, tags
- **Post Retrieval**: Fetch all posts with pagination metadata
- **Category Filter**: Filter posts by category (joy, sadness, anger, etc.)
- **Date Range Filter**: Filter posts within date range (YYYY-MM-DD format)
- **Date Validation**: Error handling for invalid date formats
- **Pagination**: Verify page 1 vs page 2 return different posts
- **Bookmarks Auth**: Verify unauthorized users cannot bookmark
- **Bookmark Validation**: Error handling for invalid post IDs

## Prerequisites

1. **XAMPP Running**
   - Apache (port 80)
   - MySQL (port 3306)
   - PHP 7.4+

2. **Database Setup**
   - WhisperBox database created
   - Core tables: `posts`, `users`, `bookmarks`
   - If `bookmarks` table missing, run: `backend/config/create_bookmarks_table.sql`

3. **PHP CLI**
   - PHP command-line interface available
   - cURL extension enabled

## Running Tests

### Windows (Recommended)

From the `CSS/whisperbox/` directory:

```batch
run_tests.bat
```

The batch script will:
1. Verify PHP is installed
2. Locate the smoke_test.php file
3. Execute all tests
4. Display results with pass/fail summary

### Manual (Any OS)

```bash
php backend/tests/smoke_test.php
```

### From PHP (Programmatic)

```php
<?php
include 'backend/tests/smoke_test.php';
?>
```

## Output Format

Tests produce colored terminal output:

```
============================================================
WhisperBox Smoke Test Suite
============================================================

[TEST] API Endpoint Reachability
  ✓ API Base URL reachable

[TEST] Database Connection
  ✓ MySQL connection successful
  ✓ Posts table exists
  ✓ Bookmarks table exists

[TEST] Create Guest Post
  ✓ Status 200 or 201
  ✓ Response has success status
  ✓ Response contains post_id

...

============================================================
Test Summary
============================================================
Total Tests: 35
Passed: 35
Failed: 0
============================================================
```

**Color Legend:**
- 🟢 **Green** = Test passed
- 🔴 **Red** = Test failed
- 🟡 **Yellow** = Warning/details

## Configuration

Edit `smoke_test.php` to adjust:

```php
define('API_BASE', 'http://localhost/whisperbox...');
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'whisperbox');
```

## Common Issues & Troubleshooting

### "PHP is not installed or not in PATH"
**Solution**: Install PHP or add `C:\xampp\php` to your system PATH
- Edit System Environment Variables → Path → Add `C:\xampp\php`
- Restart terminal/command prompt

### "API Base URL reachable - FAILED"
**Solution**: Verify Apache is running
- Open XAMPP Control Panel
- Start Apache
- Check `http://localhost` loads

### "MySQL connection successful - FAILED"
**Solution**: Verify MySQL is running and credentials are correct
- Open XAMPP Control Panel
- Start MySQL
- Default: user=`root`, password=`` (empty)

### "Bookmarks table exists - FAILED"
**Solution**: Run the bookmarks migration
```bash
mysql -u root -p whisperbox < backend/config/create_bookmarks_table.sql
```

### "Status 401 (Unauthorized) - FAILED"
**Expected behavior** for unauthenticated bookmark test. This is intentional—the API correctly rejects unauthorized bookmark requests.

## Test Details

### Test 1: Create Guest Post
- **Endpoint**: POST `/backend/api/posts.php`
- **Action**: `create_guest_post`
- **Fields**: title, content, category_id, mood, tags
- **Expected**: HTTP 200/201, post_id returned

### Test 2: Get All Posts
- **Endpoint**: GET `/backend/api/posts.php`
- **Action**: `get_posts`
- **Params**: page, per_page
- **Expected**: Array of posts, pagination metadata (total_count, page, per_page)

### Test 3: Filter by Category
- **Endpoint**: GET `/backend/api/posts.php`
- **Action**: `get_posts`
- **Params**: category, page, per_page
- **Expected**: Posts filtered by category

### Test 4: Filter by Date Range
- **Endpoint**: GET `/backend/api/posts.php`
- **Action**: `get_posts`
- **Params**: from (YYYY-MM-DD), to (YYYY-MM-DD), page, per_page
- **Expected**: Posts within date range

### Test 5: Invalid Date Range
- **Endpoint**: GET `/backend/api/posts.php`
- **Params**: from='not-a-date', to='also-not-a-date'
- **Expected**: HTTP 400, error message

### Test 6: Pagination
- **Endpoint**: GET `/backend/api/posts.php` (pages 1 & 2)
- **Params**: page, per_page
- **Expected**: Page 1 and Page 2 have different posts

### Test 7: Bookmarks (Unauthenticated)
- **Endpoint**: POST `/backend/api/posts.php`
- **Action**: `add_bookmark`
- **Expected**: HTTP 401 (Unauthorized) — intended behavior

### Test 8: Bookmark Invalid Post ID
- **Endpoint**: POST `/backend/api/posts.php`
- **Action**: `add_bookmark`
- **Params**: post_id=null
- **Expected**: HTTP 400 or 401, error message

## Exit Codes

- **0** = All tests passed ✓
- **1** = One or more tests failed ✗

Use exit code in CI/CD pipelines:

```batch
run_tests.bat
if %ERRORLEVEL% EQU 0 (
    echo Deployment approved
    REM Deploy to production
) else (
    echo Tests failed - deployment blocked
)
```

## Extending Tests

Add new tests by creating functions with this pattern:

```php
function test_new_feature() {
    print_color("\n[TEST] New Feature Name", COLOR_BLUE);
    
    $response = make_request('GET', 'posts.php', [
        'action' => 'your_action',
        'param' => 'value'
    ]);
    
    assert_test(
        'Test description',
        $response['status'] === 200,
        "Got status: {$response['status']}"
    );
}
```

Then call from `run_all_tests()`:

```php
test_new_feature();
```

## Performance

- **Execution Time**: ~5-10 seconds (depends on network and DB)
- **Test Count**: 35+ assertions
- **Network Requests**: 10+ API calls

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Smoke Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Smoke Tests
        run: run_tests.bat
        working-directory: CSS/whisperbox
```

## Support

- Review output for specific failure details
- Check `backend/api/posts.php` error responses
- Verify database schema matches expected structure
- Ensure test configuration matches your XAMPP paths

## Version

- **Version**: 1.0
- **Created**: 2025
- **Tested On**: Windows 10+, XAMPP 8.0+, PHP 7.4+

---

**Next Steps**: 
1. Run `run_tests.bat` to verify all endpoints
2. Fix any failing tests
3. Consider adding authenticated bookmark tests with session management
4. Add performance benchmarks for pagination with large datasets
