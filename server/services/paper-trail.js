const prepareTrailFromSchema = require('../utils/prepareTrailFromSchema');
const entityName = require('../utils/entityName');
const { getCurrentUser } = require('../middlewares/user-capture');

module.exports = ({ strapi }) => ({
  async createPaperTrail(event, schema, uid, change, isAdmin) {
    // Strapi v5: event.result is the created/updated/deleted entity, event.params.data is the input data
    const body = event.params?.data;
    const result = event.result;
    const documentId = result?.documentId;

    // Determine user information
    let adminUserId = null;
    let upUserId = null;

    // First check for admin-created changes
    if (change === 'create' && result?.createdBy?.id) {
      adminUserId = result.createdBy.id;
      // Admin user ID found from createdBy
    } else if (
      (change === 'update' || change === 'delete') &&
      result?.updatedBy?.id
    ) {
      adminUserId = result.updatedBy.id;
      // Admin user ID found from updatedBy
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
          // Using admin user from AsyncLocalStorage
        } else if (event.params?.user?.isAdminUser) {
          adminUserId = event.params.user.id;
          // Using admin user from event params
        }
      }
    }
    // If this is NOT an admin action, ONLY set upUserId
    else if (!isAdmin) {
      // Clear any admin user ID that might have been set
      adminUserId = null;

      if (currentUser) {
        upUserId = currentUser.id;
        // Using user from AsyncLocalStorage
      } else if (event.params?.user) {
        upUserId = event.params.user.id;
        // Using user from event params
      }
    }

    // Additional check for admin context based on event properties
    if (result?.createdBy?.id || result?.updatedBy?.id) {
      // If result has createdBy/updatedBy, it's definitely an admin action
      // Detected admin action based on createdBy/updatedBy fields
      isAdmin = true;

      // Force adminUserId to be set, and clear upUserId
      if (!adminUserId) {
        adminUserId = result?.createdBy?.id || result?.updatedBy?.id;
      }
      upUserId = null;
    }

    // Finally, log what we're going to do
    // Processing change as admin or regular user action

    // If we still don't have a user, try to find a default admin user as a fallback
    if (!adminUserId && !upUserId) {
      // Attempting to find user from token

      // First try to extract token from the event if available
      const authHeader = event.params?.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          // Found auth header in event

          // Decode token to get user ID
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const decoded = JSON.parse(
              Buffer.from(tokenParts[1], 'base64').toString()
            );
            // Token payload decoded

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
                // Admin user found from token
              } else {
                // It's a regular API action
                upUserId = decoded.id;
                adminUserId = null; // Clear admin user ID
                // Regular user found from token
              }
            }
          }
        } catch (tokenError) {
          // Error extracting user from token
        }
      }

      // If we still don't have a user, use a default admin
      if (!adminUserId && !upUserId) {
        // No user identified, using default admin
        try {
          // Find the first admin user (typically ID 1)
          const adminUsers = await strapi.db.query('admin::user').findMany({
            where: {},
            limit: 1
          });

          if (adminUsers && adminUsers.length > 0) {
            adminUserId = adminUsers[0].id;
            // Using default admin user
          }
        } catch (error) {
          // Error finding default admin
        }
      }
    }

    // User permissions candidate identified

    const id = documentId ? String(documentId) : undefined;
    // Entity ID extracted from result

    /**
     * Early return, if we don't have an entity ID for existing or newly created entity the trail is useless
     */
    if (!id) {
      // No entity id found, skipping trail creation
      return;
    }

    const { trail } = prepareTrailFromSchema(body, schema);

    /**
     * Get all trails belonging to this entity so we can increment a version number
     */
    const trails = await strapi.documents(entityName).findMany({
      fields: ['version'],
      filters: { contentType: uid, entityId: id },
      sort: { version: 'DESC' },
      limit: 1
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
    // Trail ready to be created

    /**
     * Save it
     */
    try {
      const entity = await strapi.documents(entityName).create({
        data: newTrail
      });
      // Trail created successfully
      return entity;
    } catch (Err) {
      // Error creating trail
    }

    return trail;
  }
});
