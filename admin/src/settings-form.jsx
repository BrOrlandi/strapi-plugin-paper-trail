import * as yup from 'yup';
import React from 'react';
import { Box, Button, Checkbox, Typography } from '@strapi/design-system';
import getTrad from './utils/getTrad';

/**
 * Custom wrapper component that adds a save button
 */
const PaperTrailSetting = ({ 
  name,
  onChange,
  value,
  intlLabel,
  description,
  ...props
}) => {
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  
  // Extract the checkboxValue without default falsiness check
  const checkboxValue = value === true;
  
  const handleChange = (newValue) => {
    onChange({ target: { name, value: newValue, type: 'checkbox' } });
  };
  
  // Function to save Paper Trail settings
  const saveSetting = async () => {
    try {
      setSaving(true);
      
      // Get UID from URL
      const path = window.location.pathname;
      const matches = path.match(/content-types\/([^/]+)/);
      const uid = matches && matches[1] ? matches[1] : '';
      
      if (!uid) {
        console.error('Could not extract content type UID from URL');
        return;
      }
      
      console.log(`Saving Paper Trail setting for ${uid}: ${checkboxValue}`);
      
      const response = await fetch(`/paper-trail/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          enabled: checkboxValue,
        }),
      });
      
      if (response.ok) {
        console.log('Paper Trail settings saved successfully!');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('Failed to save Paper Trail settings:', await response.text());
      }
    } catch (error) {
      console.error('Error saving Paper Trail settings:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Box padding={4}>
      <Box paddingBottom={2}>
        <Checkbox
          id={name}
          name={name}
          onValueChange={handleChange}
          value={checkboxValue}
        >
          {intlLabel.defaultMessage}
        </Checkbox>
      </Box>
      
      <Box paddingLeft={6} paddingBottom={4}>
        <Typography variant="pi" textColor="neutral600">
          {description.defaultMessage}
        </Typography>
      </Box>
      
      <Button
        onClick={saveSetting}
        disabled={saving}
        loading={saving}
        variant={saved ? 'success-light' : 'default'}
      >
        {saved ? 'Settings Saved!' : 'Save Paper Trail Settings'}
      </Button>
    </Box>
  );
};

/**
 * Form configuration object for Paper Trail settings
 */
export default {
  pluginId: 'paper-trail',
  section: {
    id: 'paperTrail.settings',
    intlLabel: {
      id: getTrad('plugin.schema.paperTrail.section'),
      defaultMessage: 'Paper Trail Settings',
    }
  },
  
  validator: yup.object().shape({
    pluginOptions: yup.object().shape({
      paperTrail: yup.object().shape({
        enabled: yup.boolean()
      })
    })
  }),
  
  form: {
    advanced: [
      {
        name: 'pluginOptions.paperTrail.enabled',
        type: 'boolean', // Use our custom component
        intlLabel: {
          id: getTrad('plugin.schema.paperTrail.label-content-type'),
          defaultMessage: 'Paper Trail'
        },
        description: {
          id: getTrad('plugin.schema.paperTrail.description-content-type'),
          defaultMessage: 'Enable Paper Trail auditing and content versioning for this content type'
        }
      }
    ]
  }
};