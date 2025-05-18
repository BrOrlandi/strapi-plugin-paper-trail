import {
  Box,
  Card,
  Grid,
  Loader,
  Typography
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
// Icons removed for V5 compatibility
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import getTrad from '../../utils/getTrad';

function MediaCard(props) {
  const { id } = props;

  const [media, setMedia] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { formatMessage } = useIntl();

  const { get } = useFetchClient();

  useEffect(() => {
    async function fetchData() {
      const requestUri = `/upload/files?page=1&pageSize=1&filters[$and][0][id]=${id}`;

      try {
        const result = await get(requestUri);

        const { data = {} } = result;

        const { results = [] } = data;

        if (results.length > 0) {
          setMedia(results[0]);
          setLoaded(true);
        } else {
          setError(
            formatMessage({
              id: getTrad('plugin.admin.paperTrail.mediaNotFound'),
              defaultMessage: 'Empty'
            })
          );
        }
      } catch (Err) {
        // Paper trail error
        setError(Err);
      }
    }

    fetchData();
  }, [id, formatMessage, get]);

  return (
    <Grid.Item col={4}>
      {error ? (
        <Box
          background="neutral0"
          borderColor="neutral150"
          hasRadius
          paddingBottom={4}
          paddingLeft={4}
          paddingRight={4}
          paddingTop={6}
          shadow="tableShadow"
        >
          <Typography variant="beta">{String(error)}</Typography>
        </Box>
      ) : null}
      {!error && loaded && media ? (
        <Card>
          <Card.Header>
            <Card.Asset
              src={
                media?.mime?.includes('image')
                  ? media?.formats?.thumbnail?.url || media.url
                  : null
              }
            >
              {!media?.mime?.includes('image') ? "File" : null}
            </Card.Asset>
          </Card.Header>
          <Card.Body>
            <Card.Content>
              <Card.Title>{String(media?.name)}</Card.Title>
              <Card.Subtitle>{String(media?.mime)}</Card.Subtitle>
            </Card.Content>
            <Card.Badge>
              {formatMessage({
                id: getTrad('plugin.admin.paperTrail.media'),
                defaultMessage: 'Media'
              })}
            </Card.Badge>
          </Card.Body>
        </Card>
      ) : (
        <Box
          background="neutral0"
          borderColor="neutral150"
          hasRadius
          paddingBottom={4}
          paddingLeft={4}
          paddingRight={4}
          paddingTop={6}
          shadow="tableShadow"
        >
          <Loader />
        </Box>
      )}
    </Grid.Item>
  );
}

MediaCard.propTypes = {
  id: PropTypes.number.isRequired
};

export default MediaCard;
