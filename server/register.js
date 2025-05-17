const middlewares = require('./middlewares');
const userPermissionSchema = require('./content-types/trail/user-permissions');

module.exports = async ({ strapi }) => {
  console.log('Paper Trail plugin registering...');
  
  // during boot, check if the user-permissions plugin exists
  const userPermissionsContentType = strapi.contentType(
    'plugin::users-permissions.user'
  );

  if (userPermissionsContentType) {
    // if the user permissions plugin is installed, bind the trails directly to the user
    const trailContentType = strapi.contentType('plugin::paper-trail.trail');

    trailContentType.attributes = {
      // Spread previous defined attributes
      ...trailContentType.attributes,
      // Add new attribute
      ...userPermissionSchema
    };
  }

  // Register a direct hook for the admin UI to save paper trail settings
  try {
    const adminContentTypeConfigModel = strapi.db.query('admin::content-type-configuration');
    
    if (adminContentTypeConfigModel) {
      // Add a lifecycle hook to the admin content type configuration model
      strapi.db.lifecycles.subscribe({
        models: ['admin::content-type-configuration'],
        
        async beforeUpdate(event) {
          try {
            const { params, data } = event;
            
            // Check if we're updating plugin settings
            if (data && data.settings && data.settings.pluginOptions) {
              console.log('Paper Trail: Content type configuration being updated:', params.where.id);
              
              // Make sure the update is properly applied
              await strapi.db.query('admin::content-type-configuration').update({
                where: params.where,
                data: {
                  settings: {
                    ...data.settings
                  }
                }
              });
              
              // Update the settings immediately
              const config = await strapi.db.query('admin::content-type-configuration').findOne({
                where: params.where
              });
              
              if (config && config.uid) {
                const contentType = strapi.contentType(config.uid);
                if (contentType && config.settings && config.settings.pluginOptions && config.settings.pluginOptions.paperTrail) {
                  const isEnabled = config.settings.pluginOptions.paperTrail.enabled === true;
                  
                  console.log(`Paper Trail setting for ${config.uid} is now: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
                  
                  // Update the global registry
                  if (global.paperTrailContentTypes) {
                    if (isEnabled) {
                      global.paperTrailContentTypes.add(config.uid);
                    } else if (global.paperTrailContentTypes.has(config.uid)) {
                      global.paperTrailContentTypes.delete(config.uid);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Paper Trail lifecycle error:', error);
          }
        }
      });
      
      console.log('Paper Trail: Direct lifecycle hooks registered for content type configurations');
    }
  } catch (error) {
    console.error('Failed to register Paper Trail direct hooks:', error);
  }

  // Register the Paper Trail middleware for Strapi V5
  try {
    // Get middleware instances
    console.log('[Paper Trail] Getting middleware instances in register.js');
    const paperTrailMiddleware = middlewares.paperTrail({ strapi });
    const userCaptureMiddleware = middlewares.userCapture({ strapi });
    
    console.log('[Paper Trail] userCaptureMiddleware obtained:', !!userCaptureMiddleware);
    
    // Register the user capture middleware (for ALL routes including admin)
    // This ensures we capture the user for any request
    strapi.server.use(userCaptureMiddleware);
    console.log('[Paper Trail] User capture middleware registered for all routes');
    
    // Register the paper trail middleware (only for API routes)
    strapi.server.use((ctx, next) => {
      // Skip processing for admin panel requests
      if (ctx.url.startsWith('/admin')) {
        return next();
      }
      
      // Apply middleware to API requests
      return paperTrailMiddleware(ctx, next);
    });
    
    console.log('Paper Trail middleware registered successfully');
  } catch (error) {
    console.error('Failed to register Paper Trail middleware:', error);
  }
};
