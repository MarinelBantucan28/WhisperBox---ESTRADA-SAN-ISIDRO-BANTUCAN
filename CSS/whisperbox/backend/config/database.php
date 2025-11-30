<?php
class Database {
    // Read configuration from environment when available (safer for public hosting).
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $charset;
    public $conn;

    public function __construct() {
        $this->host = getenv('DB_HOST') ?: '127.0.0.1';
        $this->db_name = getenv('DB_NAME') ?: 'whisperbox_db';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASS') ?: '';
        $this->charset = getenv('DB_CHARSET') ?: 'utf8mb4';
    }

    public function getConnection() {
        $this->conn = null;

        $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";

        try {
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);

            // Connection successful
            error_log("Database connected successfully");
        } catch (PDOException $exception) {
            // Avoid echoing DB details to users; keep logs for server admin only
            error_log("Database connection failed: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
?>