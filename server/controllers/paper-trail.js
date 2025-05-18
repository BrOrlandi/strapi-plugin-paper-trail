'use strict';

module.exports = ({ strapi }) => ({
  async getTrails(ctx) {
    try {
      const { contentType, entityId } = ctx.query;

      // Validate required parameters
      if (!contentType || !entityId) {
        return ctx.badRequest(
          'contentType and entityId parameters are required'
        );
      }

      // Check if Paper Trail is enabled for this content type
      const isEnabled =
        global.paperTrailContentTypes?.has(contentType) || false;

      if (!isEnabled) {
        return ctx.badRequest(
          `Paper Trail is not enabled for content type: ${contentType}`
        );
      }

      // Get all trails for this entity sorted by version (newest first)
      const trails = await strapi
        .documents('plugin::paper-trail.trail')
        .findMany({
          where: {
            contentType,
            entityId
          },
          sort: 'version:desc',
          populate: ['admin_user', 'users_permissions_user']
        });

      console.log({ trails });

      return trails;
    } catch (error) {
      strapi.log.error('Error fetching paper trail data:', error);
      return ctx.internalServerError(
        'An error occurred while fetching paper trail data'
      );
    }
  },

  async isEnabled(ctx) {
    try {
      const { contentType } = ctx.query;

      // Validate required parameters
      if (!contentType) {
        return ctx.badRequest('contentType parameter is required');
      }

      // Check if Paper Trail is enabled for this content type
      const isEnabled =
        global.paperTrailContentTypes?.has(contentType) || false;

      return {
        enabled: isEnabled,
        contentType
      };
    } catch (error) {
      strapi.log.error('Error checking if Paper Trail is enabled:', error);
      return ctx.internalServerError(
        'An error occurred while checking Paper Trail status'
      );
    }
  },

  async getEnabledContentTypes(ctx) {
    try {
      // Get all content types that have Paper Trail enabled
      let enabledContentTypes = [];

      if (
        global.paperTrailContentTypes &&
        global.paperTrailContentTypes.size > 0
      ) {
        enabledContentTypes = Array.from(global.paperTrailContentTypes);
      }

      return {
        count: enabledContentTypes.length,
        contentTypes: enabledContentTypes
      };
    } catch (error) {
      strapi.log.error('Error getting enabled content types:', error);
      return ctx.internalServerError(
        'An error occurred while getting enabled content types'
      );
    }
  }
});
