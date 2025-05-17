/**
 * Paper Trail user capture middleware
 * 
 * This middleware captures the authenticated user from the request
 * and stores it in an async storage that's accessible throughout the request lifecycle.
 * This ensures that the correct user is associated with Paper Trail entries
 * even in concurrent or nested operations.
 */

const { AsyncLocalStorage } = require('async_hooks');

// Create a global async local storage for user context
global.paperTrailUserStorage = global.paperTrailUserStorage || new AsyncLocalStorage();

/**
 * Middleware to capture the authenticated user and store it for the current request
 */
module.exports = ({ strapi }) => {
  console.log('[Paper Trail] User-capture middleware initialized');
  
  return async (ctx, next) => {
    // Try to get the user from various sources
    let user = null;
    
    // 1. Check ctx.state.user (standard authentication)
    if (ctx.state?.user) {
      user = ctx.state.user;
    }
    
    // 2. Check for JWT token directly if no user was found
    if (!user && ctx.request.header?.authorization) {
      try {
        // Get the token from the authorization header
        const token = ctx.request.header.authorization.replace('Bearer ', '');
        
        // Simple decode first to get the user ID
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const decoded = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            
            if (decoded && decoded.id) {
              // Use the JWT service directly
              const jwtService = strapi.plugin('users-permissions').service('jwt');
              await jwtService.verify(token); // Just to validate the token
              
              // Now get the user directly
              user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: decoded.id }
              });
              
              if (user) {
                console.log(`[Paper Trail] Found user from JWT: ${user.username || user.email} (ID: ${user.id})`);
              }
            }
          }
        } catch (error) {
          console.log('[Paper Trail] Error processing JWT:', error.message);
        }
      } catch (error) {
        console.log('[Paper Trail] Failed to process authorization header:', error.message);
      }
    }
    
    // 3. Try to fetch admin user for admin panel requests
    if (!user && 
        (ctx.request.header?.referer?.includes('/admin') || 
         ctx.url.startsWith('/admin'))) {
      try {
        // Try to use Strapi's admin authorization service if available
        if (strapi.admin?.services?.token) {
          const tokenService = strapi.admin.services.token;
          const authHeader = ctx.request.header.authorization;
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const adminToken = authHeader.substring(7);
            try {
              const { payload } = await tokenService.decodeJwtToken(adminToken);
              
              if (payload && payload.id) {
                user = await strapi.db.query('admin::user').findOne({
                  where: { id: payload.id }
                });
                
                if (user) {
                  console.log(`[Paper Trail] Found admin user: ${user.firstname} ${user.lastname} (ID: ${user.id})`);
                }
              }
            } catch (tokenError) {
              console.log('[Paper Trail] Admin token verification failed:', tokenError.message);
            }
          }
        }
      } catch (error) {
        console.log('[Paper Trail] Failed to process admin request:', error.message);
      }
    }
    
    // Determine if user is an admin (has firstname/lastname instead of username, or has the admin role)
    if (user) {
      // Admin users have firstname/lastname instead of username, 
      // or path includes admin, or if it has the 'strapi-super-admin' role
      const isAdminUser = 
        (user.firstname !== undefined && user.lastname !== undefined) || 
        ctx.url.includes('/admin') ||
        user.roles?.some(role => role.code === 'strapi-super-admin') || 
        false;
      
      console.log(`[Paper Trail] User captured for ${ctx.url}: ${isAdminUser ? 'Admin' : 'Regular'} user ID ${user.id}`);
      
      // Add an explicit isAdmin flag to the user object
      user.isAdminUser = isAdminUser;
    }
    
    // Create a storage context with the user information and the entire ctx for access later
    const storageContext = {
      user,
      requestId: ctx.request.id || Date.now().toString(),
      timestamp: Date.now(),
      ctx // Store the entire context for access later
    };
    
    // Use AsyncLocalStorage to maintain the user context throughout the request
    await global.paperTrailUserStorage.run(storageContext, async () => {
      // Continue to the next middleware
      await next();
    });
  };
};

/**
 * Get the current user from the async storage
 * This can be called from anywhere in the request lifecycle
 */
module.exports.getCurrentUser = () => {
  // Check if the storage exists
  if (!global.paperTrailUserStorage) {
    return null;
  }
  
  // Get the storage context
  const storageContext = global.paperTrailUserStorage.getStore();
  
  // Get the user from the context
  return storageContext?.user || null;
};