/**
 * Paper Trail plugin bootstrap for Strapi V5
 */
module.exports = ({ strapi }) => {
  // Initialize a registry to track which content types have Paper Trail enabled
  global.paperTrailContentTypes = global.paperTrailContentTypes || new Set();
  global.paperTrailAttachedHooks = global.paperTrailAttachedHooks || new Set(); // Keep track of attached hooks
  console.log('[DEBUG] Bootstrap initialized paperTrailContentTypes:', global.paperTrailContentTypes);

  // Load the initial configuration after the server is ready
  if (strapi.server && strapi.server.httpServer) {
    strapi.server.httpServer.on('listening', () => {
      setTimeout(() => {
        loadPaperTrailConfiguration(strapi);
      }, 1000); // Small delay to ensure everything is loaded
    });
  } else {
    // Fallback if httpServer isn't available yet
    setTimeout(() => {
      loadPaperTrailConfiguration(strapi);
    }, 2000);
  }

  // Direct event handler for content-type configuration changes in V5
  strapi.db.lifecycles.subscribe({
    models: ['admin::content-type-configuration'],

    async afterCreate(event) {
      try {
        const { result } = event;
        if (result && result.uid) {
          const contentType = await strapi.contentType(result.uid);
          processContentTypeChange(strapi, contentType);
        }
      } catch (error) {
        console.error('Paper Trail afterCreate handler error:', error);
      }
    },

    async afterUpdate(event) {
      try {
        const { result } = event;
        if (result && result.uid) {
          const contentType = await strapi.contentType(result.uid);
          processContentTypeChange(strapi, contentType);
        }
      } catch (error) {
        console.error('Paper Trail afterUpdate handler error:', error);
      }
    }
  });

  // Add lifecycle listeners for content type changes via event hub
  if (strapi.eventHub) {
    // For Strapi V5, use the event hub
    strapi.eventHub.on('content-type.create', ({ contentType }) => {
      processContentTypeChange(strapi, contentType);
    });

    strapi.eventHub.on('content-type.update', ({ contentType }) => {
      processContentTypeChange(strapi, contentType);
    });

    console.log('Paper Trail event listeners registered');
  } else {
    console.warn(
      'Paper Trail: EventHub not available, some features may not work'
    );
  }

  // Patch entityService globally to always inject ctx.state.user into params
  const originalEntityService = strapi.entityService;
  strapi.entityService = new Proxy(originalEntityService, {
    get(target, prop) {
      if (typeof target[prop] === 'function') {
        return function (...args) {
          // Try to get the Koa context from the call stack
          const context = getCurrentKoaContext();
          if (context && context.state && context.state.user) {
            if (args[1] && typeof args[1] === 'object') {
              args[1].user = context.state.user;
              
              // Also add authorization headers for token extraction
              if (context.request && context.request.header) {
                if (!args[1].headers) args[1].headers = {};
                args[1].headers.authorization = context.request.header.authorization;
              }
            }
          } else {
            // If no user in context, try to get from AsyncLocalStorage
            const { getCurrentUser } = require('./middlewares/user-capture');
            const user = getCurrentUser();
            if (user && args[1] && typeof args[1] === 'object') {
              args[1].user = user;
            }
          }
          return target[prop](...args);
        };
      }
      return target[prop];
    }
  });

  // Helper to get the current Koa context (works in most cases)
  function getCurrentKoaContext() {
    try {
      // Try to get context from Strapi's AsyncLocalStorage-powered context container
      if (strapi.server && strapi.server.app && strapi.server.app.context) {
        return global.paperTrailUserStorage?.getStore()?.ctx || null;
      }
    } catch (e) {
      console.error('[Paper Trail] Error getting Koa context:', e.message);
    }
    return null;
  }
};

/**
 * Loads the initial Paper Trail configuration from all content types
 */
function loadPaperTrailConfiguration(strapi) {
  try {
    console.log('[DEBUG] loadPaperTrailConfiguration starting');
    // Get all content types
    const contentTypes = strapi.contentTypes;
    console.log('[DEBUG] Content types found:', Object.keys(contentTypes).length);

    // Check each content type for Paper Trail configuration
    Object.entries(contentTypes).forEach(([uid, contentType]) => {
      console.log(`[DEBUG] Checking content type ${uid} for Paper Trail config:`, 
        contentType.pluginOptions?.paperTrail);
        
      if (contentType.pluginOptions?.paperTrail?.enabled) {
        // Add to our registry
        global.paperTrailContentTypes.add(uid);
        console.log(`Paper Trail enabled for content type: ${uid}`);
        attachPaperTrailHooks(strapi, uid); // Attach hooks
      }
    });

    console.log(
      `Paper Trail configured for ${global.paperTrailContentTypes.size} content type(s)`
    );
  } catch (error) {
    console.error('Error loading Paper Trail configuration:', error);
  }
}

/**
 * Process content type changes for Paper Trail settings
 */
function processContentTypeChange(strapi, contentType) {
  try {
    if (!contentType) {
      console.warn(
        'Paper Trail received undefined contentType in processContentTypeChange'
      );
      return;
    }

    const { uid } = contentType;
    if (!uid) {
      console.warn('Paper Trail received contentType without uid');
      return;
    }

    console.log(
      `Processing content type change for ${uid}`,
      contentType.pluginOptions
    );

    // Check if Paper Trail is enabled for this content type
    const isEnabled = contentType.pluginOptions?.paperTrail?.enabled === true;

    if (isEnabled) {
      // Add to our registry
      global.paperTrailContentTypes.add(uid);
      console.log(`Paper Trail enabled for content type: ${uid}`);

      // Ensure the schema is properly saved with the Paper Trail option
      ensureSchemaUpdate(strapi, uid, contentType);

      // Update content type configuration in database
      updateContentTypeConfiguration(strapi, uid, true);
      attachPaperTrailHooks(strapi, uid); // Attach hooks if enabled
    } else {
      // Handle disabled or missing setting
      if (global.paperTrailContentTypes.has(uid)) {
        global.paperTrailContentTypes.delete(uid);
        console.log(`Paper Trail disabled for content type: ${uid}`);
        // TODO: Detach hooks if possible/necessary, though Strapi might handle this if models are reloaded.
        // For now, we just stop reacting. The global.paperTrailAttachedHooks check will prevent re-attachment.
        global.paperTrailAttachedHooks.delete(uid);
        updateContentTypeConfiguration(strapi, uid, false);
      }
    }
  } catch (error) {
    console.error(
      'Error processing content type change for Paper Trail:',
      error
    );
  }
}

/**
 * Attaches Paper Trail lifecycle hooks to a specific content type.
 */
function attachPaperTrailHooks(strapi, uid) {
  if (global.paperTrailAttachedHooks.has(uid)) {
    // console.log(`Paper Trail hooks already attached for ${uid}. Skipping.`);
    return;
  }

  // Helper function to get user from all possible sources
  const getUserFromEvent = async (event) => {
    // Try all possible sources for user information
    let user = event.params?.meta?.user || event.params?.user || null;
    
    // If no user found yet, try from AsyncLocalStorage
    if (!user) {
      try {
        const { getCurrentUser } = require('./middlewares/user-capture');
        user = getCurrentUser();
        console.log(`[Paper Trail] Got user from AsyncLocalStorage for ${uid}:`, user?.id);
      } catch (error) {
        console.log(`[Paper Trail] Error getting user from AsyncLocalStorage for ${uid}:`, error.message);
      }
    }
    
    // If still no user, try to extract from auth header
    if (!user && event.params?.headers?.authorization) {
      try {
        const token = event.params.headers.authorization.replace('Bearer ', '');
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const decoded = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log(`[Paper Trail] Decoded user from token for ${uid}:`, decoded?.id);
          
          if (decoded?.id) {
            // Fetch user based on ID
            user = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { id: decoded.id }
            });
          }
        }
      } catch (error) {
        console.log(`[Paper Trail] Error extracting user from token for ${uid}:`, error.message);
      }
    }
    
    // Determine if the user is an admin
    if (user) {
      // Check if this is an admin user
      user.isAdminUser = 
        // Admin users typically have firstname and lastname instead of username
        (user.firstname !== undefined && user.lastname !== undefined) || 
        // Check if there's an explicit isAdminUser flag
        user.isAdminUser === true ||
        // Check for admin role
        user.roles?.some(role => role.code === 'strapi-super-admin') || 
        false;
      
      console.log(`[Paper Trail] User status for ${uid}: ${user.isAdminUser ? 'Admin' : 'Regular'} user ID ${user.id}`);
    }
    
    return user;
  };

  console.log(`Paper Trail: Attaching lifecycle hooks for ${uid}`);
  strapi.db.lifecycles.subscribe({
    models: [uid],
    async afterCreate(event) {
      if (!global.paperTrailContentTypes.has(uid)) return; // Double check if still enabled
      console.log(`Paper Trail afterCreate for ${uid}:`, event.result);
      try {
        // Get user from all possible sources (isAdminUser flag is set in getUserFromEvent)
        const user = await getUserFromEvent(event);
        const isAdmin = user?.isAdminUser || false;
        
        // Detect users-permissions user (not admin)
        let upUserId = null;
        if (user && !isAdmin) {
          upUserId = user.id;
        }
        
        console.log(`[Paper Trail] ${uid} afterCreate user:`, user ? `${user.id} (${user.username || user.email})` : 'No user found');
        
        // Update event.params with user and header info if available
        if (user && !event.params.user) {
          event.params.user = user;
        }
        
        // Add headers to event.params if not already there
        if (!event.params.headers && global.paperTrailUserStorage) {
          const ctx = global.paperTrailUserStorage.getStore()?.ctx;
          if (ctx && ctx.request && ctx.request.header) {
            event.params.headers = {
              authorization: ctx.request.header.authorization
            };
          }
        }
        
        await strapi
          .plugin('paper-trail')
          .service('paperTrailService')
          .createPaperTrail(
            event,
            strapi.getModel(uid),
            uid,
            'create',
            isAdmin
          );
      } catch (e) {
        console.error(`Paper Trail error in afterCreate for ${uid}:`, e);
      }
    },
    async afterUpdate(event) {
      if (!global.paperTrailContentTypes.has(uid)) return; 
      console.log(`Paper Trail afterUpdate for ${uid}:`, event.result);
      try {
        // Get user from all possible sources (isAdminUser flag is set in getUserFromEvent)
        const user = await getUserFromEvent(event);
        const isAdmin = user?.isAdminUser || false;
        
        // Detect users-permissions user (not admin)
        let upUserId = null;
        if (user && !isAdmin) {
          upUserId = user.id;
        }
        
        console.log(`[Paper Trail] ${uid} afterUpdate user:`, user ? `${user.id} (${user.username || user.email})` : 'No user found');
        
        // Update event.params with user and header info if available
        if (user && !event.params.user) {
          event.params.user = user;
        }
        
        // Add headers to event.params if not already there
        if (!event.params.headers && global.paperTrailUserStorage) {
          const ctx = global.paperTrailUserStorage.getStore()?.ctx;
          if (ctx && ctx.request && ctx.request.header) {
            event.params.headers = {
              authorization: ctx.request.header.authorization
            };
          }
        }
        
        await strapi
          .plugin('paper-trail')
          .service('paperTrailService')
          .createPaperTrail(
            event,
            strapi.getModel(uid),
            uid,
            'update',
            isAdmin
          );
      } catch (e) {
        console.error(`Paper Trail error in afterUpdate for ${uid}:`, e);
      }
    },
    async afterDelete(event) {
      if (!global.paperTrailContentTypes.has(uid)) return;
      console.log(`Paper Trail afterDelete for ${uid}:`, event.result);
      try {
        // Get user from all possible sources (isAdminUser flag is set in getUserFromEvent)
        const user = await getUserFromEvent(event);
        const isAdmin = user?.isAdminUser || false;
        
        // Detect users-permissions user (not admin)
        let upUserId = null;
        if (user && !isAdmin) {
          upUserId = user.id;
        }
        
        console.log(`[Paper Trail] ${uid} afterDelete user:`, user ? `${user.id} (${user.username || user.email})` : 'No user found');
        
        // Update event.params with user and header info if available
        if (user && !event.params.user) {
          event.params.user = user;
        }
        
        // Add headers to event.params if not already there
        if (!event.params.headers && global.paperTrailUserStorage) {
          const ctx = global.paperTrailUserStorage.getStore()?.ctx;
          if (ctx && ctx.request && ctx.request.header) {
            event.params.headers = {
              authorization: ctx.request.header.authorization
            };
          }
        }
        
        await strapi
          .plugin('paper-trail')
          .service('paperTrailService')
          .createPaperTrail(
            event,
            strapi.getModel(uid),
            uid,
            'delete',
            isAdmin
          );
      } catch (e) {
        console.error(`Paper Trail error in afterDelete for ${uid}:`, e);
      }
    }
  });
  global.paperTrailAttachedHooks.add(uid);
  console.log(`Paper Trail: Lifecycle hooks successfully attached for ${uid}`);
}

/**
 * Ensure the schema update is persisted with Paper Trail settings
 */
function ensureSchemaUpdate(strapi, uid, contentType) {
  try {
    // Log the update to help with troubleshooting
    console.log(`Ensuring Paper Trail schema update for: ${uid}`);

    // For Strapi V5, make sure the plugin options are properly set
    const schema = strapi.getModel(uid);
    if (schema) {
      // Make sure pluginOptions is defined
      schema.pluginOptions = schema.pluginOptions || {};
      // Make sure paperTrail is defined in pluginOptions
      schema.pluginOptions.paperTrail = schema.pluginOptions.paperTrail || {};
      // Set enabled to true
      schema.pluginOptions.paperTrail.enabled = true;

      console.log(`Paper Trail schema updated for: ${uid}`);
    }
  } catch (error) {
    console.error(`Error ensuring schema update for ${uid}:`, error);
  }
}

/**
 * Update the content type configuration in the database to persist Paper Trail settings
 */
async function updateContentTypeConfiguration(strapi, uid, enabled) {
  try {
    // First, find the current configuration
    const configService = strapi
      .plugin('content-type-builder')
      .service('content-types');

    if (!configService) {
      console.warn(
        `Content-type-builder service not available for updating ${uid}`
      );
      return;
    }

    // Get current configuration
    console.log(
      `Updating database configuration for content type: ${uid}, Paper Trail enabled: ${enabled}`
    );

    // Use strapi's entity service to find the configuration
    const entityService = strapi.entityService || strapi.query;

    if (!entityService) {
      console.warn('Entity service not available for updating configuration');
      return;
    }

    // Try to find the existing configuration
    try {
      // Directly update the content-type configuration in the database
      const configurations = await strapi.db
        .query('admin::content-type-configuration')
        .findMany({
          where: { uid }
        });

      if (configurations && configurations.length > 0) {
        const config = configurations[0];

        // Update the configuration
        let settings = config.settings || {};
        if (!settings.pluginOptions) {
          settings.pluginOptions = {};
        }
        if (!settings.pluginOptions.paperTrail) {
          settings.pluginOptions.paperTrail = {};
        }

        settings.pluginOptions.paperTrail.enabled = enabled;

        // Save the updated configuration
        await strapi.db.query('admin::content-type-configuration').update({
          where: { id: config.id },
          data: { settings }
        });

        console.log(
          `Successfully updated content type configuration for ${uid} in database`
        );
      } else {
        console.warn(`No configuration found for ${uid}, cannot update`);
      }
    } catch (dbError) {
      console.error(
        `Error updating configuration in database for ${uid}:`,
        dbError
      );
    }
  } catch (error) {
    console.error(
      `Error updating content type configuration for ${uid}:`,
      error
    );
  }
}
