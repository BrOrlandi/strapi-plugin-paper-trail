import React from 'react';
import PaperTrail from './components/PaperTrail/PaperTrail';

/**
 * This file defines all injection zones for the plugin
 * This follows the newer pattern for Strapi V5
 */

// Inject into Content-Manager edit view
const contentManagerEditViewLinks = () => {
  return [
    {
      name: 'paper-trail',
      Component: PaperTrail,
    }
  ];
};

// Export injection zone contributions
export default {
  admin: {
    // Content-type builder injection zones
    'content-manager.editView.right-links': contentManagerEditViewLinks,
    
    // Compatibility with various naming patterns
    'contentManager.editView.right-links': contentManagerEditViewLinks,
    'contentManager.EditView.right-links': contentManagerEditViewLinks,
    'content-manager.EditView.right-links': contentManagerEditViewLinks,
  },
};