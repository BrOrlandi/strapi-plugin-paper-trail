/**
 * This file provides V5-compatible layout components
 * It's a simplified version of the components from @strapi/helper-plugin
 */
import React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';

/**
 * Main Layout component
 */
export const Layout = ({ children }) => {
  return (
    <Box background="neutral100" paddingLeft={8} paddingRight={8}>
      {children}
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Header Layout component
 */
export const HeaderLayout = ({ title, subtitle, primaryAction }) => {
  return (
    <Box paddingTop={8} paddingBottom={6}>
      <Flex direction="column" gap={2}>
        <Flex gap={4} justifyContent="space-between" alignItems="center">
          <Flex direction="column" gap={1}>
            <Box>
              <Typography variant="alpha" as="h1">
                {title}
              </Typography>
            </Box>
            {subtitle && <Typography variant="epsilon">{subtitle}</Typography>}
          </Flex>
          {primaryAction && <Box>{primaryAction}</Box>}
        </Flex>
      </Flex>
    </Box>
  );
};

HeaderLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  primaryAction: PropTypes.node
};

HeaderLayout.defaultProps = {
  subtitle: null,
  primaryAction: null
};

/**
 * Content Layout component
 */
export const ContentLayout = ({ children }) => {
  return <Box paddingBottom={8}>{children}</Box>;
};

ContentLayout.propTypes = {
  children: PropTypes.node.isRequired
};