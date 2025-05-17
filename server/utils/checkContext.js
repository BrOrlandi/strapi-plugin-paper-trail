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
  console.log('[DEBUG] checkContext analyzing URL:', url);
  if (url.startsWith('/admin') && !url.includes('/content-manager/')) {
    console.log('[DEBUG] checkContext early exit - admin URL that is not content-manager');
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

  console.log('[DEBUG] checkContext checks:', {
    allowedStatusCheck,
    allowedMethodsCheck,
    adminMatchCheck,
    apiMatchCheck,
    status,
    method
  });
  
  if (
    allowedStatusCheck &&
    allowedMethodsCheck &&
    (adminMatchCheck || apiMatchCheck)
  ) {
    try {
      const params = getPathParams(url, adminMatchCheck);
      const { contentTypeName } = params;

      console.log('[DEBUG] checkContext contentTypeName:', contentTypeName);
      
      // Check if we already know this content type has Paper Trail enabled
      // This is a performance optimization to skip schema lookup for content types
      // we know don't have Paper Trail enabled
      const schema = getContentTypeSchema(contentTypeName, adminMatchCheck);
      console.log('[DEBUG] checkContext schema obtained:', schema?.uid || 'null');

      if (!schema) {
        console.log('[DEBUG] checkContext early exit - no schema found');
        return { contentTypeName: null, schema: null };
      }

      const uid = schema.uid;
      
      // Check if this content type has Paper Trail enabled using our global registry
      // This registry is populated in bootstrap.js
      console.log('[DEBUG] checkContext checking global registry for:', uid);
      console.log('[DEBUG] checkContext global registry contains:', 
        global.paperTrailContentTypes ? Array.from(global.paperTrailContentTypes) : 'undefined');
        
      if (global.paperTrailContentTypes && !global.paperTrailContentTypes.has(uid)) {
        // Not in our registry, so Paper Trail is not enabled for this content type
        console.log('[DEBUG] checkContext early exit - not in global registry');
        return { contentTypeName: null, schema: null };
      }
      
      const change = getChangeType(method);
      
      console.log(`Paper Trail processing ${change} for ${uid}`);
      
      return { schema, uid, isAdmin: adminMatchCheck, change };
    } catch (error) {
      console.error('Paper Trail checkContext error:', error);
      return { contentTypeName: null, schema: null };
    }
  }

  return { contentTypeName: null, schema: null };
};
