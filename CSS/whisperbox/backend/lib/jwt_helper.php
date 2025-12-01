<?php
// JWT helper using firebase/php-jwt
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

if (!function_exists('jwt_create')) {
    /**
     * Create an access token (short-lived, 1 hour)
     */
    function jwt_create($user_payload, $ttl_seconds = 3600) {
        $secret = getenv('APP_SECRET') ?: 'change_this_to_a_secure_random_value';
        $now = time();
        $exp = $now + $ttl_seconds;

        $payload = array_merge([
            'iat' => $now,
            'exp' => $exp
        ], $user_payload);

        // firebase/php-jwt requires static methods
        return JWT::encode($payload, $secret, 'HS256');
    }
}

if (!function_exists('jwt_verify')) {
    /**
     * Verify an access token
     */
    function jwt_verify($token) {
        $secret = getenv('APP_SECRET') ?: 'change_this_to_a_secure_random_value';
        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return $decoded;
        } catch (Exception $e) {
            error_log('JWT verify failed: ' . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('generate_refresh_token')) {
    /**
     * Generate a cryptographically secure refresh token (long-lived, 30 days)
     */
    function generate_refresh_token() {
        return bin2hex(random_bytes(32));
    }
}

if (!function_exists('save_refresh_token')) {
    /**
     * Save refresh token to database
     * @param $db PDO connection
     * @param $user_id User ID
     * @param $token Refresh token string
     * @param $ttl_days Token lifetime in days (default 30)
     * @param $ip_address Client IP address
     * @return bool Success
     */
    function save_refresh_token($db, $user_id, $token, $ttl_days = 30, $ip_address = null) {
        $expires_at = date('Y-m-d H:i:s', time() + ($ttl_days * 86400));
        $ip = $ip_address ?: $_SERVER['REMOTE_ADDR'];
        
        $query = "INSERT INTO refresh_tokens (user_id, token, ip_address, expires_at) 
                  VALUES (?, ?, ?, ?)";
        $stmt = $db->prepare($query);
        
        return $stmt->execute([$user_id, $token, $ip, $expires_at]);
    }
}

if (!function_exists('verify_refresh_token')) {
    /**
     * Verify refresh token exists in database and is not revoked/expired
     * @param $db PDO connection
     * @param $user_id User ID
     * @param $token Refresh token string
     * @return bool Valid
     */
    function verify_refresh_token($db, $user_id, $token) {
        $query = "SELECT id FROM refresh_tokens 
                  WHERE user_id = ? AND token = ? AND revoked = FALSE 
                  AND expires_at > NOW()
                  LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->execute([$user_id, $token]);
        
        return $stmt->rowCount() > 0;
    }
}

if (!function_exists('revoke_refresh_token')) {
    /**
     * Revoke a refresh token (for logout)
     * @param $db PDO connection
     * @param $token Refresh token string
     * @return bool Success
     */
    function revoke_refresh_token($db, $token) {
        $query = "UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?";
        $stmt = $db->prepare($query);
        
        return $stmt->execute([$token]);
    }
}

if (!function_exists('revoke_all_refresh_tokens')) {
    /**
     * Revoke all refresh tokens for a user (for logout all devices)
     * @param $db PDO connection
     * @param $user_id User ID
     * @return bool Success
     */
    function revoke_all_refresh_tokens($db, $user_id) {
        $query = "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?";
        $stmt = $db->prepare($query);
        
        return $stmt->execute([$user_id]);
    }
}

?>
