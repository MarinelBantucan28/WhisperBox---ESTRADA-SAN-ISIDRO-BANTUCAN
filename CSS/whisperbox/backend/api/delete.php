<?php
header("Content-Type: application/json");
require_once 'config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Please login to delete messages"]);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $message_ids = $data['message_ids'] ?? [];
    
    if (empty($message_ids)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "No messages selected for deletion"]);
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Create placeholders for IN clause
    $placeholders = str_repeat('?,', count($message_ids) - 1) . '?';
    
    // Delete only messages that belong to the current user
    $query = "DELETE FROM messages WHERE id IN ($placeholders) AND user_id = ?";
    $stmt = $db->prepare($query);
    
    // Combine message_ids and user_id for parameters
    $params = array_merge($message_ids, [$user_id]);
    
    if ($stmt->execute($params)) {
        $deleted_count = $stmt->rowCount();
        echo json_encode([
            "success" => true, 
            "message" => "Successfully deleted $deleted_count messages",
            "deleted_count" => $deleted_count
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to delete messages"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}
?>