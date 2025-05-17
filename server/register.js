const middlewares = require('./middlewares');
const userPermissionSchema = require('./content-types/trail/user-permissions');

module.exports = async ({ strapi }) => {
  // Paper Trail plugin registration

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

  // Register the Paper Trail middleware for Strapi V5
  try {
    // Get middleware instances
    // Get middleware instances
    const paperTrailMiddleware = middlewares.paperTrail({ strapi });
    const userCaptureMiddleware = middlewares.userCapture({ strapi });

    // Register the user capture middleware (for ALL routes including admin)
    // This ensures we capture the user for any request
    strapi.server.use(userCaptureMiddleware);
    // User capture middleware registered for all routes

    // Register the paper trail middleware (only for API routes)
    strapi.server.use((ctx, next) => {
      // Skip processing for admin panel requests
      if (ctx.url.startsWith('/admin')) {
        return next();
      }

      // Apply middleware to API requests
      return paperTrailMiddleware(ctx, next);
    });

    // Paper Trail middleware registered successfully
  } catch (error) {
    // Failed to register Paper Trail middleware
  }
};
