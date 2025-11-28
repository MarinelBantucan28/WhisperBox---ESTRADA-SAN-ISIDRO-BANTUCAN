<?php
/**
 * Quick API Test - Check if posts are being returned correctly
 * Run this in your browser at: http://localhost/whisperbox%20git%20clone/WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN/CSS/whisperbox/backend/api/test_quick.php
 */

header('Content-Type: application/json');

require_once '../config/database.php';
require_once '../models/Post.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    $post = new Post($db);
    
    // Test 1: Get all posts
    echo "=== TEST 1: Get All Posts ===\n";
    $stmt = $post->readAll(5, 0);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($posts) > 0) {
        echo "✓ Successfully fetched " . count($posts) . " posts\n";
        echo "First post structure:\n";
        $first = $posts[0];
        echo "  - id: " . ($first['id'] ?? 'MISSING') . "\n";
        echo "  - title: " . ($first['title'] ?? 'N/A') . "\n";
        echo "  - category: " . ($first['category'] ?? 'MISSING') . "\n";
        echo "  - content: " . substr($first['content'] ?? 'MISSING', 0, 50) . "...\n";
        echo "  - created_at: " . ($first['created_at'] ?? 'MISSING') . "\n";
        echo "  - author_user_id: " . ($first['author_user_id'] ?? 'N/A') . "\n";
    } else {
        echo "⚠ No posts found in database\n";
    }
    
    // Test 2: Count posts
    echo "\n=== TEST 2: Count Posts ===\n";
    $total = $post->countAll();
    echo "Total posts in database: " . $total . "\n";
    
    // Test 3: Get by category
    echo "\n=== TEST 3: Get by Category (joy) ===\n";
    $stmt = $post->readByCategory('joy', 5, 0);
    $joy_posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Posts in 'joy' category: " . count($joy_posts) . "\n";
    if (count($joy_posts) > 0) {
        echo "✓ Sample: " . substr($joy_posts[0]['content'], 0, 50) . "...\n";
    }
    
    echo "\n✓ API is working correctly!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>
