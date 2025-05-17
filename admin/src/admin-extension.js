/**
 * This file contains JavaScript that will be injected into the admin panel
 * to intercept form submission for Paper Trail settings
 */

(function() {
  // Wait for the DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Function to handle form submission
    function handleFormSubmission() {
      // Look for the finish button in content type builder forms
      const finishButtons = document.querySelectorAll('button:contains("Finish")');
      
      if (finishButtons && finishButtons.length > 0) {
        const finishButton = finishButtons[0];
        
        // Add our click listener
        finishButton.addEventListener('click', async function(event) {
          // Find the Paper Trail checkbox
          const paperTrailCheckbox = document.querySelector('input[name="pluginOptions.paperTrail.enabled"]');
          
          if (paperTrailCheckbox) {
            // Get the current state
            const isEnabled = paperTrailCheckbox.checked;
            
            // Get the content type UID from the URL
            const pathParts = window.location.pathname.split('/');
            let uid = '';
            
            // Try to extract the UID from the URL
            for (let i = 0; i < pathParts.length; i++) {
              if (pathParts[i] === 'content-types' && i + 1 < pathParts.length) {
                uid = pathParts[i + 1];
                break;
              }
            }
            
            if (uid) {
              try {
                // Call our custom endpoint to save the Paper Trail setting
                const response = await fetch('/paper-trail/settings', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    uid,
                    enabled: isEnabled
                  })
                });
                
                if (response.ok) {
                  console.log('Paper Trail setting saved successfully');
                } else {
                  console.error('Failed to save Paper Trail setting');
                }
              } catch (error) {
                console.error('Error saving Paper Trail setting:', error);
              }
            } else {
              console.error('Could not determine content type UID');
            }
          }
        });
      }
    }
    
    // Setup a mutation observer to detect when the form is added to the DOM
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          // Check for the Paper Trail checkbox
          const paperTrailCheckbox = document.querySelector('input[name="pluginOptions.paperTrail.enabled"]');
          
          if (paperTrailCheckbox) {
            handleFormSubmission();
          }
        }
      });
    });
    
    // Observe changes to the body
    observer.observe(document.body, { 
      childList: true,
      subtree: true 
    });
  });
})();