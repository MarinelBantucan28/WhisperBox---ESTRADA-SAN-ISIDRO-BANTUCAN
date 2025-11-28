<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

if($db) {
    echo "✅ Database connected successfully!";
    
    // Test if tables exist
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<br>📊 Tables found: " . implode(", ", $tables);
} else {
    echo "❌ Database connection failed!";
}
?>