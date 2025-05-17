// Import controllers
const paperTrail = require('./paper-trail');
const paperTrailSettings = require('./paper-trail-settings');

// Export in the format expected by Strapi V5
module.exports = {
  'paper-trail': paperTrail,
  'paper-trail-settings': paperTrailSettings
};