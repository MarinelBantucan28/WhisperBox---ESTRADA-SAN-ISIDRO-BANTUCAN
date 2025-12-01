// Crisis Detection Service for WhisperBox
// Analyzes content for crisis keywords and provides appropriate resources
// Designed to be transparent, not use AI, and preserve anonymity

import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

// Crisis keywords database - dynamically loaded
let crisisDatabase = null;

// Initialize crisis keywords from local JSON file
export async function initializeCrisisDetection() {
  try {
    const response = await fetch('./crisis_keywords.json');
    crisisDatabase = await response.json();
    console.log('Crisis detection initialized with', Object.keys(crisisDatabase).length, 'categories');
  } catch (error) {
    console.error('Failed to load crisis keywords:', error);
    crisisDatabase = {}; // Graceful fallback
  }
}

/**
 * Analyze content for crisis indicators
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @returns {Promise<Object>} Analysis result with detected level and resources
 */
export async function analyzeContentForCrisis(title, content) {
  if (!crisisDatabase || Object.keys(crisisDatabase).length === 0) {
    // If keywords not loaded, try to initialize
    await initializeCrisisDetection();
  }

  const fullText = `${title || ''} ${content || ''}`.toLowerCase().trim();
  
  // Normalize text: remove extra spaces, punctuation that might hide keywords
  const normalizedText = fullText
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .split(' ') // Tokenize
    .map(word => word.trim())
    .filter(word => word.length > 0);

  const results = {
    hasCrisisContent: false,
    level: null, // 'critical', 'high', 'medium', 'low'
    detectedCategories: [], // Which crisis categories matched
    resources: [],
    userMessage: '',
    shouldNotifyModeration: false,
    shouldStoreFlag: false,
    action: '' // What to do (show_resources, queue_for_review, etc)
  };

  // Check each crisis category
  let highestSeverity = null;
  const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const [categoryKey, categoryData] of Object.entries(crisisDatabase)) {
    // Check if any keywords in this category match
    const keywords = categoryData.keywords || [];
    const matchedKeywords = [];

    // Check for multi-word phrases first (more specific)
    const multiWordPhrases = keywords.filter(k => k.split(' ').length > 1);
    for (const phrase of multiWordPhrases) {
      const phraseRegex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
      if (phraseRegex.test(fullText)) {
        matchedKeywords.push(phrase);
      }
    }

    // Then check single words in normalized text
    const singleWords = keywords.filter(k => k.split(' ').length === 1);
    for (const word of singleWords) {
      if (normalizedText.includes(word.toLowerCase())) {
        matchedKeywords.push(word);
      }
    }

    // If we found matches in this category
    if (matchedKeywords.length > 0) {
      results.hasCrisisContent = true;
      results.detectedCategories.push({
        category: categoryKey,
        level: categoryData.level,
        matchedKeywords: matchedKeywords
      });

      // Keep track of highest severity level
      if (!highestSeverity || severityRank[categoryData.level] > severityRank[highestSeverity]) {
        highestSeverity = categoryData.level;
      }

      // Accumulate resources
      if (categoryData.resources) {
        results.resources.push(...categoryData.resources);
      }

      // Set action based on category
      if (!results.action || categoryData.action === 'show_resources_immediately') {
        results.action = categoryData.action;
      }

      results.shouldNotifyModeration = results.shouldNotifyModeration || categoryData.notify_moderation;
      results.shouldStoreFlag = results.shouldStoreFlag || categoryData.store_flag;
    }
  }

  // Set final level based on highest severity found
  if (results.hasCrisisContent) {
    results.level = highestSeverity;
    
    // Set appropriate user message
    const mostSevereCategory = results.detectedCategories
      .sort((a, b) => severityRank[b.level] - severityRank[a.level])[0];
    
    if (mostSevereCategory && crisisDatabase[mostSevereCategory.category]) {
      results.userMessage = crisisDatabase[mostSevereCategory.category].user_message;
    }

    // Deduplicate resources by URL
    const resourceMap = new Map();
    results.resources.forEach(resource => {
      if (!resourceMap.has(resource.url)) {
        resourceMap.set(resource.url, resource);
      }
    });
    results.resources = Array.from(resourceMap.values());
  }

  console.log('Crisis analysis complete:', {
    hasCrisis: results.hasCrisisContent,
    level: results.level,
    categories: results.detectedCategories.length
  });

  return results;
}

/**
 * Log crisis detection for moderation queue (anonymously)
 * Only called if moderation notification needed
 * @param {Object} analysisResult - Result from analyzeContentForCrisis
 * @param {string} letterId - ID of the letter being flagged
 * @returns {Promise<string>} Moderation queue document ID
 */
export async function queueForModeration(analysisResult, letterId) {
  if (!analysisResult.shouldNotifyModeration || !letterId) {
    return null; // Don't queue if not needed
  }

  try {
    const moderationEntry = {
      letterId: letterId,
      reason: analysisResult.level === 'critical' ? 'keyword_crisis_critical' : 'keyword_crisis_high',
      flaggedBy: 'system_keyword_detection', // NOT a user ID
      flaggedAt: serverTimestamp(),
      status: 'pending', // pending, approved, rejected, acknowledged
      crisisLevel: analysisResult.level,
      detectedCategories: analysisResult.detectedCategories.map(c => c.category),
      action: 'review_and_acknowledge', // Moderator just needs to acknowledge they've seen it
      resolutionNotes: '' // Empty until moderator responds
    };

    const docRef = await addDoc(
      collection(db, 'moderation_queue'),
      moderationEntry
    );

    console.log('Crisis content queued for moderation review:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Failed to queue crisis content for moderation:', error);
    // Gracefully fail - don't block posting
    return null;
  }
}

/**
 * Store crisis flag for user's own awareness (optional)
 * If enabled, user can see they've expressed crisis thoughts
 * WARNING: Only store if user is authenticated and explicit opt-in
 * @param {string} userId - Authenticated user ID
 * @param {string} letterId - ID of the letter
 * @param {Object} analysisResult - Result from analyzeContentForCrisis
 * @returns {Promise<boolean>} Success
 */
export async function storeCrisisFlag(userId, letterId, analysisResult) {
  if (!analysisResult.shouldStoreFlag || !userId || !letterId) {
    return false;
  }

  try {
    // Only store if user is authenticated
    const crisisFlag = {
      letterId: letterId,
      level: analysisResult.level,
      categories: analysisResult.detectedCategories.map(c => c.category),
      detectedAt: serverTimestamp(),
      acknowledged: false
    };

    // Store in user's private section - only they can see it
    // Path: users/{uid}/crisis_indicators/{letterId}
    // This is for user's own reference, not tracked publicly
    
    const docRef = await addDoc(
      collection(db, `users/${userId}/crisis_history`),
      crisisFlag
    );

    console.log('Crisis indicator stored for user awareness:', docRef.id);
    return true;
  } catch (error) {
    console.error('Failed to store crisis flag:', error);
    return false; // Don't block posting if this fails
  }
}

/**
 * Get recommended resources based on crisis level
 * @param {string} level - Crisis level ('critical', 'high', 'medium')
 * @returns {Array} Relevant resources
 */
export function getResourcesByLevel(level) {
  if (!crisisDatabase) return [];

  const resources = [];
  const priorityCategories = {
    critical: ['immediate_danger', 'abuse_violence'],
    high: ['self_harm', 'suicidal_ideation', 'abuse_violence'],
    medium: ['serious_mental_health', 'substance_abuse', 'hopelessness']
  };

  const categories = priorityCategories[level] || [];
  
  for (const category of categories) {
    if (crisisDatabase[category]?.resources) {
      resources.push(...crisisDatabase[category].resources);
    }
  }

  // Deduplicate by URL
  const resourceMap = new Map();
  resources.forEach(r => {
    if (!resourceMap.has(r.url)) {
      resourceMap.set(r.url, r);
    }
  });

  return Array.from(resourceMap.values());
}

/**
 * Get crisis statistics for dashboard (admin only)
 * @returns {Promise<Object>} Statistics on crisis content
 */
export async function getCrisisStatistics() {
  try {
    // TODO: Implement when moderation collection is created
    // Returns: {
    //   totalFlagged: 123,
    //   byLevel: { critical: 5, high: 20, medium: 98 },
    //   byCategory: {...},
    //   trends: [...],
    //   responseTime: {...}
    // }
    return {};
  } catch (error) {
    console.error('Failed to get crisis statistics:', error);
    return {};
  }
}

/**
 * Clear old crisis history (user privacy)
 * Keeps only last 6 months of crisis history
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of records deleted
 */
export async function clearOldCrisisHistory(userId) {
  if (!userId) return 0;

  try {
    // TODO: Implement batch delete of old history
    // Query: where('detectedAt', '<', sixMonthsAgo)
    return 0;
  } catch (error) {
    console.error('Failed to clear crisis history:', error);
    return 0;
  }
}

export default {
  initializeCrisisDetection,
  analyzeContentForCrisis,
  queueForModeration,
  storeCrisisFlag,
  getResourcesByLevel,
  getCrisisStatistics,
  clearOldCrisisHistory
};
