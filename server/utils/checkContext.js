const allowedMethods = require('./allowedMethods');
const allowedStatuses = require('./allowedStatuses');
const getContentTypeSchema = require('./getContentTypeSchema');
const getPathParams = require('./getPathParams');
const matchAdminPath = require('./matchAdminPath');
const matchApiPath = require('./matchApiPath');
const getChangeType = require('./getChangeType');

module.exports = context => {
  const { method, url } = context.request;
  const { status } = context.response;

  // Early exit for non-API requests
  if (url.startsWith('/admin') && !url.includes('/content-manager/')) {
    // Admin URL that is not content-manager, not relevant for Paper Trail
    return { contentTypeName: null, schema: null };
  }

  /**
   * We have a few things to check here. We're only interested in:
   * - POST | PUT | DELETE methods
   * - Routes that match a regex (admin content type endpoint or content type generated endpoint)
   */

  const allowedStatusCheck = allowedStatuses.includes(status);
  const allowedMethodsCheck = allowedMethods.includes(method);
  const adminMatchCheck = Boolean(matchAdminPath(url));
  const apiMatchCheck = Boolean(matchApiPath(url));

  // Check if request meets Paper Trail tracking criteria
  
  if (
    allowedStatusCheck &&
    allowedMethodsCheck &&
    (adminMatchCheck || apiMatchCheck)
  ) {
    try {
      const params = getPathParams(url, adminMatchCheck);
      const { contentTypeName } = params;

      // Get content type schema
      // This is a performance optimization to skip schema lookup for content types
      // we know don't have Paper Trail enabled
      const schema = getContentTypeSchema(contentTypeName, adminMatchCheck);

      if (!schema) {
        // No schema found, can't track changes
        return { contentTypeName: null, schema: null };
      }

      const uid = schema.uid;
      
      // Check if this content type has Paper Trail enabled using our global registry
      // This registry is populated in bootstrap.js
      if (global.paperTrailContentTypes && !global.paperTrailContentTypes.has(uid)) {
        // Not in our registry, so Paper Trail is not enabled for this content type
        return { contentTypeName: null, schema: null };
      }
      
      const change = getChangeType(method);
      
      // Paper Trail processing request
      
      return { schema, uid, isAdmin: adminMatchCheck, change };
    } catch (error) {
      // Paper Trail checkContext error
      return { contentTypeName: null, schema: null };
    }
  }

  return { contentTypeName: null, schema: null };
};
