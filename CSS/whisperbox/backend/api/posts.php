<?php
// Basic CORS: allow local dev origins only. Update allowed list for production.
$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../models/Post.php';

// Handle both JSON and FormData
$contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';

// Initialize data object
$data = new stdClass();

if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents("php://input"), true);
    foreach ($input as $key => $value) {
        $data->$key = $value;
    }
} else {
    // Handle form data with file uploads
    foreach ($_POST as $key => $value) {
        $data->$key = $value;
    }
}

$response = array();

try {
    $database = new Database();
    $db = $database->getConnection();

    if($_SERVER['REQUEST_METHOD'] == 'POST') {

        switch($data->action) {
            case 'create_guest_post':
                // Create guest session first
                $guest_token = 'guest_' . bin2hex(random_bytes(16));
                $secret_key = 'secret_' . bin2hex(random_bytes(16));
                
                $guest_query = "INSERT INTO guest_sessions (session_token, secret_key, ip_address) VALUES (?, ?, ?)";
                $guest_stmt = $db->prepare($guest_query);
                $guest_stmt->execute([$guest_token, $secret_key, $_SERVER['REMOTE_ADDR']]);
                $guest_id = $db->lastInsertId();
                
                $post = new Post($db);
                $post->title = $data->title ?? '';
                $post->content = $data->content;
                $post->author_type = 'guest';
                $post->author_guest_id = $guest_id;
                // Determine category id: accept numeric category_id or map from name
                $cat_val = $data->category_id ?? null;
                if (is_numeric($cat_val)) {
                    $post->category_id = intval($cat_val);
                } else {
                    $post->category_id = mapCategoryToId($cat_val);
                }
                $post->mood = $data->mood;
                $post->tags = $data->tags ?? '';
                $post->image_path = null; // Initialize as null
                
                // Handle image upload
                if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    $post->image_path = handleImageUpload($_FILES['image']);
                }
                
                if($post->create()) {
                    $response = array(
                        "status" => "success",
                        "message" => "Post created successfully.",
                        "post_id" => $post->id,
                        "guest_token" => $guest_token,
                        "secret_key" => $secret_key
                    );
                } else {
                    $response = array(
                        "status" => "error",
                        "message" => "Failed to create post."
                    );
                }
                break;
                
            case 'create_post':
                session_start();
                if(isset($_SESSION['user_id'])) {
                    $post = new Post($db);
                    $post->title = $data->title ?? '';
                    $post->content = $data->content;
                    $post->author_type = 'user';
                    $post->author_user_id = $_SESSION['user_id'];
                    // Determine category id: accept numeric category_id or map from name
                    $cat_val = $data->category_id ?? null;
                    if (is_numeric($cat_val)) {
                        $post->category_id = intval($cat_val);
                    } else {
                        $post->category_id = mapCategoryToId($cat_val);
                    }
                    $post->mood = $data->mood;
                    $post->tags = $data->tags ?? '';
                    $post->image_path = null; // Initialize as null
                    
                    // Handle image upload
                    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                        $post->image_path = handleImageUpload($_FILES['image']);
                    }
                    
                    if($post->create()) {
                        $response = array(
                            "status" => "success",
                            "message" => "Post created successfully.",
                            "post_id" => $post->id
                        );
                    } else {
                        $response = array(
                            "status" => "error",
                            "message" => "Failed to create post."
                        );
                    }
                } else {
                    $response = array(
                        "status" => "error",
                        "message" => "User not authenticated."
                    );
                    http_response_code(401);
                }
                break;

            // ... (keep existing delete cases the same)

            case 'add_bookmark':
                session_start();
                if(!isset($_SESSION['user_id'])) {
                    http_response_code(401);
                    $response = array(
                        "status" => "error",
                        "message" => "User not authenticated."
                    );
                } else {
                    $post_id = $data->post_id ?? null;
                    if(!$post_id) {
                        http_response_code(400);
                        $response = array(
                            "status" => "error",
                            "message" => "post_id is required."
                        );
                    } else {
                        // Insert bookmark if not exists
                        $insert = "INSERT IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)";
                        $stmtIns = $db->prepare($insert);
                        $ok = $stmtIns->execute([$_SESSION['user_id'], $post_id]);
                        if($ok) {
                            $response = array(
                                "status" => "success",
                                "message" => "Bookmarked successfully.",
                                "post_id" => $post_id
                            );
                        } else {
                            http_response_code(500);
                            $response = array(
                                "status" => "error",
                                "message" => "Failed to bookmark post."
                            );
                        }
                    }
                }
                break;

            case 'remove_bookmark':
                session_start();
                if(!isset($_SESSION['user_id'])) {
                    http_response_code(401);
                    $response = array(
                        "status" => "error",
                        "message" => "User not authenticated."
                    );
                } else {
                    $post_id = $data->post_id ?? null;
                    if(!$post_id) {
                        http_response_code(400);
                        $response = array(
                            "status" => "error",
                            "message" => "post_id is required."
                        );
                    } else {
                        $del = "DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?";
                        $stmtDel = $db->prepare($del);
                        $ok = $stmtDel->execute([$_SESSION['user_id'], $post_id]);
                        if($ok) {
                            $response = array(
                                "status" => "success",
                                "message" => "Bookmark removed.",
                                "post_id" => $post_id
                            );
                        } else {
                            http_response_code(500);
                            $response = array(
                                "status" => "error",
                                "message" => "Failed to remove bookmark."
                            );
                        }
                    }
                }
                break;
        }
    }
    
    // PUT requests for updating posts
    if($_SERVER['REQUEST_METHOD'] == 'PUT') {
        parse_str(file_get_contents("php://input"), $_PUT);
        
        session_start();
        if(!isset($_SESSION['user_id'])) {
            http_response_code(401);
            $response = array(
                "status" => "error",
                "message" => "User not authenticated."
            );
        } else {
            $post_id = $_PUT['id'] ?? null;
            
            if(!$post_id) {
                http_response_code(400);
                $response = array(
                    "status" => "error",
                    "message" => "Post ID is required."
                );
            } else {
                // Verify user owns the post
                $verify_query = "SELECT author_user_id FROM posts WHERE id = ?";
                $verify_stmt = $db->prepare($verify_query);
                $verify_stmt->bindParam(1, $post_id);
                $verify_stmt->execute();
                $post_owner = $verify_stmt->fetch(PDO::FETCH_ASSOC);
                
                if(!$post_owner || $post_owner['author_user_id'] != $_SESSION['user_id']) {
                    http_response_code(403);
                    $response = array(
                        "status" => "error",
                        "message" => "You do not have permission to edit this post."
                    );
                } else {
                    $post = new Post($db);
                    $post->id = $post_id;
                    $post->title = $_PUT['title'] ?? '';
                    $post->content = $_PUT['content'];
                    $post->category_id = isset($_PUT['category_id']) ? $_PUT['category_id'] : 1;
                    $post->mood = $_PUT['mood'] ?? '';
                    $post->tags = $_PUT['tags'] ?? '';
                    
                    if($post->update()) {
                        $response = array(
                            "status" => "success",
                            "message" => "Post updated successfully.",
                            "post_id" => $post_id
                        );
                    } else {
                        http_response_code(500);
                        $response = array(
                            "status" => "error",
                            "message" => "Failed to update post."
                        );
                    }
                }
            }
        }
    }
    
    // DELETE requests for deleting posts
    if($_SERVER['REQUEST_METHOD'] == 'DELETE') {
        parse_str(file_get_contents("php://input"), $_DELETE);
        
        session_start();
        if(!isset($_SESSION['user_id'])) {
            http_response_code(401);
            $response = array(
                "status" => "error",
                "message" => "User not authenticated."
            );
        } else {
            $post_id = $_DELETE['id'] ?? null;
            
            if(!$post_id) {
                http_response_code(400);
                $response = array(
                    "status" => "error",
                    "message" => "Post ID is required."
                );
            } else {
                // Verify user owns the post
                $verify_query = "SELECT author_user_id FROM posts WHERE id = ?";
                $verify_stmt = $db->prepare($verify_query);
                $verify_stmt->bindParam(1, $post_id);
                $verify_stmt->execute();
                $post_owner = $verify_stmt->fetch(PDO::FETCH_ASSOC);
                
                if(!$post_owner || $post_owner['author_user_id'] != $_SESSION['user_id']) {
                    http_response_code(403);
                    $response = array(
                        "status" => "error",
                        "message" => "You do not have permission to delete this post."
                    );
                } else {
                    $post = new Post($db);
                    $post->id = $post_id;
                    
                    if($post->delete()) {
                        $response = array(
                            "status" => "success",
                            "message" => "Post deleted successfully."
                        );
                    } else {
                        http_response_code(500);
                        $response = array(
                            "status" => "error",
                            "message" => "Failed to delete post."
                        );
                    }
                }
            }
        }
    }
    }
    
    // GET requests for fetching posts
    if($_SERVER['REQUEST_METHOD'] == 'GET') {
        $action = $_GET['action'] ?? 'get_posts';
        $category = $_GET['category'] ?? 'all';
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        
        $post = new Post($db);

        // Pagination params
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $per_page = isset($_GET['per_page']) ? max(1, min(100, intval($_GET['per_page']))) : 10;
        $offset = ($page - 1) * $per_page;

        if ($action === 'get_my_posts') {
            session_start();
            if(isset($_SESSION['user_id'])) {
                $stmt = $post->readByUser($_SESSION['user_id'], $per_page, $offset);
                $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $total = $post->countAll(); // could be scoped to user if needed

                $response = array(
                    "status" => "success",
                    "posts" => $posts,
                    "total_count" => $total,
                    "page" => $page,
                    "per_page" => $per_page
                );
            } else {
                $response = array(
                    "status" => "error",
                    "message" => "User not authenticated."
                );
                http_response_code(401);
            }
        } else if ($action === 'get_bookmarks') {
            session_start();
            if(!isset($_SESSION['user_id'])) {
                http_response_code(401);
                $response = array(
                    "status" => "error",
                    "message" => "User not authenticated."
                );
            } else {
                $query = "SELECT post_id FROM bookmarks WHERE user_id = ?";
                $stmtBk = $db->prepare($query);
                $stmtBk->execute([$_SESSION['user_id']]);
                $rows = $stmtBk->fetchAll(PDO::FETCH_ASSOC);
                $post_ids = array_map(function($r){ return (int)$r['post_id']; }, $rows);
                $response = array(
                    "status" => "success",
                    "bookmarks" => $post_ids
                );
            }
        } else {
            // If both from and to dates are provided, validate and use date range
            if ($from && $to) {
                // Validate date format YYYY-MM-DD
                $from_dt = DateTime::createFromFormat('Y-m-d', $from);
                $to_dt = DateTime::createFromFormat('Y-m-d', $to);

                $from_valid = $from_dt && $from_dt->format('Y-m-d') === $from;
                $to_valid = $to_dt && $to_dt->format('Y-m-d') === $to;

                if (!$from_valid || !$to_valid) {
                    http_response_code(400);
                    $response = array(
                        "status" => "error",
                        "message" => "Invalid date format. Use YYYY-MM-DD for both 'from' and 'to'."
                    );
                    echo json_encode($response);
                    exit;
                }

                if ($from_dt > $to_dt) {
                    http_response_code(400);
                    $response = array(
                        "status" => "error",
                        "message" => "Invalid date range: 'from' must be earlier than or equal to 'to'."
                    );
                    echo json_encode($response);
                    exit;
                }

                $stmt = $post->readByDateRange($from, $to, $per_page, $offset);
                $total = $post->countByDateRange($from, $to);
            } else if ($category !== 'all') {
                $stmt = $post->readByCategory($category, $per_page, $offset);
                $total = $post->countByCategory($category);
            } else {
                $stmt = $post->readAll($per_page, $offset);
                $total = $post->countAll();
            }

            $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = array(
                "status" => "success",
                "posts" => $posts,
                "total_count" => $total,
                "page" => $page,
                "per_page" => $per_page
            );
        }
    }
    
} catch(Exception $e) {
    http_response_code(500);
    $response = array(
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);

// Helper function for image upload - hardened checks
function handleImageUpload($file) {
    $max_size = 5 * 1024 * 1024; // 5MB

    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        throw new Exception('No valid uploaded file.');
    }

    if ($file['size'] > $max_size) {
        throw new Exception('File too large. Maximum size is 5MB.');
    }

    // Use finfo to detect real mime type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif'];
    if (!isset($allowed[$mime])) {
        throw new Exception('Invalid image type.');
    }

    // Double-check with getimagesize
    $img_info = @getimagesize($file['tmp_name']);
    if ($img_info === false) {
        throw new Exception('Uploaded file is not a valid image.');
    }

    // Ensure upload directory exists
    $upload_dir = realpath(__DIR__ . '/../uploads/images/') ?: (__DIR__ . '/../uploads/images/');
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $ext = $allowed[$mime];
    $filename = 'img_' . bin2hex(random_bytes(12)) . '.' . $ext;
    $file_path = rtrim($upload_dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        throw new Exception('Failed to move uploaded file.');
    }

    @chmod($file_path, 0644);

    // Return web-relative path
    return 'uploads/images/' . $filename;
}

// Helper function for category mapping
function mapCategoryToId($category_name) {
    $category_map = [
        'joy' => 1,
        'sadness' => 2,
        'anger' => 3,
        'exhaustion' => 4,
        'reflection' => 5
    ];
    
    return $category_map[$category_name] ?? 1; // Default to joy if not found
}
?>