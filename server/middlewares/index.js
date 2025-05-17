const paperTrailMiddleware = require('./paper-trail');
const userCaptureMiddleware = require('./user-capture');

/**
 * TODO: There may be a smarter way of doing this but it was a good learning experience - https://github.com/strapi/strapi/blob/main/packages/plugins/i18n/server/register.js
 */

module.exports = {
  paperTrail: ({ strapi }) => {
    console.log('[Paper Trail] paperTrail middleware factory called');
    return paperTrailMiddleware;
  },
  userCapture: ({ strapi }) => {
    console.log('[Paper Trail] userCapture middleware factory called');
    // Pass strapi to the middleware factory
    return userCaptureMiddleware({ strapi });
  }
};
