const checkContext = require('../utils/checkContext');
const { getCurrentUser } = require('./user-capture');

module.exports = async (ctx, next) => {
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
    let enabled =
      global.paperTrailContentTypes && global.paperTrailContentTypes.has(uid);

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
