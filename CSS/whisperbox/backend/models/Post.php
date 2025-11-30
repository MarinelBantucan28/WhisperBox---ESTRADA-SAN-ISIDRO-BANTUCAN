<?php
class Post {
    private $conn;
    private $table_name = "posts";

    public $id;
    public $title;
    public $content;
    public $author_type;
    public $author_user_id;
    public $author_guest_id;
    public $category_id;
    public $mood;
    public $tags;
    public $image_path;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create new post
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET title=:title, content=:content, author_type=:author_type, 
                      author_user_id=:author_user_id, author_guest_id=:author_guest_id,
                      category_id=:category_id, mood=:mood, tags=:tags, image_path=:image_path";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize inputs
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->content = htmlspecialchars(strip_tags($this->content));
        $this->mood = htmlspecialchars(strip_tags($this->mood));
        $this->tags = htmlspecialchars(strip_tags($this->tags));
        
        // Bind parameters
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":content", $this->content);
        $stmt->bindParam(":author_type", $this->author_type);
        $stmt->bindParam(":author_user_id", $this->author_user_id);
        $stmt->bindParam(":author_guest_id", $this->author_guest_id);
        $stmt->bindParam(":category_id", $this->category_id);
        $stmt->bindParam(":mood", $this->mood);
        $stmt->bindParam(":tags", $this->tags);
        $stmt->bindParam(":image_path", $this->image_path);
        
        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }

    // Read all posts with optional pagination
    public function readAll($limit = null, $offset = null) {
        // Query without assuming is_public or categories table exist
        $query = "SELECT p.*, u.display_name as user_display_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN users u ON p.author_user_id = u.id
                  ORDER BY p.created_at DESC";

        if ($limit !== null && $offset !== null) {
            $query .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->conn->prepare($query);

        if ($limit !== null && $offset !== null) {
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt;
    }

    // Get single post
    public function readOne() {
        $query = "SELECT p.*, u.display_name as user_display_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN users u ON p.author_user_id = u.id
                  WHERE p.id = ? LIMIT 0,1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if($row) {
            $this->title = $row['title'];
            $this->content = $row['content'];
            $this->author_type = $row['author_type'];
            $this->author_user_id = $row['author_user_id'];
            $this->author_guest_id = $row['author_guest_id'];
            $this->category_id = $row['category_id'];
            $this->mood = $row['mood'];
            $this->tags = $row['tags'];
            return true;
        }

        return false;
    }

    // Read posts by category with optional pagination
    public function readByCategory($category, $limit = null, $offset = null) {
        // Handle mood-based filtering (mood column contains category name)
        $query = "SELECT p.*, u.display_name as user_display_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN users u ON p.author_user_id = u.id
                  WHERE p.mood = :category
                  ORDER BY p.created_at DESC";

        if ($limit !== null && $offset !== null) {
            $query .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':category', $category);

        if ($limit !== null && $offset !== null) {
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt;
    }

    // Read posts by date range
    public function readByDateRange($from, $to, $limit = null, $offset = null) {
        // Ensure dates are in Y-m-d format
        $from_date = date('Y-m-d', strtotime($from));
        $to_date = date('Y-m-d', strtotime($to));

        $query = "SELECT p.*, u.display_name as user_display_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN users u ON p.author_user_id = u.id
                  WHERE DATE(p.created_at) BETWEEN ? AND ?
                  ORDER BY p.created_at DESC";

        if ($limit !== null && $offset !== null) {
            $query .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(1, $from_date);
        $stmt->bindValue(2, $to_date);

        if ($limit !== null && $offset !== null) {
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt;
    }

    // Read posts by current user
    public function readByUser($user_id, $limit = null, $offset = null) {
        $query = "SELECT p.*, u.display_name as user_display_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN users u ON p.author_user_id = u.id
                  WHERE p.author_user_id = ?
                  ORDER BY p.created_at DESC";
        if ($limit !== null && $offset !== null) {
            $query .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(1, $user_id);

        if ($limit !== null && $offset !== null) {
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt;
    }

    // Count helpers for pagination
    public function countAll() {
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)$row['total'];
    }

    public function countByCategory($category) {
        $query = "SELECT COUNT(p.id) as total FROM " . $this->table_name . " p
                  WHERE p.mood = :category";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':category', $category);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)$row['total'];
    }

    public function countByDateRange($from, $to) {
        $from_date = date('Y-m-d', strtotime($from));
        $to_date = date('Y-m-d', strtotime($to));
        $query = "SELECT COUNT(p.id) as total FROM " . $this->table_name . " p
                  WHERE DATE(p.created_at) BETWEEN ? AND ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(1, $from_date);
        $stmt->bindValue(2, $to_date);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)$row['total'];
    }

    // Update post
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                  SET title=:title, content=:content, category_id=:category_id, 
                      mood=:mood, tags=:tags, updated_at=NOW()
                  WHERE id=:id";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize inputs
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->content = htmlspecialchars(strip_tags($this->content));
        $this->mood = htmlspecialchars(strip_tags($this->mood));
        $this->tags = htmlspecialchars(strip_tags($this->tags));
        
        // Bind parameters
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":content", $this->content);
        $stmt->bindParam(":category_id", $this->category_id);
        $stmt->bindParam(":mood", $this->mood);
        $stmt->bindParam(":tags", $this->tags);
        $stmt->bindParam(":id", $this->id);
        
        if($stmt->execute()) {
            return true;
        }
        
        return false;
    }

    // Delete post by ID
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Delete all posts by user
    public function deleteAllByUser($user_id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE author_user_id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $user_id);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Delete multiple posts by IDs
    public function deleteBulk($post_ids) {
        $placeholders = str_repeat('?,', count($post_ids) - 1) . '?';
        $query = "DELETE FROM " . $this->table_name . " WHERE id IN ($placeholders)";

        $stmt = $this->conn->prepare($query);
        foreach ($post_ids as $index => $id) {
            $stmt->bindParam($index + 1, $id);
        }

        if($stmt->execute()) {
            return true;
        }

        return false;
    }
}
?>