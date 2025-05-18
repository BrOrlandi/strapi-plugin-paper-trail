/**
 * Utility to directly inject the Paper Trail component into the Content Manager
 */
import React from 'react';
import ReactDOM from 'react-dom';
import PaperTrail from '../components/PaperTrail/PaperTrail';

// Function to inject Paper Trail directly into the DOM
export const injectPaperTrailDirectly = () => {
  console.log('[Paper Trail Direct Injection] Starting direct DOM injection');
  
  // Try to find the right sidebar where we want to inject our component
  const findRightSidebar = () => {
    // Common selectors used in Strapi v5 admin panel
    const selectors = [
      '[class*="EditView_informations"]',
      '[class*="Content_components"]',
      '[class*="StyledCol"]:nth-child(2)', // Right column in a two-column layout
      '[class*="InformationBox"]', // Information box container
      '[class*="Sidebar"]', // Any sidebar element
    ];
    
    // Try each selector until we find a match
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`[Paper Trail Direct Injection] Found right sidebar with selector: ${selector}`);
        return element;
      }
    }
    
    console.log('[Paper Trail Direct Injection] Could not find right sidebar, trying to locate by position');
    
    // If we can't find it by specific selectors, try to locate based on page structure
    // Find the main content area first
    const contentArea = document.querySelector('main') || document.querySelector('#main-content');
    if (!contentArea) {
      console.log('[Paper Trail Direct Injection] Cannot find main content area');
      return null;
    }
    
    // Look for div elements that might be the sidebar based on position
    const possibleSidebars = Array.from(contentArea.querySelectorAll('div'))
      .filter(div => {
        const rect = div.getBoundingClientRect();
        // Look for elements on the right side of the page with reasonable height
        return rect.right > window.innerWidth * 0.6 && rect.height > 200;
      });
    
    if (possibleSidebars.length > 0) {
      console.log('[Paper Trail Direct Injection] Found right sidebar by position');
      return possibleSidebars[0];
    }
    
    console.log('[Paper Trail Direct Injection] Could not find right sidebar');
    return null;
  };
  
  // Find the sidebar
  const sidebar = findRightSidebar();
  if (!sidebar) {
    console.error('[Paper Trail Direct Injection] Failed to find right sidebar for injection');
    return false;
  }
  
  // Create a container for the Paper Trail component
  let container = document.getElementById('paper-trail-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'paper-trail-container';
    container.style.marginTop = '20px';
    
    // Add before the first child or append
    if (sidebar.firstChild) {
      sidebar.insertBefore(container, sidebar.firstChild);
    } else {
      sidebar.appendChild(container);
    }
    
    console.log('[Paper Trail Direct Injection] Created container for Paper Trail component');
  }
  
  // Render the Paper Trail component into the container
  try {
    ReactDOM.render(<PaperTrail />, container);
    console.log('[Paper Trail Direct Injection] Successfully rendered Paper Trail component');
    return true;
  } catch (error) {
    console.error('[Paper Trail Direct Injection] Failed to render Paper Trail component:', error);
    return false;
  }
};

// Simple version that doesn't rely on React DOM
export const findAndAddPaperTrailMessage = () => {
  console.log('[Paper Trail Direct Injection] Attempting to add Paper Trail message');
  
  // Try to find the right sidebar
  const sidebar = document.querySelector('[class*="InformationBox"]') || 
                document.querySelector('[class*="Sidebar"]') ||
                document.querySelector('[class*="EditView_informations"]');
  
  if (!sidebar) {
    console.log('[Paper Trail Direct Injection] Could not find sidebar');
    return false;
  }
  
  // Create a simple message container
  let container = document.getElementById('paper-trail-message');
  if (!container) {
    container = document.createElement('div');
    container.id = 'paper-trail-message';
    container.style.marginTop = '20px';
    container.style.padding = '16px';
    container.style.background = '#f6f6f9';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 1px 4px rgba(33, 33, 52, 0.1)';
    
    const title = document.createElement('h3');
    title.textContent = 'Paper Trail';
    title.style.margin = '0 0 8px 0';
    title.style.fontSize = '16px';
    title.style.fontWeight = '600';
    
    const message = document.createElement('p');
    message.textContent = 'Paper Trail XX is enabled for this content type. Changes will be tracked.';
    message.style.margin = '0';
    message.style.fontSize = '14px';
    
    container.appendChild(title);
    container.appendChild(message);
    
    sidebar.appendChild(container);
    
    console.log('[Paper Trail Direct Injection] Added Paper Trail message to sidebar');
    return true;
  }
  
  return false;
};

// Make these functions available globally
export const attachDirectInjectionToWindow = () => {
  if (typeof window !== 'undefined') {
    window.injectPaperTrailDirectly = injectPaperTrailDirectly;
    window.findAndAddPaperTrailMessage = findAndAddPaperTrailMessage;
  }
};

export default {
  injectPaperTrailDirectly,
  findAndAddPaperTrailMessage,
  attachDirectInjectionToWindow
};