-- Create WhisperBox Database
CREATE DATABASE IF NOT EXISTS whisperbox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE whisperbox_db;

-- Users table for registered personas
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    persona_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Guest sessions for anonymous posting
CREATE TABLE guest_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    secret_key VARCHAR(100) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Categories for organizing posts
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#666666',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main posts table
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT NOT NULL,
    author_type ENUM('user', 'guest') NOT NULL,
    author_user_id INT NULL,
    author_guest_id INT NULL,
    category_id INT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_anonymous BOOLEAN DEFAULT TRUE,
    mood VARCHAR(20),
    tags VARCHAR(500),
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    support_count INT DEFAULT 0,
    is_moderated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Post interactions (likes, supports)
CREATE TABLE post_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NULL,
    guest_id INT NULL,
    interaction_type ENUM('like', 'support', 'bookmark') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);

-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
('Confessions', 'Share your deepest secrets and confessions', '#E74C3C'),
('Advice', 'Seek or give advice anonymously', '#3498DB'),
('Rants', 'Let out your frustrations and thoughts', '#F39C12'),
('Appreciation', 'Share gratitude and positive thoughts', '#2ECC71'),
('Questions', 'Ask questions you can''t ask elsewhere', '#9B59B6'),
('Stories', 'Share your experiences and stories', '#1ABC9C'),
('Support', 'Offer or seek emotional support', '#E67E22'),
('Random Thoughts', 'Share whatever is on your mind', '#95A5A6');

-- Insert sample users (password: password123)
INSERT INTO users (username, email, password_hash, display_name, persona_description, is_verified) VALUES
('shadow_writer', 'shadow@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Silent Observer', 'Just someone trying to make sense of it all', TRUE),
('quiet_thinker', 'thinker@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Deep Thinker', 'Contemplating life one whisper at a time', TRUE),
('anonymous_soul', 'soul@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Anonymous Soul', 'Finding solace in anonymous expression', TRUE);

-- Insert sample guest sessions
INSERT INTO guest_sessions (session_token, secret_key, ip_address) VALUES 
('guest_abc123xyz789', 'secret_xyz789abc123', '192.168.1.100'),
('guest_def456uvw012', 'secret_uvw012def456', '192.168.1.101');

-- Insert sample posts
INSERT INTO posts (title, content, author_type, author_user_id, category_id, mood, tags) VALUES 
('The weight of silence', 'Sometimes the loudest screams are the ones never heard. Today I realized I''ve been carrying this burden for years.', 'user', 1, 1, 'sad', 'confession, burden, silence'),
('To the stranger who smiled', 'Your small act of kindness today made a bigger difference than you could imagine. Thank you.', 'user', 1, 4, 'happy', 'gratitude, kindness'),
('Am I the only one?', 'Does anyone else feel like they''re just pretending to have it all together?', 'user', 2, 5, 'anxious', 'questions, mental health'),
('Just a thought', 'Sometimes I wonder if anyone ever truly knows anyone else.', 'guest', 1, 1, 'thoughtful', 'thoughts, identity'),
('Why is it so hard?', 'Why is it so hard to make genuine connections these days?', 'guest', 2, 5, 'confused', 'connections, society');

-- Insert sample interactions
INSERT INTO post_interactions (post_id, user_id, interaction_type) VALUES
(1, 2, 'like'),
(1, 3, 'support'),
(2, 1, 'like'),
(3, 1, 'support');

-- Show confirmation
SELECT 'Database setup completed successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as post_count FROM posts;
SELECT COUNT(*) as category_count FROM categories;