const checkContext = require('../utils/checkContext');
const { getCurrentUser } = require('./user-capture');

module.exports = async (ctx, next) => {
  console.log('[Paper Trail Debug] Middleware entered for URL:', ctx.request.url);
  console.log('[DEBUG] Paper-trail middleware entered with URL:', ctx.request.url, 'Method:', ctx.request.method);
  // Special handling for content type settings requests
  const isSettingsUpdate = ctx.request.url.includes('/content-types/') && 
                         (ctx.request.method === 'PUT' || ctx.request.method === 'POST');
                         
  if (isSettingsUpdate) {
    try {
      // Extract uid from URL
      const matches = ctx.request.url.match(/content-types\/([^/]+)/);
      const uid = matches && matches[1];
      
      if (uid && ctx.request.body) {
        const { pluginOptions } = ctx.request.body;
        
        // Check if Paper Trail settings are in the request
        if (pluginOptions && pluginOptions.paperTrail) {
          const enabled = pluginOptions.paperTrail.enabled === true;
          
          console.log(`Paper Trail middleware detected settings update for ${uid}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
          
          // Update the global registry
          if (global.paperTrailContentTypes) {
            if (enabled) {
              global.paperTrailContentTypes.add(uid);
            } else if (global.paperTrailContentTypes.has(uid)) {
              global.paperTrailContentTypes.delete(uid);
            }
          }
          
          // Update the schema directly
          const schema = strapi.getModel(uid);
          if (schema) {
            schema.pluginOptions = schema.pluginOptions || {};
            schema.pluginOptions.paperTrail = schema.pluginOptions.paperTrail || {};
            schema.pluginOptions.paperTrail.enabled = enabled;
          }
          
          // Update the database configuration
          try {
            // Find existing configuration
            const configs = await strapi.db.query('admin::content-type-configuration').findMany({
              where: { uid }
            });
            
            let config = configs && configs.length > 0 ? configs[0] : null;
            
            if (config) {
              // Update existing configuration
              const settings = config.settings || {};
              settings.pluginOptions = settings.pluginOptions || {};
              settings.pluginOptions.paperTrail = settings.pluginOptions.paperTrail || {};
              settings.pluginOptions.paperTrail.enabled = enabled;
              
              await strapi.db.query('admin::content-type-configuration').update({
                where: { id: config.id },
                data: { settings }
              });
            } else {
              // Create new configuration
              await strapi.db.query('admin::content-type-configuration').create({
                data: {
                  uid,
                  settings: {
                    pluginOptions: {
                      paperTrail: {
                        enabled
                      }
                    }
                  }
                }
              });
            }
            
            console.log(`Paper Trail database configuration ${config ? 'updated' : 'created'} for ${uid}`);
          } catch (dbErr) {
            console.error('Error updating Paper Trail database configuration:', dbErr);
          }
        }
      }
    } catch (settingsErr) {
      console.error('Error processing Paper Trail settings:', settingsErr);
    }
  }

  // Execute the request
  await next();
  
  console.log('[Paper Trail Debug] After next() call for URL:', ctx.request.url, 'Status:', ctx.response.status);

  /**
   * Try/Catch so we don't totally mess with the admin panel if something is wrong
   */
  try {
    // Skip further processing if the response wasn't successful
    if (ctx.response.status >= 400) {
      console.log('[Paper Trail Debug] Skipping due to error status:', ctx.response.status);
      return;
    }
    
    console.log('[Paper Trail Debug] Checking context for URL:', ctx.request.url);
    // Check if this request is relevant for Paper Trail
    const { uid, schema, isAdmin, change } = checkContext(ctx);
    console.log('[Paper Trail Debug] checkContext results:', { uid, isAdmin, change, hasSchema: !!schema });

    // Skip if not a relevant request or schema couldn't be determined
    if (!schema || !uid) {
      return;
    }

    // Check if Paper Trail is enabled for this content type
    // First check our global registry (faster)
    console.log('[Paper Trail Debug] Checking if enabled for uid:', uid);
    console.log('[Paper Trail Debug] Global registry status:', global.paperTrailContentTypes ? `Contains ${global.paperTrailContentTypes.size} content types` : 'Not initialized');
    if (global.paperTrailContentTypes) {
      console.log('[Paper Trail Debug] Registry content types:', Array.from(global.paperTrailContentTypes));
    }
    
    let enabled = global.paperTrailContentTypes && global.paperTrailContentTypes.has(uid);
    console.log('[Paper Trail Debug] Enabled from registry:', enabled);
    
    // As a fallback, check the schema directly
    if (!enabled) {
      const schemaEnabled = schema.pluginOptions?.paperTrail?.enabled === true;
      console.log('[Paper Trail Debug] Schema plugin options:', schema.pluginOptions);
      console.log('[Paper Trail Debug] Checking schema directly:', schemaEnabled);
      enabled = schemaEnabled;
      
      // If it's enabled in the schema but not in our registry, add it
      if (enabled && global.paperTrailContentTypes) {
        global.paperTrailContentTypes.add(uid);
        console.log('[Paper Trail Debug] Added to registry:', uid);
      }
    }

    console.log('[DEBUG] Paper-trail enabled check result:', enabled);
    
    if (enabled) {
      console.log('[DEBUG] Paper-trail is enabled for this content type, proceeding with trail creation');
      // Intercept the body and take a snapshot of the change
      try {
        console.log('[DEBUG] Paper-trail attempting to get service');
        const paperTrailService = global.strapi
          .plugin('paper-trail')
          .service('paperTrailService');
        console.log('[DEBUG] Paper-trail service obtained:', !!paperTrailService);

        // Get the current user from async storage
        console.log('[Paper Trail Debug] About to call getCurrentUser()');
        const currentUser = getCurrentUser();
        console.log('[Paper Trail Debug] Current user from AsyncLocalStorage:', currentUser);
        console.log(`Paper Trail middleware detected user:`, currentUser);
        
        // Create an event object that includes the result and params
        const event = {
          result: ctx.response.body,
          params: {
            ...ctx.params,
            data: ctx.request.body || {},
            user: currentUser, // Add the current user from async storage
            headers: {
              // Add headers so we can extract auth token if needed
              authorization: ctx.request.header?.authorization
            }
          }
        };
        
        // Create a paper trail entry for this change
        await paperTrailService.createPaperTrail(
          event,
          schema,
          uid,
          change,
          isAdmin
        );
        
        console.log(`Paper Trail entry created for ${uid} (${change})`);
      } catch (serviceErr) {
        console.error('Paper Trail service error:', serviceErr);
      }
    }
  } catch (err) {
    // Log the error but don't interrupt request processing
    console.warn('Paper Trail middleware error:', err);
  }
};
