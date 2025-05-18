module.exports = {
  schema: {
    kind: 'collectionType',
    collectionName: 'plugin_paper_trail_trails',
    info: {
      singularName: 'trail',
      pluralName: 'trails',
      displayName: 'Trail'
    },
    options: {
      draftAndPublish: false,
      comment: ''
    },
    pluginOptions: {
      'content-manager': {
        visible: true
      },
      'content-type-builder': {
        visible: false
      }
    },
    attributes: {
      entityId: {
        type: 'string',
        required: true,
        comment: 'The Document ID of the entity being tracked'
      },
      contentType: {
        type: 'string'
      },
      version: {
        type: 'integer'
      },
      change: {
        type: 'string'
      },
      content: {
        type: 'json'
      },
      admin_user: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user'
      }
    }
  }
};
