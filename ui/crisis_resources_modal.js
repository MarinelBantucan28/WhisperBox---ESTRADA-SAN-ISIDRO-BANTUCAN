// Crisis Resources Modal Controller
// Handles display and interaction with crisis resources modal
// Integrates with contentAnalysis.js for crisis detection

import { analyzeContentForCrisis, queueForModeration, getResourcesByLevel } from '../services/contentAnalysis.js';
import { auth } from '../firebase.js';

// Modal state
let currentAnalysisResult = null;
let currentPostData = null;
let postCallback = null;

/**
 * Show crisis resources modal with detected resources
 * @param {Object} analysisResult - Result from analyzeContentForCrisis
 * @param {Object} postData - The post data that triggered crisis detection
 * @param {Function} onPost - Callback when user decides to post
 */
export function showCrisisResourcesModal(analysisResult, postData, onPost) {
  if (!analysisResult || !analysisResult.hasCrisisContent) {
    return; // No crisis detected, proceed normally
  }

  currentAnalysisResult = analysisResult;
  currentPostData = postData;
  postCallback = onPost;

  const modal = document.getElementById('crisisResourcesModal');
  if (!modal) {
    console.error('Crisis resources modal not found in DOM');
    // If modal not found, just proceed (graceful fallback)
    if (onPost) onPost(postData);
    return;
  }

  // Populate user message
  const messageElement = document.getElementById('crisisUserMessage');
  if (messageElement) {
    messageElement.textContent = analysisResult.userMessage || 
      'We care about your wellbeing. Please consider reaching out for support.';
  }

  // Populate resources
  populateResources(analysisResult.resources, analysisResult.level);

  // Show category info if applicable
  if (analysisResult.detectedCategories && analysisResult.detectedCategories.length > 0) {
    const primaryCategory = analysisResult.detectedCategories[0].category;
    showCategoryInfo(primaryCategory);
  }

  // Display modal
  modal.style.display = 'flex';
  modal.classList.add('visible');

  // Focus on first button for accessibility
  const firstButton = modal.querySelector('.btn');
  if (firstButton) {
    setTimeout(() => firstButton.focus(), 100);
  }

  // Close on background click (except on content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCrisisModal();
    }
  });

  // Log that resources were shown (for analytics, not linked to user)
  console.log('Crisis resources displayed for level:', analysisResult.level);
}

/**
 * Populate resource items in modal
 * @param {Array} resources - Array of resource objects
 * @param {string} level - Crisis level
 */
function populateResources(resources, level) {
  const resourcesList = document.getElementById('crisisResourcesList');
  if (!resourcesList) return;

  resourcesList.innerHTML = '';

  if (!resources || resources.length === 0) {
    const noResourceMsg = document.createElement('p');
    noResourceMsg.textContent = 'Resources are loading. Please call 911 if you\'re in immediate danger.';
    noResourceMsg.style.color = '#e74c3c';
    noResourceMsg.style.fontWeight = '600';
    resourcesList.appendChild(noResourceMsg);
    return;
  }

  // Filter resources based on crisis level and add high-priority ones first
  const priorityResources = resources.slice(0, 3); // Show top 3 most relevant
  
  priorityResources.forEach((resource) => {
    const item = createResourceElement(resource, level);
    resourcesList.appendChild(item);
  });

  // Add "see all resources" if there are more
  if (resources.length > 3) {
    const seeMore = document.createElement('button');
    seeMore.className = 'resource-link';
    seeMore.textContent = `View ${resources.length - 3} More Resources`;
    seeMore.onclick = () => {
      resourcesList.innerHTML = ''; // Clear
      resources.forEach(resource => {
        const item = createResourceElement(resource, level);
        resourcesList.appendChild(item);
      });
      seeMore.style.display = 'none';
    };
    resourcesList.appendChild(seeMore);
  }
}

/**
 * Create individual resource element
 * @param {Object} resource - Resource object
 * @param {string} level - Crisis level
 * @returns {HTMLElement} Resource item element
 */
function createResourceElement(resource, level) {
  const item = document.createElement('div');
  item.className = 'crisis-resource-item';

  const name = document.createElement('p');
  name.className = 'resource-name';
  name.textContent = resource.name;

  const description = document.createElement('p');
  description.className = 'resource-description';
  description.textContent = resource.description || '';

  const types = document.createElement('div');
  types.className = 'resource-types';

  // Add type badges
  const typeList = (resource.type || 'web').split('_');
  typeList.forEach(type => {
    const badge = document.createElement('span');
    badge.className = `resource-type-badge ${type}`;
    
    const typeLabels = {
      'phone': '📞 Call',
      'text': '💬 Text',
      'chat': '💬 Chat',
      'web': '🌐 Website',
      'email': '📧 Email',
      'emergency': '🚨 Emergency',
      'call': '📞 Call',
      'meetings': '👥 Meetings'
    };
    
    badge.textContent = typeLabels[type] || type.toUpperCase();
    types.appendChild(badge);
  });

  const link = document.createElement('a');
  link.className = level === 'critical' ? 'resource-link emergency' : 'resource-link';
  link.href = resource.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = level === 'critical' ? '🚨 Get Help Now' : 'Learn More & Get Help';

  item.appendChild(name);
  item.appendChild(description);
  item.appendChild(types);
  item.appendChild(link);

  return item;
}

/**
 * Show additional category-specific information
 * @param {string} category - Crisis category key
 */
function showCategoryInfo(category) {
  const categorySection = document.getElementById('crisisCategory');
  if (!categorySection) return;

  const categoryNames = {
    'immediate_danger': 'Immediate Danger',
    'self_harm': 'Self-Harm',
    'suicidal_ideation': 'Suicidal Thoughts',
    'serious_mental_health': 'Mental Health Crisis',
    'substance_abuse': 'Substance Abuse',
    'abuse_violence': 'Abuse or Violence',
    'bullying': 'Bullying or Harassment',
    'hopelessness': 'Hopelessness or Despair'
  };

  document.getElementById('categoryName').textContent = categoryNames[category] || category;
  categorySection.style.display = 'block';
}

/**
 * Close modal without posting
 */
export function closeWithoutPosting() {
  closeCrisisModal();
  
  // Optionally show message
  alert('Thank you for considering reaching out. Help is available whenever you need it.');
  
  // User can still share later if they want
}

/**
 * Close modal and proceed with posting
 */
export function proceedWithPosting() {
  closeCrisisModal();
  
  // Call the original post callback
  if (postCallback && currentPostData) {
    postCallback(currentPostData);
  }
}

/**
 * Close crisis modal
 */
export function closeCrisisModal() {
  const modal = document.getElementById('crisisResourcesModal');
  if (modal) {
    modal.classList.remove('visible');
    modal.style.display = 'none';
  }
  
  // Reset state
  currentAnalysisResult = null;
  currentPostData = null;
  postCallback = null;
}

/**
 * Queue crisis content for moderation (called after post succeeds)
 * @param {string} letterId - ID of the posted letter
 * @returns {Promise<string|null>} Moderation queue ID or null
 */
export async function queueCrisisForModeration(letterId) {
  if (!currentAnalysisResult || !currentAnalysisResult.shouldNotifyModeration) {
    return null;
  }

  try {
    const moderationId = await queueForModeration(currentAnalysisResult, letterId);
    console.log('Crisis content queued for moderation:', moderationId);
    return moderationId;
  } catch (error) {
    console.error('Failed to queue crisis content:', error);
    return null;
  }
}

/**
 * Initialize crisis modal on page load
 * Loads from HTML include and sets up event listeners
 */
export function initializeCrisisModal() {
  const modal = document.getElementById('crisisResourcesModal');
  
  if (!modal) {
    console.warn('Crisis resources modal not found in DOM');
    return;
  }

  // Set up close button
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCrisisModal);
  }

  // Set up keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeCrisisModal();
    }
  });

  console.log('Crisis resources modal initialized');
}

/**
 * Get crisis detection statistics
 * For dashboard/analytics (no PII)
 * @returns {Object} Statistics object
 */
export function getCrisisDetectionStats() {
  // TODO: Implement stats tracking if needed
  return {
    resourcesShown: 0,
    usersContinuedPosting: 0,
    usersViewedResources: 0
  };
}

export default {
  showCrisisResourcesModal,
  closeCrisisModal,
  closeWithoutPosting,
  proceedWithPosting,
  queueCrisisForModeration,
  initializeCrisisModal,
  getCrisisDetectionStats
};
