/**
 * Custom hooks for Strapi V5 compatibility
 * These hooks replicate functionality from @strapi/helper-plugin
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to handle fetch requests
 */
export const useFetchClient = () => {
  const makeRequest = async (method, url, data = null, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const config = {
      method,
      headers,
      ...options
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      // Fetch error
      throw error;
    }
  };

  const get = useCallback((url, options = {}) => makeRequest('GET', url, null, options), []);
  const post = useCallback((url, data, options = {}) => makeRequest('POST', url, data, options), []);
  const put = useCallback((url, data, options = {}) => makeRequest('PUT', url, data, options), []);
  const del = useCallback((url, options = {}) => makeRequest('DELETE', url, null, options), []);

  return { get, post, put, del };
};

/**
 * A custom hook to access content manager context
 */
export const useContentManagerContext = () => {
  // This hook should ideally get context from the app
  // For now, we'll return a minimal context
  console.log('[Paper Trail DEBUG] useContentManagerContext initializing');
  console.log('[Paper Trail DEBUG] window.strapi?.contentManager?.currentModel:', window.strapi?.contentManager?.currentModel);
  
  // Check if we can access the content manager data from the window object
  const strapiPlugins = window.strapi?.plugins || {};
  const contentManagerPlugin = strapiPlugins['content-manager'];
  console.log('[Paper Trail DEBUG] Strapi content manager plugin:', contentManagerPlugin ? 'Found' : 'Not found');
  
  const [context, setContext] = useState({
    model: window.strapi?.contentManager?.currentModel || { attributes: {} }
  });

  useEffect(() => {
    // Try to get model from global or location
    const pathname = window.location.pathname;
    console.log('[Paper Trail DEBUG] Current pathname:', pathname);
    
    let contentType = '';
    let modelType = '';

    // Try to extract content type from URL
    // Example URL: /admin/content-manager/collection-types/api::article.article/1
    const matches = pathname.match(/content-manager\/(collection-types|single-types)\/([^/]+)/);
    console.log('[Paper Trail DEBUG] URL regex matches:', matches);
    
    if (matches && matches.length > 2) {
      modelType = matches[1];
      contentType = matches[2];
      console.log(`[Paper Trail DEBUG] Extracted model type: ${modelType}, content type: ${contentType}`);
    }

    if (contentType) {
      console.log(`[Paper Trail DEBUG] Setting content type in context: ${contentType}`);
      
      // Check if a plugin for this content type exists in window.strapi
      const contentTypePlugin = Object.values(strapiPlugins).find(plugin => 
        plugin.contentTypes && plugin.contentTypes[contentType]);
      
      console.log('[Paper Trail DEBUG] Found content type plugin:', contentTypePlugin ? 'Yes' : 'No');
      
      // Get the plugin options from the content type data if available
      const contentTypeData = contentTypePlugin?.contentTypes?.[contentType];
      console.log('[Paper Trail DEBUG] Content type data:', contentTypeData);
      
      setContext(prev => ({
        ...prev,
        model: {
          ...prev.model,
          uid: contentType,
          attributes: prev.model.attributes,
          pluginOptions: contentTypeData?.pluginOptions || {}
        }
      }));
    }
  }, []);

  return context;
};