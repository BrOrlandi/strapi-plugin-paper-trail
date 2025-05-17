import { Pagination } from '@strapi/design-system';
import PropTypes from 'prop-types';
import React, { useCallback } from 'react';

import getPaginationList from '../../utils/getPaginationList';

function TrailsTablePagination(props) {
  const { page, pageCount, setPage } = props;

  const pageList = getPaginationList(page, pageCount);

  const handleClick = useCallback(
    (event, newPage) => {
      event.preventDefault();
      if (page !== newPage) {
        setPage(newPage);
      }
    },
    [page, setPage]
  );

  return (
    <Pagination.Root activePage={page} pageCount={pageCount}>
      <Pagination.Previous
        href={`#${page - 1}`}
        onClick={event => handleClick(event, page - 1)}
      >
        Go to previous page
      </Pagination.Previous>
      {pageList.map(pageNum => (
        <Pagination.PageLink
          key={pageNum}
          number={pageNum}
          href={`#${pageNum}`}
          onClick={event => handleClick(event, pageNum)}
        >
          Go to page ${pageNum}
        </Pagination.PageLink>
      ))}
      <Pagination.Next
        href={`#${page + 1}`}
        onClick={event => handleClick(event, page + 1)}
      >
        Go to next page
      </Pagination.Next>
    </Pagination.Root>
  );
}

TrailsTablePagination.propTypes = {
  page: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  setPage: PropTypes.func.isRequired
};

export default TrailsTablePagination;
