<?php
class Database {
    // Try these in order - use the first one that works
    private $host = "127.0.0.1";      // Try first
    // private $host = "localhost:3306";  // Try if above fails
    // private $host = "127.0.0.1";       // Try if above fails
    // private $host = "127.0.0.1:3306";  // Try if above fails
    
    private $db_name = "whisperbox_db";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        // Try different host configurations
        $hosts = ["localhost", "localhost:3306", "127.0.0.1", "127.0.0.1:3306"];
        
        foreach ($hosts as $host) {
            try {
                $this->conn = new PDO(
                    "mysql:host=" . $host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                    $this->username,
                    $this->password,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                
                // If connection successful, break the loop
                error_log("Database connected successfully with host: " . $host);
                break;
                
            } catch(PDOException $exception) {
                error_log("Connection failed with host $host: " . $exception->getMessage());
                continue; // Try next host
            }
        }
        
        if (!$this->conn) {
            error_log("All connection attempts failed");
        }
        
        return $this->conn;
    }
}
?>