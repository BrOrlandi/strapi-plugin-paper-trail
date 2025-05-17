/**
 * Paper Trail controller
 */
module.exports = ({ strapi }) => ({
  /**
   * Index endpoint for the Paper Trail plugin
   */
  async index(ctx) {
    return {
      message: 'Welcome to Paper Trail!',
      version: '0.7.0'
    };
  }
});