/**
 * Utility functions to debug Paper Trail plugin registration in Strapi V5
 */

// Function to debug the Paper Trail plugin
const debugPaperTrailV5 = () => {
  console.log('====== Paper Trail V5 Plugin Debug ======');
  
  // Check window object keys to find where Strapi might be storing things
  console.log('Top level window keys:', Object.keys(window).filter(key => 
    key.includes('strapi') || 
    key.includes('Strapi') || 
    key.includes('plugin') || 
    key.includes('Plugin') ||
    key.includes('content')
  ));
  
  // Look for app or application objects that might contain Strapi
  if (window.__APP__ || window.app || window.application || window.strapi) {
    console.log('Found potential app containers:');
    if (window.__APP__) console.log('- window.__APP__ exists');
    if (window.app) console.log('- window.app exists');
    if (window.application) console.log('- window.application exists');
    if (window.strapi) console.log('- window.strapi exists');
  }

  // Check Redux store if it exists
  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    console.log('Redux DevTools Extension exists - app likely uses Redux');
  }
  
  // Dump the entire window.strapi object structure without values
  if (window.strapi) {
    console.log('window.strapi structure:');
    const mapObjectStructure = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        console.log(newPrefix);
        
        // Don't go too deep to avoid circular references and overwhelming output
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && prefix.split('.').length < 3) {
          mapObjectStructure(obj[key], newPrefix);
        }
      });
    };
    
    mapObjectStructure(window.strapi);
  }
  
  // Look for alternative plugin registries in common locations
  console.log('Looking for alternative plugin locations...');
  
  // Common locations in newer Strapi versions
  const checkPath = (obj, path) => {
    try {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
      }
      return current;
    } catch (e) {
      return undefined;
    }
  };
  
  const possiblePaths = [
    'window.__STRAPI_APP_STATE__.plugins',
    'window.Strapi.plugins',
    'window.strapi.plugins',
    'window.strapi.backendPlugins',
    'window.strapi.currentEnvironment.plugins',
    'window.__STRAPI_PLUGINS__',
    'window.__plugins',
    'window.app.plugins',
    'window.applicationContext.plugins',
    'window.__APP__.plugins'
  ];
  
  possiblePaths.forEach(path => {
    const value = checkPath(window, path.replace('window.', ''));
    if (value) {
      console.log(`Found plugins at ${path}:`, Object.keys(value));
      
      // Check if paper-trail is in this registry
      if (value['paper-trail']) {
        console.log(`[SUCCESS] Paper Trail found at ${path}`);
      }
    }
  });
  
  // Check if we can find the content-manager globally
  const findObjectsWithName = (obj, name, depth = 0, maxDepth = 2, path = 'window') => {
    if (depth > maxDepth || !obj || typeof obj !== 'object') return [];
    
    let found = [];
    
    try {
      // Check current object for the name
      if (obj.name === name || obj.id === name) {
        found.push({ path, object: obj });
      }
      
      // Don't check certain large native browser objects to avoid performance issues
      if (
        obj instanceof Window || 
        obj instanceof Document || 
        obj instanceof HTMLElement ||
        obj instanceof Node ||
        obj === window.performance || 
        obj === window.localStorage || 
        obj === window.sessionStorage
      ) {
        return found;
      }
      
      // Recursively check properties
      Object.keys(obj).forEach(key => {
        try {
          if (
            obj[key] && 
            typeof obj[key] === 'object' && 
            !Array.isArray(obj[key]) && 
            obj[key] !== obj // Avoid circular references
          ) {
            const childPath = `${path}.${key}`;
            const childResults = findObjectsWithName(obj[key], name, depth + 1, maxDepth, childPath);
            found = [...found, ...childResults];
          }
        } catch (e) {
          // Silently ignore permission errors for certain properties
        }
      });
    } catch (e) {
      // Silently ignore any errors during the search
    }
    
    return found;
  };
  
  // Look for content-manager and paper-trail objects
  console.log('Searching for content-manager plugin in window object...');
  const contentManagerResults = findObjectsWithName(window, 'content-manager');
  if (contentManagerResults.length > 0) {
    console.log('Found potential content-manager objects:', contentManagerResults);
  }
  
  console.log('Searching for paper-trail plugin in window object...');
  const paperTrailResults = findObjectsWithName(window, 'paper-trail');
  if (paperTrailResults.length > 0) {
    console.log('Found potential paper-trail objects:', paperTrailResults);
  }
  
  console.log('====== End Paper Trail V5 Debug ======');
  
  return 'V5 Debug information logged to console';
};

// Attach debug functions to window
export const attachV5DebugToWindow = () => {
  if (typeof window !== 'undefined') {
    window.debugPaperTrailV5 = debugPaperTrailV5;
  }
};

export default {
  debugPaperTrailV5,
  attachV5DebugToWindow
};