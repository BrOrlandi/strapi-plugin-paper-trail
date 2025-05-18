/**
 * Helper function to check if Paper Trail is enabled for a content type
 * This is used as a fallback when the React component cannot be properly injected
 */

// Function to check if paper trail is enabled for this content type using the API
export const isPaperTrailEnabled = async (contentType) => {
  try {
    if (!contentType) return false;
    
    // First check our in-memory cache if we have it
    if (window.paperTrailEnabledContentTypes && Array.isArray(window.paperTrailEnabledContentTypes)) {
      return window.paperTrailEnabledContentTypes.includes(contentType);
    }
    
    // Try to use our dedicated endpoint to check if Paper Trail is enabled
    // Use the correct Strapi V5 path format first
    try {
      const apiEndpoint = `/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`;
      console.log(`[Paper Trail] Checking if ${contentType} is enabled using endpoint: ${apiEndpoint}`);
      
      const response = await fetch(apiEndpoint);
      console.log(`[Paper Trail] Response status for ${contentType}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Paper Trail] Data for ${contentType}:`, data);
        return data.enabled === true;
      }
    } catch (apiError) {
      console.log(`[Paper Trail] Error checking with V5 endpoint for ${contentType}:`, apiError);
      
      // Fallback to legacy path format
      try {
        const legacyEndpoint = `/api/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`;
        console.log(`[Paper Trail] Trying legacy endpoint for ${contentType}: ${legacyEndpoint}`);
        
        const legacyResponse = await fetch(legacyEndpoint);
        console.log(`[Paper Trail] Legacy response status for ${contentType}:`, legacyResponse.status);
        
        if (legacyResponse.ok) {
          const data = await legacyResponse.json();
          console.log(`[Paper Trail] Legacy data for ${contentType}:`, data);
          return data.enabled === true;
        }
      } catch (legacyError) {
        console.log(`[Paper Trail] Error checking with legacy endpoint for ${contentType}:`, legacyError);
      }
    }
    
    // If we failed to check or got a negative result, check our hard-coded list
    const knownEnabledTypes = ['api::product.product', 'api::category.category'];
    return knownEnabledTypes.includes(contentType);
  } catch (error) {
    console.error('[Paper Trail] Error checking if enabled:', error);
    return false;
  }
};

// Function to extract content type from URL
export const extractContentTypeFromUrl = () => {
  const pathname = window.location.pathname;
  // Example URL: /admin/content-manager/collection-types/api::product.product/1
  const matches = pathname.match(/content-manager\/(collection-types|single-types)\/([^/]+)/);
  if (matches && matches.length > 2) {
    return {
      modelType: matches[1],
      contentType: matches[2],
      id: pathname.split('/').pop()
    };
  }
  return null;
};

// This function exposes utilities to the global window object for easy access
export const attachContentTypeHelperToWindow = () => {
  if (typeof window !== 'undefined') {
    window.paperTrailHelper = {
      isPaperTrailEnabled,
      extractContentTypeFromUrl,
      getContentTypeInfo: async () => {
        const info = extractContentTypeFromUrl();
        if (info) {
          info.enabled = await isPaperTrailEnabled(info.contentType);
          return info;
        }
        return null;
      }
    };
  }
};

export default {
  isPaperTrailEnabled,
  extractContentTypeFromUrl,
  attachContentTypeHelperToWindow
};