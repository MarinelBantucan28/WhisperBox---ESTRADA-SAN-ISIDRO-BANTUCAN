<?php
// Central bootstrap for API endpoints: CORS, sessions, error handling, upload helper

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

// Basic exception handler: log and return generic message
set_exception_handler(function($e) {
    error_log($e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode(['status' => 'error', 'message' => 'Internal server error']);
    exit;
});

// Include secure session settings which calls session_start()
require_once __DIR__ . '/session.php';

// Load optional GCS upload helper if installed
if (file_exists(__DIR__ . '/../lib/gcs_upload.php')) {
    require_once __DIR__ . '/../lib/gcs_upload.php';
}

// Centralized handleImageUpload: prefer GCS if configured, fallback to local
function handleImageUpload($file) {
    // If GCS bucket configured and helper function exists, use it
    $gcs_bucket = getenv('GCS_BUCKET') ?: null;
    if ($gcs_bucket && function_exists('gcs_handleImageUpload')) {
        return gcs_handleImageUpload($file);
    }

    // Fallback local upload (safe checks)
    $max_size = 5 * 1024 * 1024; // 5MB

    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        throw new Exception('No valid uploaded file.');
    }

    if ($file['size'] > $max_size) {
        throw new Exception('File too large. Maximum size is 5MB.');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif'];
    if (!isset($allowed[$mime])) {
        throw new Exception('Invalid image type.');
    }

    $img_info = @getimagesize($file['tmp_name']);
    if ($img_info === false) {
        throw new Exception('Uploaded file is not a valid image.');
    }

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
    return 'uploads/images/' . $filename;
}

// JWT helpers and auth enforcement
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}
if (file_exists(__DIR__ . '/../lib/jwt_helper.php')) {
    require_once __DIR__ . '/../lib/jwt_helper.php';
}

// Return decoded token object or null
function get_auth_payload() {
    // Check Authorization header Bearer or cookie 'access_token'
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['Authorization'] ?? '');
    $token = null;
    if ($auth_header && preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        $token = $matches[1];
    }
    if (!$token && isset($_COOKIE['access_token'])) {
        $token = $_COOKIE['access_token'];
    }
    if (!$token) return null;
    if (!function_exists('jwt_verify')) return null;
    return jwt_verify($token);
}

function require_auth() {
    $payload = get_auth_payload();
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Authentication required']);
        exit;
    }
    return $payload;
}

function optional_auth() {
    return get_auth_payload();
}

?>
