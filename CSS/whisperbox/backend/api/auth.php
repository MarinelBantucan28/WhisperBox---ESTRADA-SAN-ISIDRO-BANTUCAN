<?php
// Restrictive CORS for local dev - extend allowed list for production
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
    $database = new Database();
    $db = $database->getConnection();

    if($_SERVER['REQUEST_METHOD'] == 'POST') {
        if(isset($data->action)) {
            switch($data->action) {
                case 'register':
                    // Validate input
                    if (empty($data->username) || empty($data->email) || empty($data->password)) {
                        $response = array(
                            "status" => "error",
                            "message" => "Username, email, and password are required."
                        );
                        http_response_code(400);
                        break;
                    }

                    // Check if email already exists
                    $user = new User($db);
                    $user->email = $data->email;
                    if ($user->emailExists()) {
                        $response = array(
                            "status" => "error",
                            "message" => "Email already registered. Please use a different email or log in."
                        );
                        http_response_code(409);
                        break;
                    }

                    // Check if username already exists
                    $user->username = $data->username;
                    if ($user->usernameExists()) {
                        $response = array(
                            "status" => "error",
                            "message" => "Username already taken. Please choose a different username."
                        );
                        http_response_code(409);
                        break;
                    }

                    // Create new user
                    $user = new User($db);
                    $user->username = $data->username;
                    $user->email = $data->email;
                    $user->password_hash = password_hash($data->password, PASSWORD_DEFAULT);
                    $user->display_name = $data->username;
                    $user->persona_description = "WhisperBox User";

                    if($user->create()) {
                        // Issue JWT on successful registration
                        $payload = [
                            'sub' => $user->id,
                            'username' => $user->username,
                            'email' => $user->email
                        ];
                        $token = null;
                        if (function_exists('jwt_create')) {
                            $token = jwt_create($payload, 3600);
                        }

                        // Set HttpOnly cookie for browser clients (secure flag only set when HTTPS)
                        $cookieParams = [
                            'expires' => time() + 3600,
                            'path' => '/',
                            'domain' => '',
                            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                            'httponly' => true,
                            'samesite' => 'Lax'
                        ];
                        if ($token) {
                            setcookie('access_token', $token, $cookieParams);
                        }

                        // Generate and persist refresh token
                        $refresh_token = null;
                        if (function_exists('generate_refresh_token') && function_exists('save_refresh_token')) {
                            $refresh_token = generate_refresh_token();
                            save_refresh_token($db, $user->id, $refresh_token, 30, $_SERVER['REMOTE_ADDR']);
                            // Set refresh token cookie
                            $refreshCookieParams = [
                                'expires' => time() + (30 * 86400),
                                'path' => '/',
                                'domain' => '',
                                'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                                'httponly' => true,
                                'samesite' => 'Lax'
                            ];
                            setcookie('refresh_token', $refresh_token, $refreshCookieParams);
                        }

                        $response = array(
                            "status" => "success",
                            "message" => "User registered successfully.",
                            "user_id" => $user->id,
                            "token" => $token,
                            "refresh_token" => $refresh_token,
                            "user" => array(
                                "id" => $user->id,
                                "username" => $user->username,
                                "email" => $user->email,
                                "display_name" => $user->display_name
                            )
                        );
                        http_response_code(201);
                    } else {
                        $response = array(
                            "status" => "error",
                            "message" => "Unable to register user. Please try again."
                        );
                        http_response_code(500);
                    }
                    break;

                case 'login':
                    // Validate input
                    if (empty($data->email) || empty($data->password)) {
                        $response = array(
                            "status" => "error",
                            "message" => "Email and password are required."
                        );
                        http_response_code(400);
                        break;
                    }

                    $user = new User($db);
                    $user->email = $data->email;

                    if($user->emailExists() && password_verify($data->password, $user->password_hash)) {
                        // Issue JWT on successful login
                        $payload = [
                            'sub' => $user->id,
                            'username' => $user->username,
                            'email' => $user->email
                        ];
                        $token = null;
                        if (function_exists('jwt_create')) {
                            $token = jwt_create($payload, 3600);
                        }

                        $cookieParams = [
                            'expires' => time() + 3600,
                            'path' => '/',
                            'domain' => '',
                            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                            'httponly' => true,
                            'samesite' => 'Lax'
                        ];
                        if ($token) {
                            setcookie('access_token', $token, $cookieParams);
                        }

                        // Generate and persist refresh token for login
                        $refresh_token = null;
                        if (function_exists('generate_refresh_token') && function_exists('save_refresh_token')) {
                            $refresh_token = generate_refresh_token();
                            save_refresh_token($db, $user->id, $refresh_token, 30, $_SERVER['REMOTE_ADDR']);
                            $refreshCookieParams = [
                                'expires' => time() + (30 * 86400),
                                'path' => '/',
                                'domain' => '',
                                'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                                'httponly' => true,
                                'samesite' => 'Lax'
                            ];
                            setcookie('refresh_token', $refresh_token, $refreshCookieParams);
                        }

                        $response = array(
                            "status" => "success",
                            "message" => "Login successful.",
                            "token" => $token,
                            "refresh_token" => $refresh_token,
                            "user" => array(
                                "id" => $user->id,
                                "username" => $user->username,
                                "email" => $user->email,
                                "display_name" => $user->display_name
                            )
                        );
                        http_response_code(200);
                    } else {
                        $response = array(
                            "status" => "error",
                            "message" => "Invalid email or password."
                        );
                        http_response_code(401);
                    }
                    break;

                case 'logout':
                    // Clear cookie tokens
                    setcookie('access_token', '', time() - 3600, '/');
                    setcookie('refresh_token', '', time() - 3600, '/');
                    // Optionally revoke tokens in DB if provided
                    if (isset($data->refresh_token) && function_exists('revoke_refresh_token')) {
                        revoke_refresh_token($db, $data->refresh_token);
                    }
                    $response = array(
                        "status" => "success",
                        "message" => "Logged out successfully."
                    );
                    http_response_code(200);
                    break;

                case 'check_auth':
                    $payload = optional_auth();
                    if ($payload) {
                        $response = array(
                            "status" => "success",
                            "authenticated" => true,
                            "user" => array(
                                "id" => $payload->sub ?? null,
                                "username" => $payload->username ?? null,
                                "email" => $payload->email ?? null
                            )
                        );
                    } else {
                        $response = array(
                            "status" => "success",
                            "authenticated" => false
                        );
                    }
                    http_response_code(200);
                    break;

                default:
                    $response = array(
                        "status" => "error",
                        "message" => "Unknown action."
                    );
                    http_response_code(400);
                    break;
            }
        } else {
            $response = array(
                "status" => "error",
                "message" => "Action not specified."
            );
            http_response_code(400);
        }
    } else {
        $response = array(
            "status" => "error",
            "message" => "Invalid request method."
        );
        http_response_code(405);
    }
} catch(Exception $e) {
    http_response_code(500);
    $response = array(
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);
?>
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    );
}

echo json_encode($response);
?>