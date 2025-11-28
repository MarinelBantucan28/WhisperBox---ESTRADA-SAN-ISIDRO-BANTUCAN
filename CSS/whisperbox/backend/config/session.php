<?php
/**
 * Session Check Utility
 * Include this file to check if user is authenticated
 */

// Harden session cookie params before starting session
$cookieParams = session_get_cookie_params();
$secureFlag = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookieParams['path'],
    'domain' => $cookieParams['domain'],
    'secure' => $secureFlag, // set true in production (HTTPS)
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

// Check if user is authenticated
$is_authenticated = isset($_SESSION['user_id']);
$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
$username = isset($_SESSION['username']) ? $_SESSION['username'] : null;
$email = isset($_SESSION['email']) ? $_SESSION['email'] : null;
$display_name = isset($_SESSION['display_name']) ? $_SESSION['display_name'] : null;

// Return JSON if requested
if (isset($_GET['json'])) {
    header("Content-Type: application/json");
    echo json_encode([
        'authenticated' => $is_authenticated,
        'user_id' => $user_id,
        'username' => $username,
        'email' => $email,
        'display_name' => $display_name
    ]);
    exit;
}
?>
