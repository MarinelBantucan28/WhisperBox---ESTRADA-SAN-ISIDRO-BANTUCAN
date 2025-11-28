<?php
require_once 'api/config/database.php';

// Test data
$test_data = [
    'username' => 'testuser2',
    'email' => 'test2@example.com',
    'password' => 'password123',
    'display_name' => 'Test User 2'
];

$database = new Database();
$db = $database->getConnection();

if ($db) {
    // Check if we can insert a user
    $hashed_password = password_hash($test_data['password'], PASSWORD_DEFAULT);
    $query = "INSERT INTO users (username, email, password_hash, display_name) 
              VALUES (:username, :email, :password, :display_name)";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":username", $test_data['username']);
    $stmt->bindParam(":email", $test_data['email']);
    $stmt->bindParam(":password", $hashed_password);
    $stmt->bindParam(":display_name", $test_data['display_name']);
    
    if ($stmt->execute()) {
        echo "✅ User registration test passed!";
    } else {
        echo "❌ User registration failed";
    }
} else {
    echo "❌ Database connection failed";
}
?>

