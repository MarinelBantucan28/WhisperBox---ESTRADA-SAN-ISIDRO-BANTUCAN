<?php
echo "<h2>Finding MySQL Connection Settings</h2>";

$configs = [
    ["localhost", "root", ""],
    ["localhost:3306", "root", ""],
    ["127.0.0.1", "root", ""],
    ["127.0.0.1:3306", "root", ""],
    ["localhost", "root", "root"],  // Some MAMP setups
];

foreach ($configs as $config) {
    list($host, $user, $pass) = $config;
    
    try {
        $pdo = new PDO("mysql:host=$host", $user, $pass);
        echo "<p style='color: green;'>✅ SUCCESS: host=$host, user=$user</p>";
        
        // Show available databases
        $stmt = $pdo->query("SHOW DATABASES");
        $dbs = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Databases: " . implode(", ", $dbs) . "<br><br>";
        
    } catch (PDOException $e) {
        echo "<p style='color: red;'>❌ FAILED: host=$host, user=$user - " . $e->getMessage() . "</p>";
    }
}
?>