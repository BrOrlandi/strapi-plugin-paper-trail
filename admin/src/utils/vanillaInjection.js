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

// Function to create a fallback modal to display version history
const createVanillaModal = async (contentType, entityId) => {
  try {
    console.log('[Paper Trail] Creating vanilla modal for', {
      contentType,
      entityId
    });

    // First, fetch the trails data
    const trails = await fetchAllTrails(contentType, entityId);

    if (!trails || trails.length === 0) {
      console.log('[Paper Trail] No trails found, showing message');
      alert('No version history found for this content.');
      return;
    }

    console.log('[Paper Trail] Trails data:', trails);
    
    // Add global styles for the modal
    const styleId = 'paper-trail-modal-styles';
    if (!document.getElementById(styleId)) {
      const modalStyles = document.createElement('style');
      modalStyles.id = styleId;
      modalStyles.textContent = `
        .paper-trail-modal * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }
        .paper-trail-modal {
          font-size: 16px;
        }
        .paper-trail-modal h2 {
          font-size: 24px !important;
          font-weight: bold;
          margin: 0;
          color: #32324d;
        }
        .paper-trail-modal h3 {
          font-size: 20px !important;
          font-weight: bold;
          margin-bottom: 12px;
          color: #32324d;
        }
        .paper-trail-modal h4 {
          font-size: 18px !important;
          font-weight: bold;
          margin: 0 0 10px 0;
          color: #32324d;
        }
        .paper-trail-modal p {
          font-size: 16px !important;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }
        .paper-trail-modal th {
          font-size: 16px !important;
          padding: 12px 16px;
          text-align: left;
          font-weight: 500;
          color: #666687;
          background-color: #f6f6f9;
          border-bottom: 1px solid #eaeaef;
        }
        .paper-trail-modal td {
          font-size: 16px !important;
          padding: 16px;
          color: #32324d;
          border-bottom: 1px solid #eaeaef;
        }
        .paper-trail-modal button {
          font-size: 16px !important;
          cursor: pointer;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 600;
        }
        .paper-trail-modal pre {
          font-size: 16px !important;
          line-height: 1.5;
        }
        .paper-trail-modal ul {
          font-size: 16px;
        }
        .paper-trail-modal li {
          margin-bottom: 12px;
          font-size: 16px;
        }
        .paper-trail-btn-primary {
          background-color: #4945ff;
          color: white;
          border: none;
          transition: background-color 0.2s;
        }
        .paper-trail-btn-primary:hover {
          background-color: #3f3ccc;
        }
        .paper-trail-btn-secondary {
          background-color: white;
          color: #4945ff;
          border: 1px solid #dcdce4;
          transition: background-color 0.2s;
        }
        .paper-trail-btn-secondary:hover {
          background-color: #f6f6f9;
        }
        .paper-trail-btn-danger {
          background-color: #ee5e52;
          color: white;
          border: none;
          transition: background-color 0.2s;
        }
        .paper-trail-btn-danger:hover {
          background-color: #b72b1a;
        }
        .paper-trail-field-checkbox {
          margin: 8px 16px 8px 0;
          width: 18px;
          height: 18px;
        }
        .paper-trail-field-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 5px 0;
        }
        .paper-trail-field-label {
          font-size: 16px;
          color: #32324d;
        }
        .paper-trail-review-header {
          font-size: 18px;
          font-weight: bold;
          color: #32324d;
          margin: 16px 0 8px 0;
        }
        .paper-trail-review-list {
          background-color: #f6f6f9;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .paper-trail-restore-warning {
          color: #b72b1a;
          font-weight: bold;
          margin-bottom: 20px;
          background-color: #fee2e2;
          padding: 12px 16px;
          border-radius: 4px;
          border-left: 4px solid #b72b1a;
          font-size: 16px;
          line-height: 1.5;
        }
      `;
      document.head.appendChild(modalStyles);
    }

    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = 0;
    modalOverlay.style.left = 0;
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = 10000;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'paper-trail-modal';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '4px';
    modalContent.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '900px';
    modalContent.style.maxHeight = '85vh';
    modalContent.style.overflow = 'hidden';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column';

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.style.padding = '16px 24px';
    modalHeader.style.borderBottom = '1px solid #eaeaef';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';

    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Revision History';
    modalTitle.style.margin = 0;
    modalTitle.style.fontSize = '1.2rem';
    modalTitle.style.fontWeight = 'bold';
    modalTitle.style.color = '#32324d';

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '1.5rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666687';
    closeButton.onclick = () => {
      document.body.removeChild(modalOverlay);
    };

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.style.padding = '24px';
    modalBody.style.overflowY = 'auto';
    modalBody.style.maxHeight = 'calc(80vh - 130px)';

    // Create table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Create table header
    const tableHeader = document.createElement('thead');
    tableHeader.style.backgroundColor = '#f6f6f9';
    tableHeader.style.borderBottom = '1px solid #eaeaef';

    const headerRow = document.createElement('tr');

    const headers = [
      'Version',
      'Change Type',
      'Created',
      'Created By',
      'Actions'
    ];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.padding = '12px 16px';
      th.style.textAlign = 'left';
      th.style.fontWeight = 'normal';
      th.style.fontSize = '0.75rem';
      th.style.color = '#666687';
      headerRow.appendChild(th);
    });

    tableHeader.appendChild(headerRow);
    table.appendChild(tableHeader);

    // Create table body
    const tableBody = document.createElement('tbody');

    // Sort trails by version in descending order
    const sortedTrails = [...trails].sort(
      (a, b) => (b.version || 0) - (a.version || 0)
    );

    sortedTrails.forEach(trail => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #eaeaef';

      // Version column
      const versionCell = document.createElement('td');
      versionCell.textContent = trail.version;
      versionCell.style.padding = '16px';
      versionCell.style.color = '#32324d';

      // Change type column
      const changeTypeCell = document.createElement('td');
      changeTypeCell.textContent = trail.change || 'unknown';
      changeTypeCell.style.padding = '16px';
      changeTypeCell.style.color = '#32324d';
      changeTypeCell.style.textTransform = 'capitalize';

      // Created column
      const createdCell = document.createElement('td');
      createdCell.textContent = formatDate(trail.createdAt);
      createdCell.style.padding = '16px';
      createdCell.style.color = '#32324d';

      // Created by column
      const createdByCell = document.createElement('td');
      createdByCell.textContent = getUserDisplayName(trail);
      createdByCell.style.padding = '16px';
      createdByCell.style.color = '#32324d';

      // Actions column
      const actionsCell = document.createElement('td');
      actionsCell.style.padding = '16px';

      const viewButton = document.createElement('button');
      viewButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="#4945ff"><path d="M12 3c5.392 0 9.878 3.88 10.819 9-.94 5.12-5.427 9-10.819 9-5.392 0-9.878-3.88-10.819-9C2.121 6.88 6.608 3 12 3zm0 16c4.411 0 8.313-3.12 9.187-7.122C20.313 7.875 16.411 4.756 12 4.756c-4.411 0-8.313 3.12-9.187 7.122.874 4.003 4.776 7.122 9.187 7.122zm0-14a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>';
      viewButton.style.background = 'none';
      viewButton.style.border = 'none';
      viewButton.style.cursor = 'pointer';
      viewButton.title = `View version ${trail.version}`;
      viewButton.onclick = () => {
        showTrailDetail(trail);
      };

      actionsCell.appendChild(viewButton);

      // Add all cells to the row
      row.appendChild(versionCell);
      row.appendChild(changeTypeCell);
      row.appendChild(createdCell);
      row.appendChild(createdByCell);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });

    table.appendChild(tableBody);
    modalBody.appendChild(table);

    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.style.padding = '16px 24px';
    modalFooter.style.borderTop = '1px solid #eaeaef';
    modalFooter.style.display = 'flex';
    modalFooter.style.justifyContent = 'flex-end';

    const closeFooterButton = document.createElement('button');
    closeFooterButton.textContent = 'Close';
    closeFooterButton.style.backgroundColor = 'white';
    closeFooterButton.style.color = '#4945ff';
    closeFooterButton.style.border = '1px solid #dcdce4';
    closeFooterButton.style.borderRadius = '4px';
    closeFooterButton.style.padding = '8px 16px';
    closeFooterButton.style.fontSize = '0.875rem';
    closeFooterButton.style.cursor = 'pointer';
    closeFooterButton.onclick = () => {
      document.body.removeChild(modalOverlay);
    };

    modalFooter.appendChild(closeFooterButton);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);

    // Add modal to the DOM
    document.body.appendChild(modalOverlay);
  } catch (error) {
    console.error('[Paper Trail] Error creating vanilla modal:', error);
    alert('Error loading version history. Please try again.');
  }
};

// Helper function to fetch all trails for a content type and entity
const fetchAllTrails = async (contentType, entityId) => {
  // Try multiple possible API endpoints with correct sorting
  const apiEndpoint = `/paper-trail/trails?contentType=${encodeURIComponent(contentType)}&entityId=${entityId}&sort=version:DESC`;
  const legacyEndpoint = `/api/paper-trail/trails?contentType=${encodeURIComponent(contentType)}&entityId=${entityId}&sort=version:DESC`;

  let trails = [];

  // Try the Strapi V5 endpoint first
  try {
    console.log('[Paper Trail] Fetching trails from:', apiEndpoint);
    const response = await fetch(apiEndpoint);

    if (response.ok) {
      const data = await response.json();
      console.log('[Paper Trail] Trail data from V5 endpoint:', data);

      if (Array.isArray(data)) {
        trails = data;
      }
    }
  } catch (apiError) {
    console.log('[Paper Trail] Error fetching from V5 endpoint:', apiError);

    // Try the legacy endpoint
    try {
      console.log('[Paper Trail] Trying legacy endpoint:', legacyEndpoint);
      const legacyResponse = await fetch(legacyEndpoint);

      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        console.log(
          '[Paper Trail] Trail data from legacy endpoint:',
          legacyData
        );

        if (Array.isArray(legacyData)) {
          trails = legacyData;
        }
      }
    } catch (legacyError) {
      console.log(
        '[Paper Trail] Error fetching from legacy endpoint:',
        legacyError
      );
    }
  }

  return trails;
};

// Function to show details of a specific trail version
const showTrailDetail = async trail => {
  try {
    console.log('[Paper Trail] Showing trail detail for version:', trail.version);

    // Create a new modal to show the trail details
    const detailModalOverlay = document.createElement('div');
    detailModalOverlay.className = 'paper-trail-modal-overlay';
    detailModalOverlay.style.position = 'fixed';
    detailModalOverlay.style.top = 0;
    detailModalOverlay.style.left = 0;
    detailModalOverlay.style.width = '100%';
    detailModalOverlay.style.height = '100%';
    detailModalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    detailModalOverlay.style.display = 'flex';
    detailModalOverlay.style.justifyContent = 'center';
    detailModalOverlay.style.alignItems = 'center';
    detailModalOverlay.style.zIndex = 10001; // Higher than the list modal

    // Create modal content
    const detailModalContent = document.createElement('div');
    detailModalContent.className = 'paper-trail-modal';
    detailModalContent.style.backgroundColor = 'white';
    detailModalContent.style.borderRadius = '4px';
    detailModalContent.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
    detailModalContent.style.width = '80%';
    detailModalContent.style.maxWidth = '800px';
    detailModalContent.style.maxHeight = '80vh';
    detailModalContent.style.overflow = 'hidden';
    detailModalContent.style.display = 'flex';
    detailModalContent.style.flexDirection = 'column';

    // Create modal header
    const detailModalHeader = document.createElement('div');
    detailModalHeader.style.padding = '16px 24px';
    detailModalHeader.style.borderBottom = '1px solid #eaeaef';
    detailModalHeader.style.display = 'flex';
    detailModalHeader.style.justifyContent = 'space-between';
    detailModalHeader.style.alignItems = 'center';

    const detailModalTitle = document.createElement('h2');
    detailModalTitle.textContent = `Version ${trail.version} Details`;
    detailModalTitle.style.margin = 0;
    detailModalTitle.style.fontSize = '20px'; // Increased font size from 1.2rem
    detailModalTitle.style.fontWeight = 'bold';
    detailModalTitle.style.color = '#32324d';

    const detailCloseButton = document.createElement('button');
    detailCloseButton.innerHTML = '&times;';
    detailCloseButton.style.background = 'none';
    detailCloseButton.style.border = 'none';
    detailCloseButton.style.fontSize = '24px'; // Increased from 1.5rem
    detailCloseButton.style.cursor = 'pointer';
    detailCloseButton.style.color = '#666687';
    detailCloseButton.onclick = () => {
      document.body.removeChild(detailModalOverlay);
    };

    detailModalHeader.appendChild(detailModalTitle);
    detailModalHeader.appendChild(detailCloseButton);

    // Create modal body
    const detailModalBody = document.createElement('div');
    detailModalBody.style.padding = '24px';
    detailModalBody.style.overflowY = 'auto';
    detailModalBody.style.maxHeight = 'calc(80vh - 130px)';

    // Create the content details
    const contentDetails = document.createElement('div');

    // Version info
    const versionInfo = document.createElement('div');
    versionInfo.style.marginBottom = '24px'; // Increased from 16px

    const versionTitle = document.createElement('h3');
    versionTitle.textContent = 'Version Information';
    versionTitle.style.fontSize = '18px'; // Increased from 1rem
    versionTitle.style.fontWeight = 'bold';
    versionTitle.style.color = '#32324d';
    versionTitle.style.marginBottom = '12px'; // Increased from 8px

    const versionList = document.createElement('ul');
    versionList.style.listStyle = 'none';
    versionList.style.padding = 0;
    versionList.style.margin = 0;

    const versionItems = [
      { label: 'Version', value: trail.version },
      { label: 'Change Type', value: trail.change || 'Unknown' },
      { label: 'Created At', value: formatDate(trail.createdAt) },
      { label: 'Created By', value: getUserDisplayName(trail) },
      { label: 'Content Type', value: trail.contentType },
      { label: 'Entity ID', value: trail.entityId }
    ];

    versionItems.forEach(item => {
      const listItem = document.createElement('li');
      listItem.style.marginBottom = '10px'; // Increased from 8px
      listItem.style.display = 'flex';

      const label = document.createElement('span');
      label.textContent = `${item.label}: `;
      label.style.fontWeight = 'bold';
      label.style.minWidth = '130px'; // Increased from 120px
      label.style.color = '#666687';
      label.style.fontSize = '16px'; // Increased font size

      const value = document.createElement('span');
      value.textContent = item.value;
      value.style.color = '#32324d';
      value.style.fontSize = '16px'; // Increased font size

      listItem.appendChild(label);
      listItem.appendChild(value);
      versionList.appendChild(listItem);
    });

    versionInfo.appendChild(versionTitle);
    versionInfo.appendChild(versionList);
    contentDetails.appendChild(versionInfo);

    // Create steps container for restore process
    const stepsContainer = document.createElement('div');
    stepsContainer.style.marginTop = '12px';
    stepsContainer.style.marginBottom = '24px';

    // Step 1: Content data view
    const step1 = document.createElement('div');
    step1.style.display = 'block';
    step1.id = 'paper-trail-step-1';

    // Step 2: Field selection
    const step2 = document.createElement('div');
    step2.style.display = 'none';
    step2.id = 'paper-trail-step-2';

    // Step 3: Review and confirm
    const step3 = document.createElement('div');
    step3.style.display = 'none';
    step3.id = 'paper-trail-step-3';

    // Content data (Step 1)
    if (trail.content) {
      const contentSection = document.createElement('div');
      contentSection.style.marginTop = '24px';

      const contentTitle = document.createElement('h3');
      contentTitle.textContent = 'Content Data';
      contentTitle.style.fontSize = '18px'; // Increased from 1rem
      contentTitle.style.fontWeight = 'bold';
      contentTitle.style.color = '#32324d';
      contentTitle.style.marginBottom = '12px'; // Increased from 8px

      const contentData = document.createElement('pre');
      contentData.textContent = JSON.stringify(trail.content, null, 2);
      contentData.style.backgroundColor = '#f6f6f9';
      contentData.style.padding = '16px';
      contentData.style.borderRadius = '4px';
      contentData.style.overflow = 'auto';
      contentData.style.fontSize = '16px'; // Increased from 0.875rem
      contentData.style.whiteSpace = 'pre-wrap';
      contentData.style.lineHeight = '1.5';
      contentData.style.fontFamily = 'monospace';

      contentSection.appendChild(contentTitle);
      contentSection.appendChild(contentData);
      step1.appendChild(contentSection);
    }

    stepsContainer.appendChild(step1);
    stepsContainer.appendChild(step2);
    stepsContainer.appendChild(step3);
    contentDetails.appendChild(stepsContainer);

    // Fetch current content to compare with trail version
    let currentContent = null;
    try {
      const contentInfo = extractContentTypeFromUrl();
      if (contentInfo && contentInfo.contentType && contentInfo.id) {
        // Try to fetch current data from API
        const endpoint = `/content-manager/collection-types/${contentInfo.contentType}/${contentInfo.id}`;
        const legacyEndpoint = `/api/content-manager/collection-types/${contentInfo.contentType}/${contentInfo.id}`;
        
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            currentContent = await response.json();
            console.log('[Paper Trail] Fetched current content:', currentContent);
          }
        } catch (endpointError) {
          console.log('[Paper Trail] Error fetching from main endpoint:', endpointError);
          
          // Try legacy endpoint
          try {
            const legacyResponse = await fetch(legacyEndpoint);
            if (legacyResponse.ok) {
              currentContent = await legacyResponse.json();
              console.log('[Paper Trail] Fetched current content from legacy endpoint:', currentContent);
            }
          } catch (legacyError) {
            console.log('[Paper Trail] Error fetching from legacy endpoint:', legacyError);
          }
        }
      }
    } catch (fetchError) {
      console.log('[Paper Trail] Error fetching current content:', fetchError);
    }

    // If we can't get current content, try to extract it from the form
    if (!currentContent) {
      try {
        // Try to extract from form fields
        const formData = {};
        const formElements = document.querySelectorAll('form input, form textarea, form select');
        formElements.forEach(element => {
          if (element.name) {
            if (element.type === 'checkbox') {
              formData[element.name] = element.checked;
            } else {
              formData[element.name] = element.value;
            }
          }
        });
        
        if (Object.keys(formData).length > 0) {
          currentContent = formData;
          console.log('[Paper Trail] Extracted content from form:', currentContent);
        }
      } catch (formError) {
        console.log('[Paper Trail] Error extracting form data:', formError);
      }
    }
    
    // Function to display the field selection view (Step 2)
    const showFieldSelection = () => {
      // Hide step 1, show step 2
      document.getElementById('paper-trail-step-1').style.display = 'none';
      document.getElementById('paper-trail-step-2').style.display = 'block';
      document.getElementById('paper-trail-step-3').style.display = 'none';
      
      // Show back button
      backButton.style.display = 'block';
      
      // Change button text and action
      restoreButton.textContent = 'Review Selected Fields';
      restoreButton.onclick = showReviewFields;
      
      // Clear previous content
      step2.innerHTML = '';
      
      // Create field selection UI
      const fieldSelectionTitle = document.createElement('h3');
      fieldSelectionTitle.textContent = 'Select Fields to Restore';
      fieldSelectionTitle.style.fontSize = '18px';
      fieldSelectionTitle.style.fontWeight = 'bold';
      fieldSelectionTitle.style.color = '#32324d';
      fieldSelectionTitle.style.marginBottom = '16px';
      
      const fieldDescription = document.createElement('p');
      fieldDescription.textContent = 'Select the fields you want to restore from this version:';
      fieldDescription.style.fontSize = '16px';
      fieldDescription.style.color = '#666687';
      fieldDescription.style.marginBottom = '16px';
      
      // Create field selection form
      const fieldSelectionForm = document.createElement('div');
      fieldSelectionForm.style.marginBottom = '16px';
      
      // Toggle all checkbox
      const toggleAllContainer = document.createElement('div');
      toggleAllContainer.className = 'paper-trail-field-row';
      toggleAllContainer.style.marginBottom = '16px';
      toggleAllContainer.style.padding = '8px';
      toggleAllContainer.style.backgroundColor = '#f6f6f9';
      toggleAllContainer.style.borderRadius = '4px';
      
      const toggleAllCheckbox = document.createElement('input');
      toggleAllCheckbox.type = 'checkbox';
      toggleAllCheckbox.id = 'paper-trail-toggle-all';
      toggleAllCheckbox.className = 'paper-trail-field-checkbox';
      toggleAllCheckbox.checked = true;
      
      const toggleAllLabel = document.createElement('label');
      toggleAllLabel.htmlFor = 'paper-trail-toggle-all';
      toggleAllLabel.textContent = 'Select/Deselect All Fields';
      toggleAllLabel.className = 'paper-trail-field-label';
      toggleAllLabel.style.fontWeight = 'bold';
      toggleAllLabel.style.fontSize = '16px';
      
      toggleAllContainer.appendChild(toggleAllCheckbox);
      toggleAllContainer.appendChild(toggleAllLabel);
      fieldSelectionForm.appendChild(toggleAllContainer);
      
      // Add individual field checkboxes
      const fieldList = document.createElement('div');
      fieldList.style.maxHeight = '300px';
      fieldList.style.overflowY = 'auto';
      fieldList.style.padding = '8px';
      fieldList.style.border = '1px solid #dcdce4';
      fieldList.style.borderRadius = '4px';
      
      // Create individual field checkboxes
      const trailContent = trail.content || {};
      const allFields = Object.keys(trailContent).sort();
      
      allFields.forEach(field => {
        // Skip internal fields like id, created_at, updated_at
        if (['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(field)) {
          return;
        }
        
        const fieldRow = document.createElement('div');
        fieldRow.className = 'paper-trail-field-row';
        
        const fieldCheckbox = document.createElement('input');
        fieldCheckbox.type = 'checkbox';
        fieldCheckbox.id = `paper-trail-field-${field}`;
        fieldCheckbox.className = 'paper-trail-field-checkbox';
        fieldCheckbox.dataset.fieldName = field;
        fieldCheckbox.checked = true;
        
        const fieldLabel = document.createElement('label');
        fieldLabel.htmlFor = `paper-trail-field-${field}`;
        fieldLabel.textContent = field;
        fieldLabel.className = 'paper-trail-field-label';
        fieldLabel.style.fontSize = '16px';
        
        fieldRow.appendChild(fieldCheckbox);
        fieldRow.appendChild(fieldLabel);
        fieldList.appendChild(fieldRow);
      });
      
      // Handle toggle all checkbox
      toggleAllCheckbox.addEventListener('change', () => {
        const isChecked = toggleAllCheckbox.checked;
        const fieldCheckboxes = fieldList.querySelectorAll('input[type="checkbox"]');
        fieldCheckboxes.forEach(checkbox => {
          checkbox.checked = isChecked;
        });
      });
      
      fieldSelectionForm.appendChild(fieldList);
      
      // Add all elements to step 2
      step2.appendChild(fieldSelectionTitle);
      step2.appendChild(fieldDescription);
      step2.appendChild(fieldSelectionForm);
    };
    
    // Function to display the review screen (Step 3)
    const showReviewFields = () => {
      // Hide previous steps, show step 3
      document.getElementById('paper-trail-step-1').style.display = 'none';
      document.getElementById('paper-trail-step-2').style.display = 'none';
      document.getElementById('paper-trail-step-3').style.display = 'block';
      
      // Change button text and action
      restoreButton.textContent = 'Restore Selected Fields';
      restoreButton.className = 'paper-trail-btn-danger';
      restoreButton.onclick = restoreSelectedFields;
      
      // Clear previous content
      step3.innerHTML = '';
      
      // Create review UI
      const reviewTitle = document.createElement('h3');
      reviewTitle.textContent = 'Review Selected Fields';
      reviewTitle.style.fontSize = '18px';
      reviewTitle.style.fontWeight = 'bold';
      reviewTitle.style.color = '#32324d';
      reviewTitle.style.marginBottom = '16px';
      
      const reviewDescription = document.createElement('p');
      reviewDescription.textContent = 'Review the fields that will be restored from this version:';
      reviewDescription.style.fontSize = '16px';
      reviewDescription.style.color = '#666687';
      reviewDescription.style.marginBottom = '16px';
      
      // Get selected fields
      const selectedFields = [];
      const fieldCheckboxes = document.querySelectorAll('#paper-trail-step-2 input[type="checkbox"]:not(#paper-trail-toggle-all)');
      fieldCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
          selectedFields.push(checkbox.dataset.fieldName);
        }
      });
      
      // Create warning if no fields selected
      if (selectedFields.length === 0) {
        const warningMessage = document.createElement('div');
        warningMessage.className = 'paper-trail-restore-warning';
        warningMessage.textContent = 'No fields selected. Please go back and select at least one field to restore.';
        warningMessage.style.fontSize = '16px';
        step3.appendChild(warningMessage);
        
        // Disable restore button
        restoreButton.disabled = true;
        restoreButton.style.opacity = '0.5';
        restoreButton.style.cursor = 'not-allowed';
      } else {
        // Create review list
        const reviewList = document.createElement('div');
        reviewList.className = 'paper-trail-review-list';
        
        // Compare old values with current values
        selectedFields.forEach(field => {
          const fieldRow = document.createElement('div');
          fieldRow.style.marginBottom = '12px';
          fieldRow.style.padding = '8px';
          fieldRow.style.borderBottom = '1px solid #eaeaef';
          
          const fieldName = document.createElement('h4');
          fieldName.textContent = field;
          fieldName.style.margin = '0 0 8px 0';
          fieldName.style.fontSize = '16px';
          fieldName.style.fontWeight = 'bold';
          
          const oldValue = document.createElement('div');
          oldValue.innerHTML = `<strong>Old Value:</strong> ${formatValue(trail.content[field])}`;
          oldValue.style.fontSize = '16px';
          oldValue.style.marginBottom = '4px';
          
          const newValue = document.createElement('div');
          newValue.innerHTML = `<strong>Current Value:</strong> ${formatValue(currentContent?.[field])}`;
          newValue.style.fontSize = '16px';
          
          fieldRow.appendChild(fieldName);
          fieldRow.appendChild(oldValue);
          fieldRow.appendChild(newValue);
          reviewList.appendChild(fieldRow);
        });
        
        // Create warning message
        const warningMessage = document.createElement('div');
        warningMessage.className = 'paper-trail-restore-warning';
        warningMessage.textContent = 'Warning: This action will overwrite the current values of the selected fields!';
        warningMessage.style.fontSize = '16px';
        
        step3.appendChild(reviewTitle);
        step3.appendChild(reviewDescription);
        step3.appendChild(reviewList);
        step3.appendChild(warningMessage);
      }
    };
    
    // Function to format values for display
    const formatValue = (value) => {
      if (value === null || value === undefined) {
        return '<em>Empty</em>';
      }
      
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2);
        } catch (e) {
          return String(value);
        }
      }
      
      return String(value);
    };
    
    // Function to actually restore the selected fields
    const restoreSelectedFields = async () => {
      try {
        // Get content type info from URL
        const contentInfo = extractContentTypeFromUrl();
        if (!contentInfo || !contentInfo.contentType || !contentInfo.id) {
          throw new Error('Could not extract content type information from URL');
        }
        
        // Get selected fields
        const selectedFields = [];
        const fieldCheckboxes = document.querySelectorAll('#paper-trail-step-2 input[type="checkbox"]:not(#paper-trail-toggle-all)');
        fieldCheckboxes.forEach(checkbox => {
          if (checkbox.checked) {
            selectedFields.push(checkbox.dataset.fieldName);
          }
        });
        
        if (selectedFields.length === 0) {
          alert('No fields selected. Please select at least one field to restore.');
          return;
        }
        
        // Show loading state
        restoreButton.disabled = true;
        restoreButton.textContent = 'Restoring...';
        
        // Build the payload with only selected fields
        const payload = {};
        selectedFields.forEach(field => {
          if (trail.content && trail.content[field] !== undefined) {
            payload[field] = trail.content[field];
          }
        });
        
        // Add required ID field
        if (trail.content && trail.content.id) {
          payload.id = trail.content.id;
        }
        
        console.log('[Paper Trail] Restoring fields with payload:', payload);
        
        // Send the update request
        const endpoint = `/content-manager/collection-types/${contentInfo.contentType}/${contentInfo.id}`;
        const legacyEndpoint = `/api/content-manager/collection-types/${contentInfo.contentType}/${contentInfo.id}`;
        
        let response;
        
        try {
          // Try the main endpoint first
          response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        } catch (error) {
          console.log('[Paper Trail] Error updating with main endpoint:', error);
          
          // Try the legacy endpoint
          response = await fetch(legacyEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
        
        if (!response.ok) {
          throw new Error(`Failed to update content: ${response.status} ${response.statusText}`);
        }
        
        // Show success message
        alert('Successfully restored the selected fields from version ' + trail.version);
        
        // Close the modal
        document.body.removeChild(detailModalOverlay);
        
        // Refresh the page to show updated content
        window.location.reload();
      } catch (error) {
        console.error('[Paper Trail] Error restoring fields:', error);
        alert('Error restoring fields: ' + error.message);
        
        // Reset button state
        restoreButton.disabled = false;
        restoreButton.textContent = 'Restore Selected Fields';
      }
    };

    detailModalBody.appendChild(contentDetails);

    // Create modal footer with restore button
    const detailModalFooter = document.createElement('div');
    detailModalFooter.style.padding = '16px 24px';
    detailModalFooter.style.borderTop = '1px solid #eaeaef';
    detailModalFooter.style.display = 'flex';
    detailModalFooter.style.justifyContent = 'space-between';

    // Create back button (hidden initially, shown in steps 2-3)
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'paper-trail-btn-secondary';
    backButton.style.padding = '8px 16px';
    backButton.style.fontSize = '16px'; // Increased font size
    backButton.style.display = 'none';
    backButton.onclick = () => {
      // Determine which step to go back to
      if (document.getElementById('paper-trail-step-3').style.display === 'block') {
        // Go back to step 2
        showFieldSelection();
        // Keep back button visible
        backButton.style.display = 'block';
      } else if (document.getElementById('paper-trail-step-2').style.display === 'block') {
        // Go back to step 1
        document.getElementById('paper-trail-step-1').style.display = 'block';
        document.getElementById('paper-trail-step-2').style.display = 'none';
        document.getElementById('paper-trail-step-3').style.display = 'none';
        // Hide back button
        backButton.style.display = 'none';
        // Reset restore button
        restoreButton.textContent = 'Restore This Version';
        restoreButton.className = 'paper-trail-btn-primary';
        restoreButton.onclick = showFieldSelection;
      }
    };

    // Create restore button
    const restoreButton = document.createElement('button');
    restoreButton.textContent = 'Restore This Version';
    restoreButton.className = 'paper-trail-btn-primary';
    restoreButton.style.padding = '8px 16px';
    restoreButton.style.fontSize = '16px'; // Increased font size
    restoreButton.onclick = showFieldSelection; // Start with field selection

    // Create close button
    const detailCloseFooterButton = document.createElement('button');
    detailCloseFooterButton.textContent = 'Close';
    detailCloseFooterButton.className = 'paper-trail-btn-secondary';
    detailCloseFooterButton.style.padding = '8px 16px';
    detailCloseFooterButton.style.fontSize = '16px'; // Increased font size
    detailCloseFooterButton.onclick = () => {
      document.body.removeChild(detailModalOverlay);
    };

    // Add buttons to footer with button group
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '8px';
    
    buttonGroup.appendChild(restoreButton);
    buttonGroup.appendChild(detailCloseFooterButton);
    
    detailModalFooter.appendChild(backButton);
    detailModalFooter.appendChild(buttonGroup);

    // Assemble modal
    detailModalContent.appendChild(detailModalHeader);
    detailModalContent.appendChild(detailModalBody);
    detailModalContent.appendChild(detailModalFooter);
    detailModalOverlay.appendChild(detailModalContent);

    // Add modal to the DOM
    document.body.appendChild(detailModalOverlay);
  } catch (error) {
    console.error('[Paper Trail] Error showing trail detail:', error);
    alert('Error showing version details. Please try again.');
  }
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
      const response = await fetch(
        `/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.enabled === true;
      }
    } catch (apiError) {
      console.log('[Paper Trail] Error using is-enabled endpoint:', apiError);
      // Fallback to legacy path format
      try {
        const legacyResponse = await fetch(
          `/api/paper-trail/is-enabled?contentType=${encodeURIComponent(contentType)}`
        );
        if (legacyResponse.ok) {
          const data = await legacyResponse.json();
          return data.enabled === true;
        }
      } catch (legacyError) {
        console.log(
          '[Paper Trail] Error using legacy is-enabled endpoint:',
          legacyError
        );
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
      console.log(
        `[Paper Trail] Content type ${contentType} is in the known enabled list`
      );
      return true;
    }

    // Try to fetch all enabled content types if we haven't already
    if (!window.paperTrailEnabledContentTypes) {
      try {
        const response = await fetch('/paper-trail/enabled-content-types');
        if (!response.ok) {
          // Fallback to legacy path
          console.log(
            '[Paper Trail] Trying legacy path for enabled-content-types'
          );
          const legacyResponse = await fetch(
            '/api/paper-trail/enabled-content-types'
          );
          if (legacyResponse.ok) {
            return legacyResponse;
          }
        }
        if (response.ok) {
          const data = await response.json();
          if (data.contentTypes && Array.isArray(data.contentTypes)) {
            window.paperTrailEnabledContentTypes = data.contentTypes;
            console.log(
              '[Paper Trail] Loaded enabled content types:',
              window.paperTrailEnabledContentTypes
            );
          }
        }
      } catch (listError) {
        console.log(
          '[Paper Trail] Error fetching enabled content types:',
          listError
        );
      }
    }

    // Check if we have the list of enabled content types
    if (
      window.paperTrailEnabledContentTypes &&
      Array.isArray(window.paperTrailEnabledContentTypes)
    ) {
      return window.paperTrailEnabledContentTypes.includes(contentType);
    }

    // As a final resort, we'll be cautious and assume it's not enabled
    console.log(
      `[Paper Trail] Could not verify if ${contentType} has Paper Trail enabled, assuming it's not`
    );
    return false;
  } catch (error) {
    console.error('[Paper Trail] Error checking if enabled:', error);
    return false;
  }
};

// Function to inject Paper Trail
export const injectVanillaPaperTrail = async () => {
  console.log('[Paper Trail] Starting vanilla injection');

  // Check if the React component is already present - if so, don't inject our own
  const reactComponent = document.querySelector(
    '[aria-labelledby="paper-trail-records"]'
  );
  if (reactComponent) {
    console.log(
      '[Paper Trail] React component found, skipping vanilla injection'
    );
    return false;
  }

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
            <button id="paper-trail-view-button" style="background-color: #4945ff; color: white; border: none; border-radius: 4px; padding: 10px 16px; font-size: 16px; cursor: pointer; font-weight: 600; transition: background-color 0.2s; margin-top: 12px;">
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
              viewButton.addEventListener('click', async () => {
                try {
                  // Get content type info from URL
                  const urlInfo = extractContentTypeFromUrl();
                  if (!urlInfo || !urlInfo.contentType || !urlInfo.id) {
                    console.error(
                      '[Paper Trail] Could not extract content type information from URL'
                    );
                    return;
                  }

                  // Use our vanilla modal implementation directly for consistent experience
                  console.log('[Paper Trail] Creating enhanced vanilla modal');
                  createVanillaModal(urlInfo.contentType, urlInfo.id);
                } catch (error) {
                  console.error(
                    '[Paper Trail] Error handling View All Versions click:',
                    error
                  );
                }
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
                  viewButton.addEventListener('click', async () => {
                    try {
                      // Get content type info from URL
                      const urlInfo = extractContentTypeFromUrl();
                      if (!urlInfo || !urlInfo.contentType || !urlInfo.id) {
                        console.error(
                          '[Paper Trail] Could not extract content type information from URL'
                        );
                        return;
                      }

                      // Use our vanilla modal implementation directly for consistent experience
                      console.log('[Paper Trail] Creating enhanced vanilla modal');
                      createVanillaModal(urlInfo.contentType, urlInfo.id);
                    } catch (error) {
                      console.error(
                        '[Paper Trail] Error handling View All Versions click:',
                        error
                      );
                    }
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
