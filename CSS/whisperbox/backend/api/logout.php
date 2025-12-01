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

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$response = array();

try {
    // Use centralized bootstrap which sets secure cookie params
    require_once '../config/bootstrap.php';

    // Destroy session
    session_destroy();

    $response = array(
        "status" => "success",
        "message" => "Logged out successfully."
    );
    http_response_code(200);

} catch(Exception $e) {
    http_response_code(500);
    $response = array(
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);
?>
