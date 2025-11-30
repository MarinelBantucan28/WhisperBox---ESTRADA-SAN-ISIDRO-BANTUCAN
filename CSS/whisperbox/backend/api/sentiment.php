<?php
// Sentiment Analysis API Endpoint
// Uses OpenAI API for emotion detection and content analysis

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/bootstrap.php';

// Get OpenAI API key from environment
$openai_api_key = getenv('OPENAI_API_KEY') ?: 'your-openai-api-key-here';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $text = $input['text'] ?? '';

    if (empty($text)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Text content is required'
        ]);
        exit;
    }

    try {
        // Analyze sentiment using OpenAI
        $sentiment_result = analyzeSentiment($text, $openai_api_key);

        echo json_encode([
            'status' => 'success',
            'sentiment' => $sentiment_result
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Sentiment analysis failed: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
}

function analyzeSentiment($text, $api_key) {
    // Prepare the prompt for emotion analysis
    $prompt = "Analyze the emotional content of this text and classify it into one of these categories: joy, sadness, anger, exhaustion, reflection. Also provide a confidence score (0-1) and any relevant keywords.

Text: \"$text\"

Respond in JSON format with keys: emotion, confidence, keywords (array), intensity (1-5)";

    // OpenAI API call
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key
    ]);

    $data = [
        'model' => 'gpt-3.5-turbo',
        'messages' => [
            ['role' => 'system', 'content' => 'You are an emotion analysis expert. Always respond with valid JSON.'],
            ['role' => 'user', 'content' => $prompt]
        ],
        'max_tokens' => 200,
        'temperature' => 0.3
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        throw new Exception("OpenAI API error: HTTP $http_code");
    }

    $result = json_decode($response, true);

    if (!isset($result['choices'][0]['message']['content'])) {
        throw new Exception("Invalid OpenAI response format");
    }

    $content = $result['choices'][0]['message']['content'];

    // Parse the JSON response from OpenAI
    $analysis = json_decode($content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        // Fallback parsing if OpenAI didn't return valid JSON
        $analysis = parseSentimentFallback($content);
    }

    // Validate and normalize the response
    return [
        'emotion' => $analysis['emotion'] ?? 'reflection',
        'confidence' => min(1.0, max(0.0, $analysis['confidence'] ?? 0.5)),
        'keywords' => is_array($analysis['keywords'] ?? []) ? $analysis['keywords'] : [],
        'intensity' => min(5, max(1, $analysis['intensity'] ?? 3)),
        'analyzed_at' => date('c')
    ];
}

function parseSentimentFallback($content) {
    // Simple fallback parsing if OpenAI response isn't valid JSON
    $emotion = 'reflection';
    $confidence = 0.5;
    $intensity = 3;
    $keywords = [];

    // Extract emotion from text
    $emotions = ['joy', 'sadness', 'anger', 'exhaustion', 'reflection'];
    foreach ($emotions as $emo) {
        if (stripos($content, $emo) !== false) {
            $emotion = $emo;
            $confidence = 0.7;
            break;
        }
    }

    // Extract keywords (simple word extraction)
    preg_match_all('/\b[a-z]{4,}\b/i', $content, $matches);
    $keywords = array_slice($matches[0], 0, 5);

    return [
        'emotion' => $emotion,
        'confidence' => $confidence,
        'keywords' => $keywords,
        'intensity' => $intensity
    ];
}
?>
