import * as yup from 'yup';
import React from 'react';
import getTrad from './utils/getTrad';
import SavePaperTrailButton from './components/SaveButton/SavePaperTrailButton';

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
  // Extract the checkboxValue without default falsiness check
  const checkboxValue = value === true;
  
  const handleChange = (e) => {
    const newValue = e.target.checked;
    onChange({ target: { name, value: newValue, type: 'checkbox' } });
  };
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '8px' }}>
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checkboxValue}
          onChange={handleChange}
          style={{ marginRight: '8px' }}
        />
        <label htmlFor={name} style={{ fontWeight: 'bold' }}>
          {intlLabel.defaultMessage}
        </label>
      </div>
      
      <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '16px', marginLeft: '24px' }}>
        {description.defaultMessage}
      </div>
      
      <SavePaperTrailButton enabled={checkboxValue} />
    </div>
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
        type: 'custom', // Use our custom component
        Component: PaperTrailSetting,
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