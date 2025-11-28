<?php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $username;
    public $email;
    public $password_hash;
    public $display_name;
    public $persona_description;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create new user
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET username=:username, email=:email, password_hash=:password_hash, 
                      display_name=:display_name, persona_description=:persona_description";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize inputs
        $this->username = htmlspecialchars(strip_tags($this->username));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->display_name = htmlspecialchars(strip_tags($this->display_name));
        $this->persona_description = htmlspecialchars(strip_tags($this->persona_description));
        
        // Bind parameters
        $stmt->bindParam(":username", $this->username);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password_hash", $this->password_hash);
        $stmt->bindParam(":display_name", $this->display_name);
        $stmt->bindParam(":persona_description", $this->persona_description);
        
        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }

    // Check if email exists
    public function emailExists() {
        $query = "SELECT id, username, email, password_hash, display_name
                  FROM " . $this->table_name . " 
                  WHERE email = :email 
                  LIMIT 0,1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $this->email);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->email = $row['email'];
            $this->password_hash = $row['password_hash'];
            $this->display_name = $row['display_name'];
            return true;
        }
        
        return false;
    }
    
    // Check if username exists
    public function usernameExists() {
        $query = "SELECT id FROM " . $this->table_name . " 
                  WHERE username = :username LIMIT 0,1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":username", $this->username);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    }

    // Get user by ID
    public function readOne() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if($row) {
            $this->username = $row['username'];
            $this->email = $row['email'];
            $this->display_name = $row['display_name'];
            $this->persona_description = $row['persona_description'];
            return true;
        }
        
        return false;
    }
}
?>