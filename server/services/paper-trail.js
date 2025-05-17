const prepareTrailFromSchema = require('../utils/prepareTrailFromSchema');
const entityName = require('../utils/entityName');
const { getCurrentUser } = require('../middlewares/user-capture');

module.exports = ({ strapi }) => ({
  async createPaperTrail(event, schema, uid, change, isAdmin) {
    // Strapi v5: event.result is the created/updated/deleted entity, event.params.data is the input data
    const body = event.params?.data;
    const result = event.result;
    
    // Determine user information
    let adminUserId = null;
    let upUserId = null;
    
    // First check for admin-created changes
    if (change === 'create' && result?.createdBy?.id) {
      adminUserId = result.createdBy.id;
      console.log('[Paper Trail] Found admin user ID from createdBy:', adminUserId);
    } else if ((change === 'update' || change === 'delete') && result?.updatedBy?.id) {
      adminUserId = result.updatedBy.id;
      console.log('[Paper Trail] Found admin user ID from updatedBy:', adminUserId);
    }
    
    // If no admin user found yet, check if current user is an admin
    const currentUser = getCurrentUser();
    
    // ONLY set one of adminUserId OR upUserId, not both
    
    // If this is an admin action, ONLY set adminUserId
    if (isAdmin) {
      // Clear any user permissions user ID that might have been set
      upUserId = null;
      
      // If we already have an adminUserId from createdBy/updatedBy, use that
      if (!adminUserId && currentUser) {
        if (currentUser.isAdminUser) {
          adminUserId = currentUser.id;
          console.log('[Paper Trail] Using admin user from AsyncLocalStorage:', adminUserId);
        } else if (event.params?.user?.isAdminUser) {
          adminUserId = event.params.user.id;
          console.log('[Paper Trail] Using admin user from event params:', adminUserId);
        }
      }
    } 
    // If this is NOT an admin action, ONLY set upUserId
    else if (!isAdmin) {
      // Clear any admin user ID that might have been set
      adminUserId = null;
      
      if (currentUser) {
        upUserId = currentUser.id;
        console.log('[Paper Trail] Using user from AsyncLocalStorage:', upUserId);
      } else if (event.params?.user) {
        upUserId = event.params.user.id;
        console.log('[Paper Trail] Using user from event params:', upUserId);
      }
    }
    
    // Additional check for admin context based on event properties
    if (result?.createdBy?.id || result?.updatedBy?.id) {
      // If result has createdBy/updatedBy, it's definitely an admin action
      console.log('[Paper Trail] Detected admin action based on createdBy/updatedBy fields');
      isAdmin = true;
      
      // Force adminUserId to be set, and clear upUserId
      if (!adminUserId) {
        adminUserId = result?.createdBy?.id || result?.updatedBy?.id;
      }
      upUserId = null;
    }
    
    // Finally, log what we're going to do
    console.log('[Paper Trail] Processing change as:', isAdmin ? 'Admin action' : 'Regular user action');
    console.log('[Paper Trail] Admin user ID:', adminUserId);
    console.log('[Paper Trail] User permissions user ID:', upUserId);
    
    // If we still don't have a user, try to find a default admin user as a fallback
    if (!adminUserId && !upUserId) {
      console.log('[Paper Trail] No user identified, attempting to find user from token');
      
      // First try to extract token from the event if available
      const authHeader = event.params?.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          console.log('[Paper Trail] Found auth header in event, extracting token');
          
          // Decode token to get user ID
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const decoded = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log('[Paper Trail] Decoded token payload:', decoded);
            
            if (decoded && decoded.id) {
              // Check for admin content (createdBy/updatedBy present) or explicit admin flag
              const isDecodedAdmin = 
                decoded.isAdmin === true || 
                (result?.createdBy?.id && result?.updatedBy?.id) || 
                isAdmin;
              
              if (isDecodedAdmin) {
                // It's an admin action
                adminUserId = decoded.id;
                upUserId = null; // Clear user permissions ID
                console.log('[Paper Trail] Found admin user from token:', adminUserId);
              } else {
                // It's a regular API action
                upUserId = decoded.id;
                adminUserId = null; // Clear admin user ID
                console.log('[Paper Trail] Found user from token:', upUserId);
              }
            }
          }
        } catch (tokenError) {
          console.log('[Paper Trail] Error extracting user from token:', tokenError.message);
        }
      }
      
      // If we still don't have a user, use a default admin
      if (!adminUserId && !upUserId) {
        console.log('[Paper Trail] Still no user identified, using default admin');
        try {
          // Find the first admin user (typically ID 1)
          const adminUsers = await strapi.db.query('admin::user').findMany({ 
            where: {},
            limit: 1
          });
          
          if (adminUsers && adminUsers.length > 0) {
            adminUserId = adminUsers[0].id;
            console.log('[Paper Trail] Using default admin user:', adminUserId);
          }
        } catch (error) {
          console.log('[Paper Trail] Error finding default admin:', error.message);
        }
      }
    }
    
    console.log(
      '[Paper Trail] users_permissions_user candidate:',
      upUserId,
      event.params?.user
    );

    const id = result?.id ? String(result.id) : undefined;
    console.log('[Paper Trail] Extracted entity id:', id);
    console.log('event.result:', result);
    console.log('event.params.data:', body);

    /**
     * Early return, if we don't have an entity ID for existing or newly created entity the trail is useless
     */
    if (!id) {
      console.warn(
        '[Paper Trail] No entity id found, skipping trail creation.'
      );
      return;
    }

    const { trail } = prepareTrailFromSchema(body, schema);

    /**
     * Get all trails belonging to this entity so we can increment a version number
     */
    const trails = await strapi.documents(entityName).findMany({
      fields: ['version'],
      filters: { contentType: uid, entityId: id },
      sort: { version: 'DESC' }
    });

    let version = trails[0] ? trails[0].version + 1 : 1;

    /**
     * build our new trail record
     */
    const newTrail = {
      admin_user: {
        connect: adminUserId ? [{ id: adminUserId }] : [],
        disconnect: []
      },
      change,
      content: trail,
      contentType: uid,
      entityId: id,
      users_permissions_user: {
        connect: upUserId ? [{ id: upUserId }] : [],
        disconnect: []
      },
      version
    };
    console.log('[Paper Trail] Trail to be created:', newTrail);

    /**
     * Save it
     */
    try {
      const entity = await strapi.documents(entityName).create({
        data: newTrail
      });
      console.log('[Paper Trail] Trail created:', entity);
      return entity;
    } catch (Err) {
      console.warn('[Paper Trail] Error creating trail:', Err);
    }

    return trail;
  }
});
