import {
  Accordion,
  Box,
  Divider,
  JSONInput,
  Link,
  Typography
} from '@strapi/design-system';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
// Icons removed for V5 compatibility
import PropTypes from 'prop-types';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import prepareTrailFromSchema from '../../utils/prepareTrailFromSchema';
import buildPayload from '../../utils/buildPayload';
import getTrad from '../../utils/getTrad';
import RenderField from '../RenderField/RenderField';

function PaperTrailReview(props) {
  const { trail, revisedFields, setShowReviewStep } = props;
  const { content } = trail;
  const [expanded, setExpanded] = useState(false);
  const [changePayload, setChangePayload] = useState({});

  const { model } = useContentManagerContext();

  const { trail: trimmedContent } = useMemo(() => {
    return prepareTrailFromSchema(content, model);
  }, [content, model]);

  const { formatMessage } = useIntl();

  useEffect(() => {
    let changePayloadObj = buildPayload(trimmedContent, revisedFields);

    setChangePayload(changePayloadObj);
  }, [trimmedContent, revisedFields]);

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
                setShowReviewStep(false);
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
              {formatMessage({
                id: getTrad('plugin.admin.paperTrail.reviewChanges'),
                defaultMessage: 'Review changes'
              })}
            </Typography>
          </Box>
          <Typography variant="epsilon">
            {formatMessage({
              id: getTrad('plugin.admin.paperTrail.reviewChangesDescription'),
              defaultMessage:
                "Review the below changes carefully. Upon clicking 'Restore' the record will be instantly updated with the selected values."
            })}
          </Typography>
        </Box>
      </Box>
      <Box paddingBottom={6} paddingTop={6}>
        <Divider />
      </Box>
      <Box padding={4} background="neutral100">
        {Object.keys(changePayload).map(key => (
          <RenderField
            key={key}
            name={key}
            value={changePayload[key]}
            hideAccordion={true}
          />
        ))}
      </Box>
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
              <JSONInput value={JSON.stringify(changePayload, null, 2)} />
            </Box>
          </Accordion.Content>
        </Accordion.Root>
      </Box>
    </Fragment>
  );
}

PaperTrailReview.propTypes = {
  trail: PropTypes.shape({
    change: PropTypes.string,
    content: PropTypes.object,
    contentType: PropTypes.string,
    createdAt: PropTypes.string,
    id: PropTypes.number,
    entityId: PropTypes.string,
    updatedAt: PropTypes.string,
    version: PropTypes.number
  }),
  revisedFields: PropTypes.arrayOf(PropTypes.string)
};

export default PaperTrailReview;
