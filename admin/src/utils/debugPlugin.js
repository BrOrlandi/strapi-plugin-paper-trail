/**
 * Utility functions to debug Paper Trail plugin registration
 */

// Function to debug the Paper Trail plugin
const debugPaperTrail = () => {
  console.log('====== Paper Trail Plugin Debug ======');
  
  // Check if the plugin is registered in window.strapi
  const strapiExists = !!window.strapi;
  console.log('Strapi global object exists:', strapiExists);
  
  if (strapiExists) {
    // Check plugins
    const plugins = window.strapi.plugins || {};
    console.log('Registered plugins:', Object.keys(plugins));
    
    // Check if paper-trail is registered
    const paperTrailPlugin = plugins['paper-trail'];
    console.log('Paper Trail plugin registered:', !!paperTrailPlugin);
    
    if (paperTrailPlugin) {
      console.log('Paper Trail plugin details:', paperTrailPlugin);
    }
    
    // Check content manager plugin
    const contentManagerPlugin = plugins['content-manager'];
    console.log('Content Manager plugin registered:', !!contentManagerPlugin);
    
    if (contentManagerPlugin) {
      // Check if any injection zones are registered
      if (typeof contentManagerPlugin.getInjectedComponents === 'function') {
        try {
          // Check editView right-links
          const rightLinks = contentManagerPlugin.getInjectedComponents('editView', 'right-links') || [];
          console.log('Injected components in editView right-links:', rightLinks);
          
          // Check if Paper Trail component is injected
          const paperTrailComponent = rightLinks.find(comp => comp.name === 'paper-trail');
          console.log('Paper Trail component injected:', !!paperTrailComponent);
          
          if (paperTrailComponent) {
            console.log('Paper Trail component details:', paperTrailComponent);
          }
        } catch (error) {
          console.error('Error checking injection zones:', error);
        }
      } else {
        console.log('Content Manager getInjectedComponents is not a function');
        console.log('Content Manager plugin structure:', contentManagerPlugin);
      }
    }
    
    // Check current route
    const pathname = window.location.pathname;
    console.log('Current pathname:', pathname);
    
    // Extract content type from URL if applicable
    const matches = pathname.match(/content-manager\/(collection-types|single-types)\/([^/]+)/);
    if (matches && matches.length > 2) {
      const modelType = matches[1];
      const contentType = matches[2];
      console.log('Current content type:', contentType);
      console.log('Model type:', modelType);
      
      // Check if Paper Trail is enabled for this content type
      const contentTypes = window.strapi.contentTypes || {};
      const currentContentType = contentTypes[contentType];
      
      if (currentContentType) {
        console.log('Content type found:', currentContentType);
        const paperTrailEnabled = 
          currentContentType.pluginOptions && 
          currentContentType.pluginOptions.paperTrail && 
          currentContentType.pluginOptions.paperTrail.enabled === true;
        
        console.log('Paper Trail enabled for this content type:', paperTrailEnabled);
      } else {
        console.log('Content type not found in window.strapi.contentTypes');
      }
    }
  }
  
  console.log('====== End Paper Trail Debug ======');
  
  return 'Debug information logged to console';
};

// Function to check the plugin status within components
export const checkPluginStatus = () => {
  console.log('[Paper Trail] Checking plugin status');
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Check if Strapi is loaded
    if (window.strapi) {
      // Check the currentContentTypeLayout
      const currentContentTypeLayout = window.strapi.currentContentTypeLayout;
      console.log('[Paper Trail] Current content type layout:', currentContentTypeLayout);
      
      if (currentContentTypeLayout) {
        // Check if Paper Trail is enabled
        const paperTrailEnabled = 
          currentContentTypeLayout.pluginOptions && 
          currentContentTypeLayout.pluginOptions.paperTrail && 
          currentContentTypeLayout.pluginOptions.paperTrail.enabled === true;
        
        console.log('[Paper Trail] Paper Trail enabled in content type layout:', paperTrailEnabled);
        
        return {
          found: true,
          pluginEnabled: true,
          contentTypeEnabled: paperTrailEnabled
        };
      }
    }
  }
  
  return {
    found: false,
    pluginEnabled: false,
    contentTypeEnabled: false
  };
};

// Attach debug functions to window on load
export const attachDebugFunctionsToWindow = () => {
  if (typeof window !== 'undefined') {
    window.debugPaperTrailPlugin = debugPaperTrail;
  }
};

export default {
  debugPaperTrail,
  checkPluginStatus,
  attachDebugFunctionsToWindow
};