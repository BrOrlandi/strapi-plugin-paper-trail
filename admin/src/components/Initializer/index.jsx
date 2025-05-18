/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

const Initializer = ({ setPlugin }) => {
  const ref = useRef();
  ref.current = setPlugin;

  useEffect(() => {
    console.log(`[Paper Trail DEBUG] Initializing plugin with ID: ${pluginId}`);
    ref.current(pluginId);
    console.log('[Paper Trail DEBUG] Plugin initialized');
  }, []);

  return null;
};

Initializer.propTypes = {
  setPlugin: PropTypes.func.isRequired
};

export default Initializer;
