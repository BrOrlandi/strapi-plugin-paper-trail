import { Box, Divider, Link, Typography } from '@strapi/design-system';
// Icons removed for V5 compatibility
import { format, parseISO } from 'date-fns';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { useIntl } from 'react-intl';

import getTrad from '../../utils/getTrad';
import getUser from '../../utils/getUser';
import RevisionForm from '../RevisionForm/RevisionForm';

function PaperTrailRestoreView(props) {
  const { trail, setViewRevision, setRevisedFields } = props;

  const { formatMessage } = useIntl();

  return (
    <Fragment>
      <Box background="neutral100">
        <Box
          paddingTop={6}
          paddingBottom={4}
          paddingLeft={4}
          paddingRight={4}
        >
          <Box paddingBottom={2}>
            <Link
              to="#back"
              
              onClick={event => {
                event.preventDefault();
                setViewRevision(null);
              }}
            >
              {formatMessage({
                id: getTrad('plugin.admin.paperTrail.back'),
                defaultMessage: 'Back'
              })}
            </Link>
          </Box>
          <Box paddingBottom={1}>
            <Typography variant="alpha">
              {`${formatMessage({
                id: getTrad('plugin.admin.paperTrail.version'),
                defaultMessage: 'Version'
              })} ${trail.version}`}
            </Typography>
          </Box>
          <Typography variant="epsilon">
            {`${formatMessage({
              id: getTrad('plugin.admin.paperTrail.id'),
              defaultMessage: 'ID'
            })}: ${trail.entityId} | ${trail.change} | ${format(
              parseISO(trail.createdAt),
              'MMM d, yyyy HH:mm'
            )} ${formatMessage({
              id: getTrad('plugin.admin.paperTrail.by'),
              defaultMessage: 'by'
            })} ${getUser(trail)}`}
          </Typography>
        </Box>
      </Box>
      <Box paddingBottom={6} paddingTop={6}>
        <Divider />
      </Box>
      <Box
        background="neutral0"
        borderColor="neutral150"
        hasRadius
        paddingBottom={4}
        paddingLeft={4}
        paddingRight={4}
        paddingTop={6}
      >
        <RevisionForm trail={trail} setRevisedFields={setRevisedFields} />
      </Box>
    </Fragment>
  );
}

PaperTrailRestoreView.propTypes = {
  setViewRevision: PropTypes.func.isRequired,
  setRevisedFields: PropTypes.func.isRequired,
  trail: PropTypes.shape({
    change: PropTypes.string,
    content: PropTypes.object,
    contentType: PropTypes.string,
    createdAt: PropTypes.string,
    id: PropTypes.number,
    entityId: PropTypes.string,
    updatedAt: PropTypes.string
  })
};

export default PaperTrailRestoreView;
