import { Button } from '@strapi/design-system';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import getTrad from '../../utils/getTrad';
import pluginId from '../../pluginId';

/**
 * A button component that directly saves Paper Trail settings
 */
const SavePaperTrailButton = ({ enabled }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { formatMessage } = useIntl();
  
  // Extract UID from URL params
  const params = useParams();
  let uid = '';
  
  // The URL format is different depending on whether it's a single type or collection type
  if (params && params.uid) {
    uid = params.uid;
  } else if (params && params.slug) {
    uid = params.slug;
  }
  
  // Function to save Paper Trail settings
  const saveSetting = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/paper-trail/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          enabled,
        }),
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        // Failed to save settings
      }
    } catch (error) {
      // Error saving settings
    } finally {
      setSaving(false);
    }
  };
  
  if (!uid) {
    return null;
  }
  
  return (
    <Button
      onClick={saveSetting}
      disabled={saving}
      loading={saving}
      variant={saved ? 'success-light' : 'default'}
      style={{ marginTop: '16px' }}
    >
      {saved
        ? formatMessage({
            id: getTrad('saveButton.saved'),
            defaultMessage: 'Settings Saved!',
          })
        : formatMessage({
            id: getTrad('saveButton.save'),
            defaultMessage: 'Save Paper Trail Settings',
          })}
    </Button>
  );
};

SavePaperTrailButton.propTypes = {
  enabled: PropTypes.bool.isRequired,
};

export default SavePaperTrailButton;