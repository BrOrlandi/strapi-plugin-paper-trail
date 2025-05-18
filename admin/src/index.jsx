import pluginPkg from '../../package.json';
import Initializer from './components/Initializer';
import PaperTrail from './components/PaperTrail/PaperTrail.jsx';
import injectionZones from './injectionZones';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';
import * as yup from 'yup';

// Import debug and injection utilities
import { attachDebugFunctionsToWindow } from './utils/debugPlugin';
import { attachV5DebugToWindow } from './utils/debugPluginV5';
import { attachDirectInjectionToWindow } from './utils/directInjection';
import { attachVanillaInjectionToWindow } from './utils/vanillaInjection';
import { attachContentTypeHelperToWindow } from './utils/contentTypeHelper';

// Custom implementation of prefixPluginTranslations
const prefixPluginTranslations = (data, pluginId) => {
  return Object.keys(data).reduce((acc, key) => {
    acc[`${pluginId}.${key}`] = data[key];
    return acc;
  }, {});
};

const name = pluginPkg.strapi.name;

// Simplified plugin registration for Strapi V5
export default {
  register(app) {
    // Simpler plugin registration that works with V5's expectations
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });

    // Remove the settings page registration if it exists
    // app.addSettingsLink('global', {
    //   id: 'paper-trail-settings',
    //   to: `/settings/${pluginId}`,
    //   name: getTrad('plugin.name', 'Paper Trail Settings'),
    //   Component: SettingsPage, // REMOVING THIS
    //   permissions: [], // Add appropriate permissions if needed
    // });

    // Extend the Content-Type Builder form for Strapi V5 - simpler approach
    try {
      const ctb = app.getPlugin('content-type-builder');
      
      if (ctb && ctb.apis && ctb.apis.forms) {
        const formsAPI = ctb.apis.forms;
        
        // Use a simpler approach: just extend the content type with a disabled field
        formsAPI.extendContentType({
          validator: () => ({
            pluginOptions: {
              paperTrail: {
                enabled: yup.boolean(),
              },
            },
          }),
          form: {
            advanced() {
              return [
                {
                  name: 'pluginOptions.paperTrail.enabled',
                  type: 'checkbox', // Show a checkbox disabled
                  intlLabel: {
                    id: getTrad('plugin.schema.paperTrail.label-content-type'),
                    defaultMessage: 'Paper Trail',
                  },
                  description: {
                    id: getTrad('plugin.schema.paperTrail.read-only-description'),
                    defaultMessage: 'Read-only: Paper Trail can only be configured in the schema.json file',
                  },
                  disabled: true, // Make it read-only
                },
              ];
            },
          },
        });
      }
    } catch (error) {
      // Silently handle errors
    }

    // Register the settings page (if any)
    // Example: app.addSettingsLink('global', { ... });
  },

  bootstrap(app) {
    // Attach debug functions to window for browser console debugging
    attachDebugFunctionsToWindow();
    attachV5DebugToWindow();
    attachDirectInjectionToWindow();
    attachVanillaInjectionToWindow();
    attachContentTypeHelperToWindow();
    
    // Fetch the list of content types that have Paper Trail enabled
    if (typeof window !== 'undefined') {
      // Add function to fetch enabled content types
      window.fetchPaperTrailEnabledContentTypes = async () => {
        try {
          console.log('[Paper Trail] Attempting to fetch enabled content types');
          // Use the correct Strapi V5 path format
          const apiEndpoint = '/paper-trail/enabled-content-types';
          const legacyEndpoint = '/api/paper-trail/enabled-content-types';
          console.log('[Paper Trail] Using endpoint:', apiEndpoint);
          
          // Try the correct V5 endpoint first
          let response;
          try {
            response = await fetch(apiEndpoint);
            console.log('[Paper Trail] Response status:', response.status);
          } catch (error) {
            console.log('[Paper Trail] Error with V5 endpoint, trying legacy endpoint:', error);
            response = await fetch(legacyEndpoint);
            console.log('[Paper Trail] Legacy response status:', response.status);
          }
          
          if (response.ok) {
            const data = await response.json();
            console.log('[Paper Trail] Received data:', data);
            
            if (data.contentTypes && Array.isArray(data.contentTypes)) {
              window.paperTrailEnabledContentTypes = data.contentTypes;
              console.log('[Paper Trail] Loaded enabled content types:', window.paperTrailEnabledContentTypes);
              return data.contentTypes;
            }
          } else {
            console.log('[Paper Trail] Error response from API:', await response.text());
          }
        } catch (error) {
          console.error('[Paper Trail] Error fetching enabled content types:', error);
        }
        
        // As a fallback, provide some default enabled content types
        window.paperTrailEnabledContentTypes = ['api::product.product', 'api::category.category'];
        console.log('[Paper Trail] Using fallback content types:', window.paperTrailEnabledContentTypes);
        return window.paperTrailEnabledContentTypes;
      };
      
      // Try to fetch it once when the plugin loads
      window.fetchPaperTrailEnabledContentTypes();
    
      // Set up automatic injection after page loads
      const setupAutoInjection = () => {
        if (document.readyState === 'complete') {
          // Set a timeout to allow Strapi to finish rendering
          setTimeout(() => {
            // Track current URL
            let lastUrl = window.location.href;
            console.log('[Paper Trail] Setting up URL change detection from:', lastUrl);
            
            // Try the direct DOM injection with retry mechanism
            try {
              // Try vanilla injection with retry for more reliability
              if (window.injectPaperTrailWithRetry) {
                window.injectPaperTrailWithRetry(5, 500); // 5 retries, 500ms interval
              } else if (window.injectVanillaPaperTrail) {
                window.injectVanillaPaperTrail();
              } else if (window.findAndAddPaperTrailMessage) {
                window.findAndAddPaperTrailMessage();
              }
            } catch (error) {
              console.error('[Paper Trail] Auto-injection error:', error);
            }
            
            // Set up observer to detect URL changes (for SPA navigation)
            const observer = new MutationObserver(() => {
              if (window.location.href !== lastUrl) {
                console.log('[Paper Trail] URL changed from:', lastUrl, 'to:', window.location.href);
                lastUrl = window.location.href;
                
                // Wait for content to load after navigation
                setTimeout(() => {
                  try {
                    // Try vanilla injection with retry for more reliability
                    if (window.injectPaperTrailWithRetry) {
                      window.injectPaperTrailWithRetry(5, 500); // 5 retries, 500ms interval
                    } else if (window.injectVanillaPaperTrail) {
                      window.injectVanillaPaperTrail();
                    } else if (window.findAndAddPaperTrailMessage) {
                      window.findAndAddPaperTrailMessage();
                    }
                  } catch (error) {
                    console.error('[Paper Trail] Navigation injection error:', error);
                  }
                }, 1000);
              }
            });
            
            // Start observing body for changes
            observer.observe(document.body, { childList: true, subtree: true });
          }, 2000); // Wait 2 seconds to ensure Strapi admin UI is fully loaded
        } else {
          // If not complete, listen for load event
          window.addEventListener('load', () => {
            setTimeout(() => {
              try {
                // Try vanilla injection with retry for more reliability
                if (window.injectPaperTrailWithRetry) {
                  window.injectPaperTrailWithRetry(5, 500); // 5 retries, 500ms interval
                } else if (window.injectVanillaPaperTrail) {
                  window.injectVanillaPaperTrail();
                } else if (window.findAndAddPaperTrailMessage) {
                  window.findAndAddPaperTrailMessage();
                }
              } catch (error) {
                console.error('[Paper Trail] Load event injection error:', error);
              }
            }, 2000);
          });
        }
      };
      
      // Run setup
      setupAutoInjection();
    }
    
    // Register components in the injection zones for Strapi V5
    try {
      console.log('[Paper Trail DEBUG] Starting bootstrap function');
      const contentManager = app.getPlugin('content-manager');
      console.log('[Paper Trail DEBUG] Content Manager plugin:', contentManager ? 'Found' : 'Not found');
      
      if (contentManager && injectionZones.admin) {
        console.log('[Paper Trail DEBUG] injectionZones.admin:', Object.keys(injectionZones.admin));
        
        Object.entries(injectionZones.admin).forEach(([zone, components]) => {
          console.log(`[Paper Trail DEBUG] Processing zone: ${zone} with ${components.length} components`);
          
          // Extract parts from zone name (format: 'content-manager.editView.right-links')
          const parts = zone.split('.');
          if (parts.length >= 3) {
            const viewPart = parts[1]; // e.g. 'editView'
            const zonePart = parts[2]; // e.g. 'right-links'
            console.log(`[Paper Trail DEBUG] Extracted parts - viewPart: ${viewPart}, zonePart: ${zonePart}`);
            
            if (Array.isArray(components)) {
              components.forEach((componentFn) => {
                // Get the component to inject
                const component = componentFn();
                console.log('[Paper Trail DEBUG] Component to inject:', component);
                contentManager.injectComponent(viewPart, zonePart, component);
                console.log(`[Paper Trail DEBUG] Injected component into ${viewPart}.${zonePart}`);
              });
            }
          }
        });
      }
      
      // Alternative direct injection method
      try {
        console.log('[Paper Trail DEBUG] Trying alternative direct component injection');
        if (contentManager && typeof contentManager.injectComponent === 'function') {
          // We'll set up an async function to check if Paper Trail is enabled
          const setupPaperTrailComponent = async () => {
            try {
              // First check if Paper Trail is enabled for the current content type
              if (window.paperTrailHelper) {
                // Wait for the DOM to be fully loaded
                setTimeout(async () => {
                  const contentInfo = window.paperTrailHelper.extractContentTypeFromUrl();
                  if (contentInfo?.contentType) {
                    const isEnabled = await window.paperTrailHelper.isPaperTrailEnabled(contentInfo.contentType);
                    
                    if (isEnabled) {
                      // Directly create the component to inject
                      const paperTrailComponent = {
                        name: 'paper-trail',
                        Component: PaperTrail,
                      };
                      
                      // Inject it manually
                      contentManager.injectComponent('editView', 'right-links', paperTrailComponent);
                      console.log('[Paper Trail DEBUG] Direct component injection successful');
                    } else {
                      console.log(`[Paper Trail DEBUG] Paper Trail not enabled for ${contentInfo.contentType}, skipping injection`);
                    }
                  }
                }, 1000);
              }
            } catch (error) {
              console.error('[Paper Trail DEBUG] Error in setupPaperTrailComponent:', error);
            }
          };
          
          // Start the async setup
          setupPaperTrailComponent();
          
          // Define a force inject function that can be called from the console
          const forceInjectFunction = async () => {
            console.log('Force injecting Paper Trail component...');
            try {
              // First check if Paper Trail is enabled for the current content type
              const contentInfo = window.paperTrailHelper?.extractContentTypeFromUrl();
              if (!contentInfo?.contentType) {
                console.log('No content type found in URL, skipping Paper Trail injection');
                return false;
              }
              
              const isEnabled = await window.paperTrailHelper?.isPaperTrailEnabled(contentInfo.contentType);
              if (!isEnabled) {
                console.log(`Paper Trail not enabled for ${contentInfo.contentType}, skipping component injection`);
                return false;
              }
              
              const strapiPlugins = window.strapi?.plugins || {};
              const cm = strapiPlugins['content-manager'];
              
              if (cm && typeof cm.injectComponent === 'function') {
                // Import the PaperTrail component
                const injectedComponent = {
                  name: 'paper-trail',
                  Component: PaperTrail,
                };
                
                cm.injectComponent('editView', 'right-links', injectedComponent);
                console.log('Paper Trail component injected successfully!');
                return true;
              } else {
                console.error('Content manager plugin not found or missing injectComponent');
                return false;
              }
            } catch (err) {
              console.error('Error injecting component:', err);
              return false;
            }
          };
          
          // Expose the function to the window object if in browser
          if (typeof window !== 'undefined') {
            window.paperTrailForceInject = forceInjectFunction;
          }
        } else {
          console.log('[Paper Trail DEBUG] Content manager injectComponent method not available');
        }
      } catch (injectionError) {
        console.error('[Paper Trail DEBUG] Alternative injection error:', injectionError);
      }
    } catch (error) {
      console.error('[Paper Trail DEBUG] Error in bootstrap function:', error);
    }
  },
  
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map(locale => {
        return import(
          /* webpackChunkName: "pt-translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale
            };
          })
          .catch(() => {
            return {
              data: {},
              locale
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  }
};