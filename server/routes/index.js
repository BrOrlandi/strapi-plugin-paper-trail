module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'paper-trail.index',
    config: {
      policies: []
    }
  }
  // {
  //   method: 'GET',
  //   path: '/settings',
  //   handler: 'paper-trail-settings.getSettings',
  //   config: {
  //     policies: [],
  //     auth: false
  //   }
  // },
  // {
  //   method: 'POST',
  //   path: '/settings',
  //   handler: 'paper-trail-settings.saveSettings',
  //   config: {
  //     policies: [],
  //     auth: false
  //   }
  // }
];
