import {
  Accordion,
  Box,
  JSONInput,
  Typography
} from '@strapi/design-system';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import PropTypes from 'prop-types';
import React, { Fragment, useState } from 'react';
import { useIntl } from 'react-intl';

import prepareTrailFromSchema from '../../utils/prepareTrailFromSchema';
import getTrad from '../../utils/getTrad';
import RenderField from '../RenderField/RenderField';

function RevisionForm(props) {
  const { trail, setRevisedFields } = props;

  const { content } = trail;

  const { model } = useContentManagerContext();

  const { formatMessage } = useIntl();
  const [expanded, setExpanded] = useState(false);

  /**
   * trim ignored props and anything not in the current schema
   */

  const { trail: trimmedContent } = prepareTrailFromSchema(content, model);

  return (
    <Fragment>
      <Box paddingBottom={4} paddingLeft={1} paddingRight={1}>
        <Typography variant="beta">
          {formatMessage({
            id: getTrad('plugin.admin.paperTrail.revisionExplanation'),
            defaultMessage:
              'Select properties from the below list to restore from this revision. You will have the chance to review before committing.'
          })}
        </Typography>
      </Box>
      <form>
        {Object.keys(trimmedContent).map(key => (
          <RenderField
            key={key}
            name={key}
            value={trimmedContent[key]}
            setRevisedFields={setRevisedFields}
          />
        ))}
      </form>
      {/* raw json */}
      <Box padding={4} background="neutral100">
        <Accordion.Root
          expanded={expanded}
          onToggle={() => setExpanded(s => !s)}
          id="acc-field-pt-raw"
        >
          <Accordion.Trigger
            togglePosition="right"
            title={formatMessage({
              id: getTrad('plugin.admin.paperTrail.viewRawJson'),
              defaultMessage: 'View JSON'
            })}
          />
          <Accordion.Content>
            <Box padding={3}>
              <JSONInput value={JSON.stringify(trimmedContent, null, 2)} />
            </Box>
          </Accordion.Content>
        </Accordion.Root>
      </Box>
    </Fragment>
  );
}

RevisionForm.propTypes = {
  setRevisedFields: PropTypes.func.isRequired,
  trail: PropTypes.shape({
    change: PropTypes.string,
    content: PropTypes.object,
    contentType: PropTypes.string,
    createdAt: PropTypes.string,
    id: PropTypes.number,
    recordId: PropTypes.string,
    updatedAt: PropTypes.string
  })
};

export default RevisionForm;
