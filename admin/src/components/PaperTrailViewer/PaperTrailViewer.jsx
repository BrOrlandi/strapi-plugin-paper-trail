import {
  Button,
  Dialog,
  Flex,
  Modal,
  Typography
} from '@strapi/design-system';
// Icons removed for V5 compatibility
import { useContentManagerContext, useFetchClient } from '../../utils/hooks';
import PropTypes from 'prop-types';
import React, { Fragment, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import prepareTrailFromSchema from '../../utils/prepareTrailFromSchema';
import buildPayload from '../../utils/buildPayload';
import getTrad from '../../utils/getTrad';
import PaperTrailRestoreView from '../PaperTrailRestoreView/PaperTrailRestoreView';
import PaperTrailReview from '../PaperTrailReview/PaperTrailReview';
import TrailTable from '../TrailTable/TrailTable';

function PaperTrailViewer(props) {
  const {
    visible,
    setVisible,
    trails,
    setError,
    error,
    page,
    pageSize,
    total,
    pageCount,
    setPage,
    collectionType
  } = props;
  const [viewRevision, setViewRevision] = useState(null);
  const [revisedFields, setRevisedFields] = useState([]);
  const [showReviewStep, setShowReviewStep] = useState(false);

  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setVisible(!visible);
    setViewRevision(null);
    setRevisedFields([]);
    setShowReviewStep(false);
  }, [visible, setVisible]);

  const handleSetViewRevision = useCallback(viewRevisionState => {
    setRevisedFields([]);
    setViewRevision(viewRevisionState);
    setShowReviewStep(false);
  }, []);

  const handleSetRevisedFields = useCallback(
    (name, checked) => {
      /**
       * if checked, add the name to the array otherwise splice
       */

      if (checked && !revisedFields.includes(name)) {
        setRevisedFields([...revisedFields, name]);
      }

      if (!checked && revisedFields.includes(name)) {
        const index = revisedFields.indexOf(name);
        let newArr = [...revisedFields];
        newArr.splice(index, 1);

        setRevisedFields(newArr);
      }
    },
    [revisedFields]
  );

  const handleSetShowReviewStep = useCallback(bool => {
    setShowReviewStep(bool);
    if (!bool) {
      setRevisedFields([]);
    }
  }, []);

  /**
   * Submission handler for restoring
   */

  const { get, put } = useFetchClient();
  const { model } = useContentManagerContext();

  const handleRestoreSubmission = useCallback(async () => {
    /**
     * Gather the final payload
     */

    // TODO: Warning about changing content type/UID dropping trails from the admin panel / killing relationship

    const { entityId, content, contentType } = viewRevision;

    const { trail: trimmedContent } = prepareTrailFromSchema(content, model);

    const payload = buildPayload(trimmedContent, revisedFields);

    try {
      const requestUri =
        collectionType === 'single-types'
          ? `/content-manager/${collectionType}/${contentType}`
          : `/content-manager/${collectionType}/${contentType}/${entityId}`;

      await put(requestUri, payload);

      // Use React Router navigation instead of page reload
      handleClose();
      navigate(window.location.pathname, { replace: true });
    } catch (Err) {
      setError(Err);
      // Paper trail error
    }
  }, [model, viewRevision, revisedFields, put, setError, collectionType, handleClose, navigate]);

  return (
    <Fragment>
      {visible && (
        <Modal.Root onClose={() => handleClose()} labelledBy="title">
          <Modal.Header>
            <Typography
              fontWeight="bold"
              textColor="neutral800"
              as="h2"
              id="title"
            >
              {formatMessage({
                id: getTrad('plugin.admin.paperTrail.revisionHistory'),
                defaultMessage: 'Revision History'
              })}
            </Typography>
          </Modal.Header>
          <Modal.Content>
            {!viewRevision && (
              <TrailTable
                trails={trails}
                setViewRevision={handleSetViewRevision}
                page={page}
                pageSize={pageSize}
                total={total}
                pageCount={pageCount}
                setPage={setPage}
              />
            )}
            {viewRevision && !showReviewStep && (
              <PaperTrailRestoreView
                trail={viewRevision}
                setViewRevision={handleSetViewRevision}
                setRevisedFields={handleSetRevisedFields}
              />
            )}
            {viewRevision && showReviewStep && (
              <PaperTrailReview
                trail={viewRevision}
                setShowReviewStep={handleSetShowReviewStep}
                revisedFields={revisedFields}
              />
            )}
            {/* error alert */}
            {error && (
              <Dialog.Root
                onClose={() => setError(null)}
                title={formatMessage({
                  id: getTrad('plugin.admin.paperTrail.error'),
                  defaultMessage: 'Error'
                })}
                isOpen={Boolean(error)}
              >
                <Dialog.Content>
                  <Flex direction="column" alignItems="center" gap={2}>
                    <Flex justifyContent="center">
                      <Typography>{String(error)}</Typography>
                    </Flex>
                  </Flex>
                </Dialog.Content>
                <Dialog.Footer
                  startAction={
                    <Button onClick={() => setError(null)} variant="tertiary">
                      {formatMessage({
                        id: getTrad('plugin.admin.paperTrail.close'),
                        defaultMessage: 'Close'
                      })}
                    </Button>
                  }
                />
              </Dialog.Root>
            )}
          </Modal.Content>
          <Modal.Footer
            startActions={
              <Button onClick={() => handleClose()} variant="tertiary">
                {formatMessage({
                  id: getTrad('plugin.admin.paperTrail.close'),
                  defaultMessage: 'Close'
                })}
              </Button>
            }
            endActions={
              <Fragment>
                {!showReviewStep &&
                  revisedFields &&
                  revisedFields.length > 0 && (
                    <Button
                      variant="success-light"
                      onClick={() => handleSetShowReviewStep(true)}
                    >
                      {formatMessage({
                        id: getTrad('plugin.admin.paperTrail.review'),
                        defaultMessage: 'Review'
                      })}
                    </Button>
                  )}
                {showReviewStep &&
                  revisedFields &&
                  revisedFields.length > 0 && (
                    <Button
                      variant="danger-light"
                      onClick={() => handleRestoreSubmission()}
                    >
                      {formatMessage({
                        id: getTrad('plugin.admin.paperTrail.restore'),
                        defaultMessage: 'Restore'
                      })}
                    </Button>
                  )}
              </Fragment>
            }
          />
        </Modal.Root>
      )}
    </Fragment>
  );
}

PaperTrailViewer.propTypes = {
  visible: PropTypes.bool,
  setVisible: PropTypes.func.isRequired,
  error: PropTypes.any,
  setError: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  setPage: PropTypes.func.isRequired,
  trails: PropTypes.arrayOf(
    PropTypes.shape({
      change: PropTypes.string,
      content: PropTypes.object,
      contentType: PropTypes.string,
      createdAt: PropTypes.string,
      id: PropTypes.number,
      entityId: PropTypes.string,
      updatedAt: PropTypes.string,
      version: PropTypes.number
    })
  )
};

export default PaperTrailViewer;
