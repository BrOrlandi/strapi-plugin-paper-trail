import {
  Box,
  Button,
  Divider,
  Loader,
  Typography
} from '@strapi/design-system';
import { format, parseISO } from 'date-fns';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { useContentManagerContext, useFetchClient } from '../../utils/hooks';
import { checkPluginStatus } from '../../utils/debugPlugin';

import getTrad from '../../utils/getTrad';
import getUser from '../../utils/getUser';
import PaperTrailViewer from '../PaperTrailViewer/PaperTrailViewer';

function PaperTrail() {
  /**
   * Get the current schema
   */
  console.log('[Paper Trail DEBUG] PaperTrail component rendering');
  
  // Check plugin status
  const pluginStatus = checkPluginStatus();
  console.log('[Paper Trail DEBUG] Plugin status check:', pluginStatus);
  
  const { model } = useContentManagerContext();
  console.log('[Paper Trail DEBUG] Content Manager model:', model);

  const { uid, pluginOptions = {} } = model?.attributes ? model : { uid: '', pluginOptions: {} };
  console.log('[Paper Trail DEBUG] UID:', uid, 'Paper Trail enabled:', pluginOptions?.paperTrail?.enabled);

  const { formatMessage } = useIntl();
  // params works for collection types but not single types
  const { id, collectionType } = useParams();
  console.log('[Paper Trail DEBUG] Params:', { id, collectionType });

  const [entityId, setEntityId] = useState(id ? String(id) : undefined);

  const paperTrailEnabled = pluginOptions?.paperTrail?.enabled;

  // TODO: add this to config/plugins.ts, needs a custom endpoint
  // https://forum.strapi.io/t/custom-field-settings/23068
  const pageSize = 15;

  const { get } = useFetchClient();

  const [trails, setTrails] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  // if collectionType is single then fetch the ID (if exists) from the server and set `1` if nothing.

  const getSingleTypeId = useCallback(async () => {
    const requestUri = `/content-manager/single-types/${uid}/`;

    try {
      const result = await get(requestUri);

      const { data = {} } = result;

      const { id } = data;

      setEntityId(id ? String(id) : undefined);

      return id;
    } catch (err) {
      // No existing single type for this UID
    }

    return null;
  }, [uid, get]);

  useEffect(() => {
    if (collectionType === 'single-types') {
      getSingleTypeId();
    }
  }, [collectionType, getSingleTypeId]);

  useEffect(() => {
    async function getTrails(page, pageSize) {
      const params = new URLSearchParams({
        page,
        pageSize,
        sort: 'version:DESC', // Ensure descending sort to get latest version first
        'filters[$and][0][contentType][$eq]': uid,
        'filters[$and][1][entityId][$eq]': entityId
      }).toString();

      // Try both our custom API endpoint and the content-manager endpoint
      // Use the correct path format for Strapi V5
      const apiEndpoint = `/paper-trail/trails?contentType=${encodeURIComponent(uid)}&entityId=${entityId}`;
      const legacyApiEndpoint = `/api/paper-trail/trails?contentType=${encodeURIComponent(uid)}&entityId=${entityId}`;
      const cmEndpoint = `/content-manager/collection-types/plugin::paper-trail.trail?${params}`;

      try {
        // First try our custom API endpoint with correct Strapi V5 path
        let result;
        let useCustomApi = true;
        
        try {
          result = await get(apiEndpoint);
          console.log('[Paper Trail DEBUG] Custom API endpoint successful');
        } catch (apiError) {
          console.log('[Paper Trail DEBUG] Custom API failed, trying legacy endpoint:', apiError);
          try {
            // Try the legacy path format as a fallback
            result = await get(legacyApiEndpoint);
            console.log('[Paper Trail DEBUG] Legacy API endpoint successful');
          } catch (legacyError) {
            console.log('[Paper Trail DEBUG] Legacy API failed, trying content-manager endpoint:', legacyError);
            useCustomApi = false;
            result = await get(cmEndpoint);
          }
        }

        // Parse the result based on which endpoint succeeded
        let results = [];
        let pagination = { total: 0, pageCount: 1 };
        
        if (useCustomApi) {
          // Direct array from our custom API
          results = Array.isArray(result) ? result : [];
          pagination = { 
            total: results.length,
            pageCount: Math.ceil(results.length / pageSize) || 1
          };
        } else {
          // Standard content-manager format
          const { data = {} } = result;
          results = data.results || [];
          pagination = data.pagination || { total: 0, pageCount: 1 };
        }

        const { total, pageCount } = pagination;

        setTotal(total);
        setPageCount(pageCount);
        setTrails(results);

        // Make sure we get the latest version (highest version number) as the current one
        if (page === 1 && total > 0) {
          // Sort by version in descending order to make sure we get the latest
          const sortedResults = [...results].sort((a, b) => 
            (b.version || 0) - (a.version || 0)
          );
          setCurrent(sortedResults[0]);
          console.log('[Paper Trail DEBUG] Set current version to:', sortedResults[0]);
        }

        setLoaded(true);
        setInitialLoad(true);
      } catch (Err) {
        // Paper trail error
        setError(Err);
      }
    }

    if (!loaded && paperTrailEnabled && entityId) {
      getTrails(page, pageSize);
    } else {
      setInitialLoad(true);
    }
  }, [loaded, uid, entityId, page, paperTrailEnabled, get]);

  /**
   * event listener for submit button
   */

  const handler = useCallback(async () => {
    setTimeout(async () => {
      if (collectionType === 'single-types') {
        await getSingleTypeId();
      }
      setPage(1);
      setLoaded(false);
      setInitialLoad(false);
    }, 1000);
  }, [collectionType, getSingleTypeId]);

  const handleSetPage = useCallback(newPage => {
    setPage(newPage);
    setLoaded(false);
  }, []);

  /**
   * Use MutationObserver instead of direct DOM manipulation
   * This is a more React-friendly approach for Strapi V5
   */

  useEffect(() => {
    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          Array.from(mutation.addedNodes).forEach(node => {
            // Check if the added node is the submit button or contains it
            if (node.tagName === 'BUTTON' && node.type === 'submit') {
              node.addEventListener('click', handler);
            } else if (node.querySelector) {
              const button = node.querySelector('button[type=submit]');
              if (button) {
                button.addEventListener('click', handler);
              }
            }
          });
        }
      });
    });

    // Start observing the main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
      observer.observe(mainContent, { childList: true, subtree: true });
      
      // Also check if the button already exists
      const existingButton = mainContent.querySelector('button[type=submit]');
      if (existingButton) {
        existingButton.addEventListener('click', handler);
      }
    }

    return () => {
      // Disconnect the observer when the component unmounts
      observer.disconnect();
      
      // Clean up any event listeners
      const button = document.querySelector('main button[type=submit]');
      if (button) {
        button.removeEventListener('click', handler);
      }
    };
  }, [handler]);

  if (!paperTrailEnabled) {
    console.log('[Paper Trail DEBUG] Paper Trail not enabled for this content type, not rendering');
    return <Fragment />;
  }
  
  console.log('[Paper Trail DEBUG] Paper Trail enabled, rendering component');

  // TODO: Add diff comparison
  // TODO: Add up/down for changing UIDs and enabling/disabling plugin

  return (
    <Fragment>
      <Box
        as="aside"
        aria-labelledby="paper-trail-records"
        background="neutral0"
        borderColor="neutral150"
        hasRadius
        paddingBottom={4}
        paddingLeft={4}
        paddingRight={4}
        paddingTop={6}
        shadow="tableShadow"
        marginTop={5} // Add margin for consistent spacing
        style={{ backgroundColor: 'white' }} // Explicitly set white background
      >
        <Typography
          variant="sigma"
          textColor="neutral600"
          id="paper-trail-records"
        >
          {formatMessage({
            id: getTrad('plugin.admin.paperTrail.title'),
            defaultMessage: 'Paper Trail'
          })}
        </Typography>
        <Box paddingTop={2} paddingBottom={4}>
          <Divider />
        </Box>
        {initialLoad ? (
          <Fragment>
            {total === 0 && (
              <Typography fontWeight="bold">
                {formatMessage({
                  id: getTrad('plugin.admin.paperTrail.noTrails'),
                  defaultMessage: 'No versions (yet)'
                })}
              </Typography>
            )}
            {total > 0 && current && (
              <Fragment>
                <p>
                  <Typography fontWeight="bold">
                    {formatMessage({
                      id: getTrad('plugin.admin.paperTrail.currentVersion'),
                      defaultMessage: 'Current version:'
                    })}{' '}
                    {current.version || total}
                  </Typography>
                </p>
                <p>
                  <Typography variant="pi" fontWeight="bold" color="Neutral600">
                    {formatMessage({
                      id: getTrad('plugin.admin.paperTrail.created'),
                      defaultMessage: 'Last Updated:'
                    })}{' '}
                  </Typography>
                  <Typography variant="pi" color="Neutral600">
                    {format(parseISO(current.createdAt), 'MMM d, yyyy HH:mm')}
                  </Typography>
                </p>
                <p>
                  <Typography variant="pi" fontWeight="bold" color="Neutral600">
                    {formatMessage({
                      id: getTrad('plugin.admin.paperTrail.createdBy'),
                      defaultMessage: 'Updated by:'
                    })}{' '}
                  </Typography>
                  <Typography variant="pi" color="Neutral600">
                    {getUser(current)}
                  </Typography>
                </p>
                <Box paddingTop={4}>
                  <Button onClick={() => setModalVisible(!modalVisible)}>
                    {formatMessage({
                      id: getTrad('plugin.admin.paperTrail.viewAll'),
                      defaultMessage: 'View all'
                    })}
                  </Button>
                </Box>
              </Fragment>
            )}
          </Fragment>
        ) : (
          <Loader />
        )}
      </Box>
      <PaperTrailViewer
        visible={modalVisible}
        setVisible={setModalVisible}
        trails={trails}
        error={error}
        setError={setError}
        page={page}
        pageSize={pageSize}
        pageCount={pageCount}
        total={total}
        setPage={handleSetPage}
        collectionType={collectionType}
      />
    </Fragment>
  );
}

export default PaperTrail;
