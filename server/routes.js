'use strict';

module.exports = {
  admin: {
    routes: []
  },
  'content-api': {
    routes: [
      {
        method: 'GET',
        path: '/trails',
        handler: 'paperTrail.getTrails',
        config: {
          auth: false
        }
      },
      {
        method: 'GET',
        path: '/is-enabled',
        handler: 'paperTrail.isEnabled',
        config: {
          auth: false
        }
      },
      {
        method: 'GET',
        path: '/enabled-content-types',
        handler: 'paperTrail.getEnabledContentTypes',
        config: {
          auth: false
        }
      }
    ]
  }
};