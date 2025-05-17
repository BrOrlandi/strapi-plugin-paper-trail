import pluginPkg from '../../package.json';
import React from 'react';
import { Box, Typography } from '@strapi/design-system';
import Initializer from './components/Initializer';
import PaperTrail from './components/PaperTrail/PaperTrail.jsx';
import injectionZones from './injectionZones';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';
import * as yup from 'yup';

// Remove admin extension script import since we're not using it anymore

// Custom implementation of prefixPluginTranslations
const prefixPluginTranslations = (data, pluginId) => {
  return Object.keys(data).reduce((acc, key) => {
    acc[`${pluginId}.${key}`] = data[key];
    return acc;
  }, {});
};

const name = pluginPkg.strapi.name;

// Simplified plugin registration for Strapi V5
export default {
  register(app) {
    // Simpler plugin registration that works with V5's expectations
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });

    // Remove the settings page registration if it exists
    // app.addSettingsLink('global', {
    //   id: 'paper-trail-settings',
    //   to: `/settings/${pluginId}`,
    //   name: getTrad('plugin.name', 'Paper Trail Settings'),
    //   Component: SettingsPage, // REMOVING THIS
    //   permissions: [], // Add appropriate permissions if needed
    // });

    // Extend the Content-Type Builder form for Strapi V5 - but make it display-only
    try {
      console.log('Setting up Paper Trail form extension as display-only');
      
      const ctb = app.getPlugin('content-type-builder');
      
      if (ctb && ctb.apis && ctb.apis.forms) {
        const formsAPI = ctb.apis.forms;
        
        // Custom component to display Paper Trail status (read-only)
        const PaperTrailStatusComponent = ({ value }) => {
          return (
            <Box padding={4}>
              <Typography variant="pi" fontWeight="bold">
                Paper Trail: {value ? 'Enabled' : 'Disabled'}
              </Typography>
              <Box paddingTop={2}>
                <Typography variant="pi" textColor="neutral600">
                  Paper Trail is {value ? 'enabled' : 'disabled'} for this content type. 
                  This can only be configured in the schema.json file.
                </Typography>
              </Box>
            </Box>
          );
        };
        
        // Register the custom component
        app.customFields.register({
          name: 'paperTrailStatus',
          pluginId: 'paper-trail',
          type: 'string',
          intlLabel: {
            id: getTrad('plugin.schema.paperTrail.status'),
            defaultMessage: 'Paper Trail Status',
          },
          components: {
            Input: PaperTrailStatusComponent,
          },
        });
        
        // Use the correct pattern for Strapi V5
        formsAPI.extendContentType({
          validator: () => ({
            pluginOptions: {
              paperTrail: {
                enabled: yup.boolean(),
              },
            },
          }),
          form: {
            advanced() {
              return [
                {
                  name: 'pluginOptions.paperTrail.enabled',
                  description: {
                    id: getTrad('plugin.schema.paperTrail.description-content-type'),
                    defaultMessage: 'Paper Trail must be configured in the schema.json file',
                  },
                  type: 'paperTrailStatus', // Use our custom component
                  intlLabel: {
                    id: getTrad('plugin.schema.paperTrail.label-content-type'),
                    defaultMessage: 'Paper Trail Status',
                  },
                },
              ];
            },
          },
        });
        console.log('Paper Trail: Display-only form extension registered successfully');
      } else {
        console.error('Paper Trail: Content-Type Builder forms API not found.');
      }
    } catch (error) {
      console.error('Paper Trail form extension failed:', error);
    }

    // Remove the problematic app.registerHook, as it's causing an Invariant Violation
    // and the Content-Type Builder should handle saving pluginOptions.
    /*
    try {
      const cm = app.getPlugin('content-manager');
      if (cm) {
        console.log('Paper Trail: Attempting to register mutate hook for EditSettingsView');
        app.registerHook('Admin/CM/pages/EditSettingsView/mutate', async ({
          args,
          getState,
          setState
        }) => {
          console.log('Paper Trail: EditSettingsView mutate hook triggered', args);
          const {
            values: {
              pluginOptions
            }
          } = args;
          if (pluginOptions && pluginOptions.paperTrail && typeof pluginOptions.paperTrail.enabled === 'boolean') {
            console.log('Paper Trail setting found in hook:', pluginOptions.paperTrail.enabled);
            // The setting should be automatically saved by the CTB by this point
            // We might not need to do anything explicit here if formsAPI.extendContentType works as expected
          }
          return args; // Continue with original mutation
        });
        console.log('Paper Trail: EditSettingsView mutate hook registered.');
      } else {
        console.warn('Paper Trail: Content Manager plugin not found for hook registration.');
      }
    } catch (e) {
      console.error('Paper Trail: Failed to register EditSettingsView mutate hook:', e);
    }
    */

    // Register the settings page (if any)
    // Example: app.addSettingsLink('global', { ... });
  },

  bootstrap(app) {
    console.log('Paper Trail plugin bootstrapping...');
    
    // Component injection is now handled by the injectionZones.js file
    console.log('Using injectionZones.js for component injection');

    // The formsAPI.extendContentType and the app.registerHook 
    // for 'Admin/CM/pages/EditSettingsView/mutate' should not be in bootstrap.
    // These were causing duplicate key warnings and/or using invalid hooks.
    // Form extension is handled in the register() function.
    /*
    try {
      console.log('Setting up Paper Trail form extension with type: \'bool\' (standard toggle)');
      
      const ctb = app.getPlugin('content-type-builder');
      
      if (ctb && ctb.apis && ctb.apis.forms) {
        const formsAPI = ctb.apis.forms;
        
        formsAPI.extendContentType({
          validator: () => ({
            pluginOptions: {
              paperTrail: {
                enabled: yup.boolean()
              }
            }
          }),
          form: {
            advanced() {
              return [
                {
                  name: 'pluginOptions.paperTrail.enabled',
                  description: {
                    id: getTrad('plugin.schema.paperTrail.description-content-type'),
                    defaultMessage: 'Enable Paper Trail auditing and content versioning for this content type'
                  },
                  type: 'bool', // Using standard boolean type
                  intlLabel: {
                    id: getTrad('plugin.schema.paperTrail.label-content-type'),
                    defaultMessage: 'Paper Trail'
                  }
                }
              ];
            }
          }
        });
        
        console.log('Paper Trail: Form extension with type: \'bool\' registered successfully');
        
        // Register hook to save settings when the main Content-Type Builder form is submitted
        app.registerHook('Admin/CM/pages/EditSettingsView/mutate', async ({ query, body }) => {
          try {
            const uid = query?.contentType;
            // Ensure body and its nested properties exist before accessing them
            const isPaperTrailEnabled = body && body.pluginOptions && body.pluginOptions.paperTrail && body.pluginOptions.paperTrail.enabled === true;
            
            if (uid) {
              console.log(`Paper Trail CTB hook: Saving setting for ${uid} - Enabled: ${isPaperTrailEnabled}`);
              
              const response = await fetch('/paper-trail/settings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  uid,
                  enabled: isPaperTrailEnabled,
                }),
              });
              
              if (!response.ok) {
                console.error('Failed to save Paper Trail settings via CTB hook', await response.text());
              }
            }
          } catch (error) {
            console.error('Error in Paper Trail CTB settings hook:', error);
          }
        });
        console.log('Paper Trail: Settings save hook for CTB registered.');

      } else {
        console.warn('Content-type-builder plugin or forms API not found for type: \'bool\' registration');
      }
    } catch (err) {
      console.error('Paper Trail form extension (type: \'bool\') failed:', err);
    }
    */

    // app.registerHook(
    //   "Admin/CM/pages/ListView/inject-column-in-table",
    //   injectionZones.listViewColumnHook
    // );
    // app.registerHook(
    //   "Admin/CM/pages/EditView/inject-column-in-table",
    //   injectionZones.editViewColumnHook
    // );

  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map(locale => {
        return import(
          /* webpackChunkName: "pt-translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale
            };
          })
          .catch(() => {
            return {
              data: {},
              locale
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  }
};
