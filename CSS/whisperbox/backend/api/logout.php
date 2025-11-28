<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$response = array();

try {
    // Start session
    session_start();
    
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
