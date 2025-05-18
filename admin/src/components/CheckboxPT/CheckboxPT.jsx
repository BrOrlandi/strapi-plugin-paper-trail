import { Checkbox, Typography, Flex, Box } from '@strapi/design-system';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';

// This is a simpler checkbox component designed specifically for Strapi V5
const CheckboxPT = ({
  description,
  intlLabel,
  name,
  onChange,
  value,
  disabled,
  error
}) => {
  const { formatMessage } = useIntl();
  const [checkboxValue, setCheckboxValue] = useState(Boolean(value));
  
  // Update internal state when prop value changes
  useEffect(() => {
    setCheckboxValue(Boolean(value));
  }, [value]);

  // Format labels
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage || 'Paper Trail' },
        { ...(intlLabel.values || {}) }
      )
    : name;

  const hint = description?.id
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage || '' },
        { ...(description.values || {}) }
      )
    : '';

  // Handle checkbox change
  const handleChange = () => {
    // Toggle the value
    const newValue = !checkboxValue;
    setCheckboxValue(newValue);
    
    // Checkbox toggled
    
    // Try multiple onChange patterns for maximum compatibility
    try {
      // Standard event object pattern
      if (typeof onChange === 'function') {
        onChange({ 
          target: { 
            name, 
            value: newValue,
            type: 'checkbox'
          } 
        });
      }
    } catch (error) {
      // Error in checkbox change handler
    }
  };

  return (
    <Box padding={2}>
      <Flex direction="column" gap={1}>
        <Checkbox
          id={`papertrail-checkbox-${name}`}
          name={name}
          onValueChange={handleChange}
          value={checkboxValue}
          disabled={disabled}
        >
          {label}
        </Checkbox>
        
        {hint && (
          <Box paddingLeft={6}>
            <Typography variant="pi" textColor="neutral600">
              {hint}
            </Typography>
          </Box>
        )}
        
        {error && (
          <Box paddingLeft={6}>
            <Typography variant="pi" textColor="danger600">
              {error}
            </Typography>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

CheckboxPT.defaultProps = {
  description: null,
  disabled: false,
  error: null,
  value: false
};

CheckboxPT.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object
  }),
  intlLabel: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
};

export default CheckboxPT;
