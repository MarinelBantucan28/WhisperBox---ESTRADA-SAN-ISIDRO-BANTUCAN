<?php
header("Content-Type: application/json");
require_once 'config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Please login to view your messages"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$page = $_GET['page'] ?? 1;
$limit = 10;
$offset = ($page - 1) * $limit;

$database = new Database();
$db = $database->getConnection();

// Get user's messages
$query = "SELECT id, category, title, content, image_path, created_at 
          FROM messages 
          WHERE user_id = :user_id 
          ORDER BY created_at DESC 
          LIMIT :limit OFFSET :offset";
$stmt = $db->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
$stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
$stmt->execute();

$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get total count
$count_query = "SELECT COUNT(*) as total FROM messages WHERE user_id = :user_id";
$count_stmt = $db->prepare($count_query);
$count_stmt->bindParam(":user_id", $user_id);
$count_stmt->execute();
$total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

echo json_encode([
    "success" => true,
    "messages" => $messages,
    "pagination" => [
        "current_page" => (int)$page,
        "total_pages" => ceil($total_count / $limit),
        "total_messages" => (int)$total_count
    ]
]);
?>