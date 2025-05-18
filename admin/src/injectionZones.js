import React from 'react';
import PaperTrail from './components/PaperTrail/PaperTrail';

/**
 * This file defines all injection zones for the plugin
 * Updated for Strapi V5 injection patterns
 */

// Inject into Content-Manager edit view right sidebar
const paperTrailComponent = () => {
  return {
    name: 'paper-trail',
    Component: PaperTrail,
  };
};

// Export injection zone contributions
export default {
  admin: {
    // Inject into the right column of the edit view
    'content-manager.editView.right-links': [paperTrailComponent],
  },
};