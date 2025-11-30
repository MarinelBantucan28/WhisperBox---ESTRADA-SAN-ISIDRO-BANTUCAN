<?php
// Token Refresh Endpoint - improved: allow refresh using refresh_token only

// CORS headers
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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/bootstrap.php';
require_once '../config/database.php';
require_once '../models/User.php';
require_once '../lib/jwt_helper.php';

// Handle both JSON and FormData
$contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode(file_get_contents("php://input"));
} else {
    $data = (object) $_POST;
}

$response = array();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        $response = array(
            "status" => "error",
            "message" => "Method not allowed. Use POST."
        );
        echo json_encode($response);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Get refresh token from request or cookies
    $refresh_token = $data->refresh_token ?? ($_COOKIE['refresh_token'] ?? null);

    if (!$refresh_token) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "Refresh token required."
        );
        echo json_encode($response);
        exit;
    }

    // Look up the refresh token in DB to obtain user_id (so we can refresh without access token)
    $stmt = $db->prepare("SELECT user_id FROM refresh_tokens WHERE token = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1");
    $stmt->execute([$refresh_token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || empty($row['user_id'])) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "Invalid or expired refresh token."
        );
        echo json_encode($response);
        exit;
    }

    $user_id = (int)$row['user_id'];

    // Fetch user
    $user = new User($db);
    $user->id = $user_id;
    $user->load();

    if (!$user->id) {
        http_response_code(401);
        $response = array(
            "status" => "error",
            "message" => "User not found."
        );
        echo json_encode($response);
        exit;
    }

    // Issue new access token
    $new_payload = [
        'sub' => $user->id,
        'username' => $user->username,
        'email' => $user->email
    ];

    $new_token = null;
    if (function_exists('jwt_create')) {
        $new_token = jwt_create($new_payload, 3600);  // 1 hour
    }

    if (!$new_token) {
        http_response_code(500);
        $response = array(
            "status" => "error",
            "message" => "Failed to generate new token."
        );
        echo json_encode($response);
        exit;
    }

    // Optionally rotate refresh token (commented out by default)
    $new_refresh_token = null;
    // if (function_exists('generate_refresh_token') && function_exists('save_refresh_token') && function_exists('revoke_refresh_token')) {
    //     $new_refresh_token = generate_refresh_token();
    //     save_refresh_token($db, $user->id, $new_refresh_token, 30);
    //     revoke_refresh_token($db, $refresh_token);
    // }

    // Set new access token as HttpOnly cookie
    $cookieParams = [
        'expires' => time() + 3600,
        'path' => '/',
        'domain' => '',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax'
    ];
    setcookie('access_token', $new_token, $cookieParams);

    // If a new refresh token was generated (rotation), set cookie
    if ($new_refresh_token) {
        $refreshCookieParams = [
            'expires' => time() + (30 * 86400),
            'path' => '/',
            'domain' => '',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax'
        ];
        setcookie('refresh_token', $new_refresh_token, $refreshCookieParams);
    }

    // Response with new token
    $response = array(
        "status" => "success",
        "message" => "Token refreshed successfully.",
        "token" => $new_token,
        "refresh_token" => $new_refresh_token  // Only if rotating
    );
    http_response_code(200);

} catch (Exception $e) {
    error_log("Refresh token error: " . $e->getMessage());
    http_response_code(500);
    $response = array(
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);
?>
