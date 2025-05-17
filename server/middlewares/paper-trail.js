const checkContext = require('../utils/checkContext');
const { getCurrentUser } = require('./user-capture');

module.exports = async (ctx, next) => {
  // Middleware start
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
          
          // Paper Trail settings update detected
          
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
            
            // Paper Trail database configuration updated
          } catch (dbErr) {
            // Silent error handling for database configuration updates
          }
        }
      }
    } catch (settingsErr) {
      // Silent error handling for Paper Trail settings processing
    }
  }

  // Execute the request
  await next();

  /**
   * Try/Catch so we don't totally mess with the admin panel if something is wrong
   */
  try {
    // Skip further processing if the response wasn't successful
    if (ctx.response.status >= 400) {
      return;
    }
    
    // Check if this request is relevant for Paper Trail
    const { uid, schema, isAdmin, change } = checkContext(ctx);

    // Skip if not a relevant request or schema couldn't be determined
    if (!schema || !uid) {
      return;
    }

    // Check if Paper Trail is enabled for this content type
    // First check our global registry (faster)
    let enabled = global.paperTrailContentTypes && global.paperTrailContentTypes.has(uid);
    
    // As a fallback, check the schema directly
    if (!enabled) {
      const schemaEnabled = schema.pluginOptions?.paperTrail?.enabled === true;
      enabled = schemaEnabled;
      
      // If it's enabled in the schema but not in our registry, add it
      if (enabled && global.paperTrailContentTypes) {
        global.paperTrailContentTypes.add(uid);
      }
    }
    
    if (enabled) {
      // Intercept the body and take a snapshot of the change
      try {
        const paperTrailService = global.strapi
          .plugin('paper-trail')
          .service('paperTrailService');

        // Get the current user from async storage
        const currentUser = getCurrentUser();
        
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
        
        // Trail created
      } catch (serviceErr) {
        // Paper Trail service error
      }
    }
  } catch (err) {
    // Log the error but don't interrupt request processing
    // Silent error handling in middleware
  }
};
