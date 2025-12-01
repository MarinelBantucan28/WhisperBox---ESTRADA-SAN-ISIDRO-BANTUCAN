<?php
// Restrictive CORS: allow specific origins only (do NOT use wildcard in production)
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
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/bootstrap.php';
require_once '../config/database.php';
require_once '../models/User.php';

$response = array();

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "User not authenticated."
        );
    } else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        
        // Handle JSON and FormData
        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
        $data = new stdClass();
        
        if (strpos($contentType, 'application/json') !== false) {
            $input = json_decode(file_get_contents("php://input"), true);
            foreach ($input as $key => $value) {
                $data->$key = $value;
            }
        } else {
            foreach ($_POST as $key => $value) {
                $data->$key = $value;
            }
        }
        
        $action = $data->action ?? null;
        
        switch ($action) {
            case 'update_display_name':
                $payload = require_auth();
                $user_id = $payload->sub ?? null;
                updateDisplayName($db, $user_id, $data->display_name, $response);
                break;
                
            case 'update_email':
                $payload = require_auth();
                $user_id = $payload->sub ?? null;
                updateEmail($db, $user_id, $data->email, $data->password, $response);
                break;
                
            case 'change_password':
                $payload = require_auth();
                $user_id = $payload->sub ?? null;
                changePassword($db, $user_id, $data->current_password, $data->new_password, $response);
                break;
                
            case 'delete_account':
                $payload = require_auth();
                $user_id = $payload->sub ?? null;
                deleteAccount($db, $user_id, $response);
                break;
                
            default:
                http_response_code(400);
                $response = array(
                    "status" => "error",
                    "message" => "Invalid action."
                );
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    $response = array(
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);

// Update display name
function updateDisplayName($db, $user_id, $display_name, &$response) {
    $display_name = htmlspecialchars(strip_tags($display_name));
    
    $query = "UPDATE users SET display_name = :display_name WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':display_name', $display_name);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute()) {
        $_SESSION['display_name'] = $display_name;
        $response = array(
            "status" => "success",
            "message" => "Display name updated successfully."
        );
    } else {
        http_response_code(500);
        $response = array(
            "status" => "error",
            "message" => "Failed to update display name."
        );
    }
}

// Update email
function updateEmail($db, $user_id, $new_email, $password, &$response) {
    $new_email = filter_var(trim($new_email), FILTER_VALIDATE_EMAIL);
    
    if (!$new_email) {
        http_response_code(400);
        $response = array(
            "status" => "error",
            "message" => "Invalid email address."
        );
        return;
    }
    
    // Get current user and verify password
    $user = new User($db);
    $user->id = $user_id;
    
    $query = "SELECT id, email, password_hash FROM users WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->bindParam(1, $user_id);
    $stmt->execute();
    $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user_data || !password_verify($password, $user_data['password_hash'])) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "Password is incorrect."
        );
        return;
    }
    
    // Check if email already exists
    $check_query = "SELECT id FROM users WHERE email = ? AND id != ?";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(1, $new_email);
    $check_stmt->bindParam(2, $user_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(409);
        $response = array(
            "status" => "error",
            "message" => "Email already in use."
        );
        return;
    }
    
    // Update email
    $update_query = "UPDATE users SET email = :email WHERE id = :user_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':email', $new_email);
    $update_stmt->bindParam(':user_id', $user_id);
    
    if ($update_stmt->execute()) {
        $_SESSION['email'] = $new_email;
        $response = array(
            "status" => "success",
            "message" => "Email updated successfully."
        );
    } else {
        http_response_code(500);
        $response = array(
            "status" => "error",
            "message" => "Failed to update email."
        );
    }
}

// Change password
function changePassword($db, $user_id, $current_password, $new_password, &$response) {
    if (strlen($new_password) < 6) {
        http_response_code(400);
        $response = array(
            "status" => "error",
            "message" => "New password must be at least 6 characters."
        );
        return;
    }
    
    // Get current user and verify password
    $query = "SELECT password_hash FROM users WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->bindParam(1, $user_id);
    $stmt->execute();
    $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user_data || !password_verify($current_password, $user_data['password_hash'])) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "Current password is incorrect."
        );
        return;
    }
    
    // Hash new password
    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update password
    $update_query = "UPDATE users SET password_hash = :password_hash WHERE id = :user_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':password_hash', $password_hash);
    $update_stmt->bindParam(':user_id', $user_id);
    
    if ($update_stmt->execute()) {
        $response = array(
            "status" => "success",
            "message" => "Password changed successfully."
        );
    } else {
        http_response_code(500);
        $response = array(
            "status" => "error",
            "message" => "Failed to change password."
        );
    }
}

// Delete account
function deleteAccount($db, $user_id, &$response) {
    try {
        // Delete all user's posts
        $delete_posts_query = "DELETE FROM posts WHERE author_user_id = ?";
        $delete_posts_stmt = $db->prepare($delete_posts_query);
        $delete_posts_stmt->bindParam(1, $user_id);
        $delete_posts_stmt->execute();
        
        // Delete user
        $delete_user_query = "DELETE FROM users WHERE id = ?";
        $delete_user_stmt = $db->prepare($delete_user_query);
        $delete_user_stmt->bindParam(1, $user_id);
        
        if ($delete_user_stmt->execute()) {
            session_destroy();
            $response = array(
                "status" => "success",
                "message" => "Account deleted successfully."
            );
        } else {
            http_response_code(500);
            $response = array(
                "status" => "error",
                "message" => "Failed to delete account."
            );
        }
    } catch (Exception $e) {
        http_response_code(500);
        $response = array(
            "status" => "error",
            "message" => "Error deleting account: " . $e->getMessage()
        );
    }
}
?>
