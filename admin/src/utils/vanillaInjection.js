/**
 * Pure JavaScript implementation of Paper Trail panel
 * This doesn't rely on React or any context providers
 */

// CSS styles for our Paper Trail panel
const styles = `
.paper-trail-panel {
  margin-top: 20px;
  margin-bottom: 20px;
  background-color: #f6f6f9;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(33, 33, 52, 0.1);
  overflow: hidden;
}

.paper-trail-header {
  padding: 16px;
  background-color: #4945ff;
  color: white;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paper-trail-body {
  padding: 16px;
}

.paper-trail-info {
  margin-bottom: 16px;
}

.paper-trail-info h4 {
  font-size: 12px;
  text-transform: uppercase;
  color: #666687;
  margin: 0 0 4px 0;
}

.paper-trail-info p {
  font-size: 14px;
  margin: 0;
  color: #32324d;
}

.paper-trail-button {
  background-color: #4945ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.paper-trail-button:hover {
  background-color: #3f3ccc;
}

.paper-trail-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #666687;
}
`;

// Function to extract content type from URL
const extractContentTypeFromUrl = () => {
  const pathname = window.location.pathname;
  // Example URL: /admin/content-manager/collection-types/api::product.product/1
  const matches = pathname.match(
    /content-manager\/(collection-types|single-types)\/([^/]+)/
  );
  if (matches && matches.length > 2) {
    return {
      modelType: matches[1],
      contentType: matches[2],
      id: pathname.split('/').pop()
    };
  }
  return null;
};

// Function to format date
const formatDate = dateString => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Function to get user display name
const getUserDisplayName = (trail = {}) => {
  const { admin_user, users_permissions_user } = trail;

  if (!admin_user && !users_permissions_user) {
    return 'Unknown';
  }

  if (admin_user) {
    // Use username if firstname/lastname are not available
    if (admin_user.firstname || admin_user.lastname) {
      return [admin_user.firstname, admin_user.lastname, '(Admin)']
        .filter(Boolean)
        .join(' ');
    } else if (admin_user.username) {
      return `${admin_user.username} (Admin)`;
    } else if (admin_user.email) {
      return `${admin_user.email} (Admin)`;
    }
    // Return any available identifier
    return admin_user.username || admin_user.email || 'Admin';
  }

  if (users_permissions_user) {
    if (users_permissions_user.username) {
      return `${users_permissions_user.username} (User)`;
    }
    return `${users_permissions_user.email || 'User'} (User)`;
  }
  
  return 'Unknown';
};

// Function to fetch trail data
const fetchTrailData = async (contentType, entityId) => {
  try {
    // Build the correct API endpoint based on Strapi v5 structure
    // For CM API query
    const params = new URLSearchParams({
      page: 1,
      pageSize: 1,
      sort: 'version:DESC', // Ensure descending sort to get latest version first
      'filters[$and][0][contentType][$eq]': contentType,
      'filters[$and][1][entityId][$eq]': entityId
    }).toString();

    // Try multiple possible API endpoints, with our custom API first
    const possibleEndpoints = [
      // Our custom API endpoints (correct format for Strapi V5)
      `/paper-trail/trails?contentType=${encodeURIComponent(contentType)}&entityId=${entityId}&sort=version:DESC`,
      
      // Fallback to other potential paths
      `/api/paper-trail/trails?contentType=${encodeURIComponent(contentType)}&entityId=${entityId}&sort=version:DESC`,
      `/content-manager/collection-types/plugin::paper-trail.trail?${params}`,
      `/admin/content-manager/collection-types/plugin::paper-trail.trail?${params}`,
      `/admin/plugins/paper-trail/trails?contentType=${encodeURIComponent(contentType)}&entityId=${entityId}&sort=version:DESC`
    ];

    let data = null;
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[Paper Trail] Trying to fetch data from: ${endpoint}`);
        const response = await fetch(endpoint);

        if (response.ok) {
          const responseData = await response.json();
          if (responseData?.results?.length > 0 || responseData?.[0]?.id) {
            console.log(
              `[Paper Trail] Successfully fetched data from: ${endpoint}`
            );
            data = responseData?.results?.[0] || responseData?.[0] || null;
            break;
          }
        }
      } catch (endpointError) {
        console.log(
          `[Paper Trail] Error fetching from ${endpoint}:`,
          endpointError
        );
        // Continue to next endpoint
      }
    }

    return data;
  } catch (error) {
    console.error('[Paper Trail] Error fetching trail data:', error);
    return null;
  }
};

// Function to create Paper Trail panel
const createPaperTrailPanel = (contentInfo, trailData) => {
  // Create container for styles
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // Create panel container
  const panel = document.createElement('div');
  panel.className = 'paper-trail-panel';

  // Create header
  const header = document.createElement('div');
  header.className = 'paper-trail-header';
  header.innerHTML = 'Paper Trail';
  panel.appendChild(header);

  // Create body
  const body = document.createElement('div');
  body.className = 'paper-trail-body';

  if (trailData) {
    // Version info
    const versionInfo = document.createElement('div');
    versionInfo.className = 'paper-trail-info';
    versionInfo.innerHTML = `
      <h4>Current Version</h4>
      <p>${trailData.version}</p>
    `;
    body.appendChild(versionInfo);

    // Date info
    const dateInfo = document.createElement('div');
    dateInfo.className = 'paper-trail-info';
    dateInfo.innerHTML = `
      <h4>Last Updated</h4>
      <p>${formatDate(trailData.createdAt)}</p>
    `;
    body.appendChild(dateInfo);

    // User info
    const userInfo = document.createElement('div');
    userInfo.className = 'paper-trail-info';
    userInfo.innerHTML = `
      <h4>Updated By</h4>
      <p>${trailData.admin_user?.username || trailData.users_permissions_user?.username || 'Unknown'}</p>
    `;
    body.appendChild(userInfo);

    // Button to view all versions
    const button = document.createElement('button');
    button.className = 'paper-trail-button';
    button.textContent = 'View All Versions';
    button.onclick = () => {
      // Open modal with trail history
      alert('Paper Trail feature coming soon! This will show all versions.');
    };
    body.appendChild(button);
  } else {
    // Show that Paper Trail is enabled but no versions yet
    const info = document.createElement('div');
    info.className = 'paper-trail-info';
    info.innerHTML = `
      <p>Paper Trail is enabled for ${contentInfo.contentType}.</p>
      <p>Changes will be tracked automatically.</p>
    `;
    body.appendChild(info);
  }

  panel.appendChild(body);
  return panel;
};

// Function to check if paper trail is enabled for this content type
const isPaperTrailEnabled = async contentType => {
  try {
    // First check using our specific endpoint with correct Strapi V5 path format
    try {
      const response = await fetch(`/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`);
      if (response.ok) {
        const data = await response.json();
        return data.enabled === true;
      }
    } catch (apiError) {
      console.log('[Paper Trail] Error using is-enabled endpoint:', apiError);
      // Fallback to legacy path format
      try {
        const legacyResponse = await fetch(`/api/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`);
        if (legacyResponse.ok) {
          const data = await legacyResponse.json();
          return data.enabled === true;
        }
      } catch (legacyError) {
        console.log('[Paper Trail] Error using legacy is-enabled endpoint:', legacyError);
      }
    }

    // Manual override for certain content types (temporary for debugging)
    // Here we check against a list of content types we know have paper trail enabled
    const knownEnabledTypes = [
      'api::product.product',
      'api::category.category'
      // Add more known enabled types here
    ];
    
    if (knownEnabledTypes.includes(contentType)) {
      console.log(`[Paper Trail] Content type ${contentType} is in the known enabled list`);
      return true;
    }
    
    // Try to fetch all enabled content types if we haven't already
    if (!window.paperTrailEnabledContentTypes) {
      try {
        const response = await fetch('/paper-trail/enabled-content-types');
        if (!response.ok) {
          // Fallback to legacy path
          console.log('[Paper Trail] Trying legacy path for enabled-content-types');
          const legacyResponse = await fetch('/api/paper-trail/enabled-content-types');
          if (legacyResponse.ok) {
            return legacyResponse;
          }
        }
        if (response.ok) {
          const data = await response.json();
          if (data.contentTypes && Array.isArray(data.contentTypes)) {
            window.paperTrailEnabledContentTypes = data.contentTypes;
            console.log('[Paper Trail] Loaded enabled content types:', window.paperTrailEnabledContentTypes);
          }
        }
      } catch (listError) {
        console.log('[Paper Trail] Error fetching enabled content types:', listError);
      }
    }
    
    // Check if we have the list of enabled content types
    if (window.paperTrailEnabledContentTypes && Array.isArray(window.paperTrailEnabledContentTypes)) {
      return window.paperTrailEnabledContentTypes.includes(contentType);
    }
    
    // As a final resort, we'll be cautious and assume it's not enabled
    console.log(`[Paper Trail] Could not verify if ${contentType} has Paper Trail enabled, assuming it's not`);
    return false;
  } catch (error) {
    console.error('[Paper Trail] Error checking if enabled:', error);
    return false;
  }
};

// Function to inject Paper Trail
export const injectVanillaPaperTrail = async () => {
  console.log('[Paper Trail] Starting vanilla injection');

  // Try to get content type info from URL
  const contentInfo = extractContentTypeFromUrl();
  if (!contentInfo) {
    console.log('[Paper Trail] Could not extract content type from URL');
    return false;
  }

  console.log('[Paper Trail] Content type info:', contentInfo);

  // Check if Paper Trail is enabled for this content type
  const isEnabled = await isPaperTrailEnabled(contentInfo.contentType);
  if (!isEnabled) {
    console.log(
      `[Paper Trail] Not enabled for ${contentInfo.contentType}, skipping`
    );
    return false;
  }

  // Find a place to inject our panel - use multiple selectors for better reliability
  const specificSidebar = document.querySelector(
    '#main-content > form > div.sc-dzsMmF.haXACw > div.sc-VHjGu.eQVOYz.sc-lnQBcR.duDoVL > div.sc-VHjGu.bYiFsC.sc-gnOvAp.eGHuAx.sc-ekjSzU.gcRlGS'
  );

  // Function to find sidebar by class pattern search (more robust)
  const findByClassPattern = () => {
    // Look for common class patterns in Strapi V5
    const rightSidebarClasses = ['gcRlGS', 'duDoVL', 'eQVOYz'];

    // Search for elements with these classes
    for (const className of rightSidebarClasses) {
      const elements = document.querySelectorAll(`[class*="${className}"]`);

      // Filter to find appropriate containers that might be the sidebar
      const potential = Array.from(elements).filter(el => {
        // Check if it contains headings or looks like a sidebar
        return (
          (el.querySelector('h2') || el.querySelector('h3')) &&
          // Usually sidebar or info panels have these characteristics
          el.clientWidth < 500 &&
          el.clientHeight > 200
        );
      });

      if (potential.length > 0) {
        console.log(
          `[Paper Trail] Found potential sidebar with class ${className}:`,
          potential[0]
        );
        return potential[0];
      }
    }
    return null;
  };

  // Generic function to find an appropriate information panel or sidebar
  const findInformationPanel = () => {
    // Strapi often uses role="complementary" for sidebars/info panels
    const complementary = document.querySelector('[role="complementary"]');
    if (complementary) return complementary;

    // Look for panels with specific headings
    const panels = Array.from(document.querySelectorAll('div')).filter(div => {
      if (div.childNodes.length > 0) {
        const heading = div.querySelector('h2, h3');
        if (heading) {
          const headingText = heading.textContent.trim();
          return ['Entry', 'Information', 'Details', 'Metadata'].includes(
            headingText
          );
        }
      }
      return false;
    });

    return panels.length > 0 ? panels[0] : null;
  };

  // Alternative selectors to try if the specific one doesn't work
  const possibleContainers = [
    specificSidebar,
    findByClassPattern(),
    document.querySelector('[class*="gcRlGS"]'), // Try class-based selector as backup
    document.querySelector('[aria-labelledby="additional-information"]'),
    document.querySelector('aside'),
    findInformationPanel(),
    // Find any right column container as last resort
    ...Array.from(document.querySelectorAll('div')).filter(div => {
      if (
        div.childNodes.length > 0 &&
        div.querySelector('h2') &&
        div.querySelector('button')
      ) {
        const h2Text = div.querySelector('h2').textContent;
        return h2Text === 'Entry' || h2Text === 'Information';
      }
      return false;
    })
  ].filter(Boolean);

  if (possibleContainers.length === 0) {
    console.log(
      '[Paper Trail] Could not find a suitable container for injection'
    );
    return false;
  }

  const container = possibleContainers[0];
  console.log('[Paper Trail] Found container for injection:', container);

  // Check if Paper Trail is already injected
  if (document.querySelector('.paper-trail-panel')) {
    console.log('[Paper Trail] Panel already exists');
    return true;
  }

  // Create a simple version of the panel as fallback
  const simplePanel = document.createElement('div');
  simplePanel.style.margin = '20px 0';
  simplePanel.style.padding = '16px';
  simplePanel.style.background = 'white'; // Use white background to match Strapi's design
  simplePanel.style.borderRadius = '4px';
  simplePanel.style.boxShadow = '0 1px 4px rgba(33, 33, 52, 0.1)';

  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Paper Trail';
  title.style.margin = '0 0 8px 0';
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';

  // Add message
  const message = document.createElement('p');
  message.textContent =
    'Paper Trail is enabled for this content type. Changes will be tracked.';
  message.style.margin = '0';
  message.style.fontSize = '14px';

  simplePanel.appendChild(title);
  simplePanel.appendChild(message);

  // First fetch real data before inserting the panel
  try {
    // Fetch Paper Trail data for this content
    if (contentInfo.contentType && contentInfo.id) {
      console.log(
        `[Paper Trail] Fetching data for ${contentInfo.contentType} with ID ${contentInfo.id}`
      );

      // Create loading state panel first
      const loadingPanel = document.createElement('div');
      loadingPanel.className = 'paper-trail-panel';
      loadingPanel.style.margin = '20px 0';
      loadingPanel.style.padding = '16px';
      loadingPanel.style.background = 'white'; // Use white background to match Strapi's design
      loadingPanel.style.borderRadius = '4px';
      loadingPanel.style.boxShadow = '0 1px 4px rgba(33, 33, 52, 0.1)';
      loadingPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
          <span style="font-size: 12px; color: #666687;">Loading...</span>
        </div>
        <div style="display: flex; justify-content: center; padding: 10px;">
          <div style="width: 24px; height: 24px; border: 2px solid #4945ff; border-radius: 50%; border-top-color: transparent; animation: paper-trail-spin 1s linear infinite;"></div>
        </div>
      `;

      // Add spinner animation
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes paper-trail-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleElement);

      // Insert loading panel first
      insertPanelIntoDom(container, loadingPanel);

      // Fetch the actual data
      fetchTrailData(contentInfo.contentType, contentInfo.id)
        .then(trailData => {
          // Now create the real panel with the data
          const realPanel = document.createElement('div');
          realPanel.className = 'paper-trail-panel';
          realPanel.style.margin = '20px 0';
          realPanel.style.padding = '16px';
          realPanel.style.background = 'white'; // Use white background to match Strapi's design
          realPanel.style.borderRadius = '4px';
          realPanel.style.boxShadow = '0 1px 4px rgba(33, 33, 52, 0.1)';

          // Build panel based on data
          let panelContent = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
        `;

          if (trailData) {
            panelContent += `<span style="font-size: 12px; color: #666687;">Version ${trailData.version}</span>`;
          } else {
            panelContent += `<span style="font-size: 12px; color: #666687;">No versions yet</span>`;
          }

          panelContent += `</div>`;

          if (trailData) {
            // If we have data, show the version info
            panelContent += `
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #666687;">Last Updated</h4>
              <p style="margin: 0; font-size: 14px; color: #32324d;">${formatDate(trailData.createdAt)}</p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #666687;">Updated By</h4>
              <p style="margin: 0; font-size: 14px; color: #32324d;">${getUserDisplayName(trailData)}</p>
            </div>
          `;

            // Add button to view all versions
            panelContent += `
            <button id="paper-trail-view-button" style="background-color: #4945ff; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer; font-weight: 600; transition: background-color 0.2s; margin-top: 8px;">
              View All Versions
            </button>
          `;
          } else {
            // No versions yet
            panelContent += `
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #32324d;">Paper Trail is enabled for this content type.</p>
            <p style="margin: 0; font-size: 14px; color: #32324d;">Changes will be tracked automatically.</p>
          `;
          }

          realPanel.innerHTML = panelContent;

          // Replace loading panel with real panel
          loadingPanel.replaceWith(realPanel);

          // Add event listener for the button
          if (trailData) {
            const viewButton = realPanel.querySelector(
              '#paper-trail-view-button'
            );
            if (viewButton) {
              viewButton.addEventListener('click', () => {
                alert(
                  'Paper Trail feature: This will show all versions. Coming soon!'
                );
              });
            }
          }

          console.log('[Paper Trail] Full panel injected successfully');
        })
        .catch(err => {
          console.error('[Paper Trail] Error fetching trail data:', err);
          // Update loading panel with error message
          loadingPanel.innerHTML = `
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
          <p style="margin: 0; font-size: 14px; color: #32324d;">Paper Trail is enabled for this content type.</p>
          <p style="margin: 0; font-size: 14px; color: #32324d;">Changes will be tracked automatically.</p>
        `;
        });

      return true;
    } else {
      // No content info, use the simple panel
      return insertPanelIntoDom(container, simplePanel);
    }
  } catch (error) {
    console.error('[Paper Trail] Error setting up panel:', error);
    // Fallback to simple panel
    return insertPanelIntoDom(container, simplePanel);
  }
};

// Helper function to insert panel into DOM with proper error handling
function insertPanelIntoDom(container, panel) {
  try {
    // Safer insertion that doesn't rely on specific DOM structure
    if (container.tagName.toLowerCase() === 'aside') {
      // Use prepend for aside elements (always inserts at the beginning)
      container.prepend(panel);
    } else {
      // Try to find a good insertion point using a more robust approach
      const h2 = container.querySelector('h2');

      if (h2 && h2.parentNode === container) {
        // If h2 is a direct child, insert after it
        if (h2.nextSibling) {
          container.insertBefore(panel, h2.nextSibling);
        } else {
          container.appendChild(panel);
        }
      } else if (container.children.length > 0) {
        // Insert after the first child as a fallback
        container.insertBefore(panel, container.children[1] || null);
      } else {
        // Last resort - just append to the container
        container.appendChild(panel);
      }
    }
    console.log('[Paper Trail] Panel injected successfully');
    return true;
  } catch (error) {
    console.error('[Paper Trail] Error inserting panel:', error);
    // If all else fails, try the most basic approach - appendChild
    try {
      container.appendChild(panel);
      console.log('[Paper Trail] Panel injected using fallback method');
      return true;
    } catch (fallbackError) {
      console.error(
        '[Paper Trail] Fallback insertion also failed:',
        fallbackError
      );
      return false;
    }
  }
}

// Function to try injection with retry mechanism
export const injectWithRetry = (maxRetries = 5, interval = 1000) => {
  let retries = 0;

  const tryInjection = () => {
    console.log(`[Paper Trail] Injection attempt ${retries + 1}/${maxRetries}`);
    injectVanillaPaperTrail().then(success => {
      if (!success && retries < maxRetries) {
        retries++;
        setTimeout(tryInjection, interval);
      }
    });
  };

  tryInjection();
};

// Make the function available globally
export const attachVanillaInjectionToWindow = () => {
  if (typeof window !== 'undefined') {
    window.injectVanillaPaperTrail = injectVanillaPaperTrail;
    window.injectPaperTrailWithRetry = injectWithRetry;

    // Also add a simpler direct function that uses a nicely styled panel
    window.addPaperTrailSimplePanel = async () => {
      try {
        // Extract content info from URL
        let pathname = window.location.pathname;
        let matches = pathname.match(
          /content-manager\/(collection-types|single-types)\/([^/]+)/
        );

        if (!matches || matches.length < 3) {
          console.log('[Paper Trail] Could not extract content type from URL');
          return false;
        }

        const contentType = matches[2];

        // Check if Paper Trail is enabled for this content type
        const isEnabled = await isPaperTrailEnabled(contentType);
        if (!isEnabled) {
          console.log(`[Paper Trail] Not enabled for ${contentType}, skipping`);
          return false;
        }

        // Try multiple selectors for better reliability
        const sidebar =
          document.querySelector(
            '#main-content > form > div.sc-dzsMmF.haXACw > div.sc-VHjGu.eQVOYz.sc-lnQBcR.duDoVL > div.sc-VHjGu.bYiFsC.sc-gnOvAp.eGHuAx.sc-ekjSzU.gcRlGS'
          ) ||
          document.querySelector('[class*="gcRlGS"]') ||
          document.querySelector('aside') ||
          document.querySelector('[role="complementary"]');

        if (!sidebar) {
          console.log('[Paper Trail] Could not find sidebar with any selector');
          return false;
        }

        // Create a better looking panel
        const panel = document.createElement('div');
        panel.style.margin = '20px 0';
        panel.style.padding = '16px';
        panel.style.background = 'white'; // Use white background to match Strapi's design
        panel.style.borderRadius = '4px';
        panel.style.boxShadow = '0 1px 4px rgba(33, 33, 52, 0.1)';

        // Extract content info from URL to see if we can fetch data
        pathname = window.location.pathname;
        matches = pathname.match(
          /content-manager\/(collection-types|single-types)\/([^/]+)/
        );
        const entityId = pathname.split('/').pop();

        // Set up panel with loading state first
        panel.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
            <span style="font-size: 12px; color: #666687;">Loading...</span>
          </div>
          <div style="display: flex; justify-content: center; padding: 10px;">
            <div style="width: 24px; height: 24px; border: 2px solid #4945ff; border-radius: 50%; border-top-color: transparent; animation: paper-trail-spin 1s linear infinite;"></div>
          </div>
        `;

        // Add spinner animation
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          @keyframes paper-trail-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(styleElement);

        // Insert the panel first
        try {
          insertPanelIntoDom(sidebar, panel);
        } catch (insertError) {
          // Fallback to direct append
          sidebar.appendChild(panel);
        }

        // If we have content type info, try to fetch trail data
        if (matches && matches.length > 2 && entityId) {
          const contentType = matches[2];

          // Try to fetch the trail data
          setTimeout(async () => {
            try {
              const trailData = await fetchTrailData(contentType, entityId);

              // Update panel with actual data
              let panelContent = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
              `;

              if (trailData) {
                panelContent += `<span style="font-size: 12px; color: #666687;">Version ${trailData.version}</span>`;
              } else {
                panelContent += `<span style="font-size: 12px; color: #666687;">No versions yet</span>`;
              }

              panelContent += `</div>`;

              if (trailData) {
                // If we have data, show the version info
                panelContent += `
                  <div style="margin-bottom: 12px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #666687;">Last Updated</h4>
                    <p style="margin: 0; font-size: 14px; color: #32324d;">${formatDate(trailData.createdAt)}</p>
                  </div>
                  
                  <div style="margin-bottom: 12px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #666687;">Updated By</h4>
                    <p style="margin: 0; font-size: 14px; color: #32324d;">${getUserDisplayName(trailData)}</p>
                  </div>
                  
                  <button id="paper-trail-view-button" style="background-color: #4945ff; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer; font-weight: 600; transition: background-color 0.2s; margin-top: 8px;">
                    View All Versions
                  </button>
                `;
              } else {
                // No versions yet
                panelContent += `
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #32324d;">Paper Trail is enabled for this content type.</p>
                  <p style="margin: 0; font-size: 14px; color: #32324d;">Changes will be tracked automatically.</p>
                `;
              }

              // Update the panel content
              panel.innerHTML = panelContent;

              // Add event listener for the button
              if (trailData) {
                const viewButton = document.getElementById(
                  'paper-trail-view-button'
                );
                if (viewButton) {
                  viewButton.addEventListener('click', () => {
                    alert(
                      'Paper Trail feature: This will show all versions. Coming soon!'
                    );
                  });
                }
              }
            } catch (fetchError) {
              // Failed to fetch, just show the enabled message
              panel.innerHTML = `
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #32324d;">Paper Trail is enabled for this content type.</p>
                <p style="margin: 0; font-size: 14px; color: #32324d;">Changes will be tracked automatically.</p>
              `;
            }
          }, 500);
        } else {
          // No content info, just show the enabled message
          setTimeout(() => {
            panel.innerHTML = `
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #4945ff;">Paper Trail</h3>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #32324d;">Paper Trail is enabled for this content type.</p>
              <p style="margin: 0; font-size: 14px; color: #32324d;">Changes will be tracked automatically.</p>
            `;
          }, 500);
        }

        console.log('[Paper Trail] Enhanced panel added successfully');
        return true;
      } catch (error) {
        console.error('[Paper Trail] Error adding enhanced panel:', error);
        return false;
      }
    };
  }
};

export default {
  injectVanillaPaperTrail,
  injectWithRetry,
  attachVanillaInjectionToWindow
};
