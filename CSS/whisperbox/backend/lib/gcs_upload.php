<?php
// Optional Google Cloud Storage helper. Requires composer package google/cloud-storage
// This helper expects the Composer autoloader in ../vendor/autoload.php and the
// environment variable GCS_BUCKET to be set.

use Google\Cloud\Storage\StorageClient;

if (!function_exists('gcs_handleImageUpload')) {
    function gcs_handleImageUpload($file) {
        $autoload = __DIR__ . '/../vendor/autoload.php';
        if (!file_exists($autoload)) {
            throw new Exception('Composer autoload not found. Run `composer install` in the backend directory to enable GCS uploads.');
        }
        require_once $autoload;

        $bucketName = getenv('GCS_BUCKET');
        if (!$bucketName) {
            throw new Exception('GCS_BUCKET not configured.');
        }

        // Validate file (similar checks as local fallback)
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

        $ext = $allowed[$mime];
        $objectName = 'img_' . bin2hex(random_bytes(12)) . '.' . $ext;

        // Create storage client (uses service account configured in Cloud Run)
        $storage = new StorageClient();
        $bucket = $storage->bucket($bucketName);

        $options = [
            'name' => $objectName,
            'predefinedAcl' => 'private',
            'metadata' => [
                'contentType' => $mime
            ]
        ];

        $object = $bucket->upload(fopen($file['tmp_name'], 'r'), $options);

        // Return object name; to serve, create signed URL or make public if appropriate
        $make_public = getenv('GCS_PUBLIC') === '1' || getenv('GCS_PUBLIC') === 'true';
        if ($make_public) {
            $object->update(['acl' => []], ['predefinedAcl' => 'PUBLICREAD']);
            return 'https://storage.googleapis.com/' . $bucketName . '/' . $objectName;
        }

        // Otherwise return object path and callers should generate signed URL when needed
        return ['bucket' => $bucketName, 'object' => $objectName];
    }
}

?>