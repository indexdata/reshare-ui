import { FormattedMessage } from 'react-intl';
import ky from 'ky';
import { useInfiniteQuery } from 'react-query';
import { useEffect, useState } from 'react';

import { Button, IconButton, Layout, LoadingPane, MessageBanner, Modal, MultiColumnList, Pane, PaneMenu, Paneset } from '@folio/stripes/components';
import { useIntlCallout } from '@projectreshare/stripes-reshare';

import SearchAndFilter from './components/SearchAndFilter';
import css from './index.css';

const PER_PAGE = 60;
const FIELDS = ['id', 'title', 'authors', 'edition', 'formats', 'physicalDescriptions'];

const searchParams = (search, page) => new URLSearchParams([
  ...Object.entries(search),
  ...FIELDS.map(f => ['field[]', f]),
  ['page', page],
  ['limit', PER_PAGE],
]);

// Picks a record from a VuFind index and hands its id to selectInstance
const PluginRsSIQueryVufind = ({ disabled, endpoint, selectInstance, searchButtonStyle, searchLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(null);

  const query = useInfiniteQuery({
    queryKey: ['vufindLookup', endpoint, search],
    // VuFind pages are 1-based and treat page 0 as page 1.
    queryFn: ({ pageParam = 1 }) => ky(`${endpoint}/api/v1/search`, { searchParams: searchParams(search, pageParam) }).json(),
    getNextPageParam: (_lastPage, pages) => pages.length + 1,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: !!search,
  });
  const results = query.data?.pages?.flatMap(x => x?.records ?? []);
  const totalCount = query.data?.pages?.[0]?.resultCount;
  const sendCallout = useIntlCallout();

  // A failed later page keeps the loaded results on screen, so it is reported as a
  // callout. Keyed on errorUpdatedAt so a repeat failure reports again.
  useEffect(() => {
    if (query.isRefetchError) {
      sendCallout('ui-plugin-rs-siquery-vufind.refreshError', 'error', { errMsg: query.error?.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isRefetchError, query.errorUpdatedAt]);

  const onSelect = record => {
    selectInstance(record.id);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        buttonStyle={searchButtonStyle}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        {searchLabel}
      </Button>
      <Modal
        label={<FormattedMessage id="ui-plugin-rs-siquery-vufind.modal.title" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        closeOnBackgroundClick
        dismissible
        contentClass={css.pluginModalContent}
        style={{ width: '80vw', maxWidth: '80vw', height: '80vh' }}
      >
        <Paneset isRoot>
          <Pane
            defaultWidth="20%"
            paneTitle={<FormattedMessage id="stripes-smart-components.searchAndFilter" />}
          >
            <SearchAndFilter setSearchParams={setSearch} />
          </Pane>
          {query.isLoadingError &&
            <Pane
              defaultWidth="fill"
              firstMenu={(
                // A retry with no data loaded counts as a fresh load, so LoadingPane takes over.
                <PaneMenu>
                  <IconButton icon="refresh" onClick={() => query.refetch()} />
                </PaneMenu>
              )}
              paneTitle={<FormattedMessage id="ui-plugin-rs-siquery-vufind.resultsHeader" />}
            >
              <Layout className="padding-all-gutter">
                <MessageBanner type="error">
                  <FormattedMessage id="ui-plugin-rs-siquery-vufind.queryError" values={{ errMsg: query.error?.message }} />
                </MessageBanner>
              </Layout>
            </Pane>
          }
          {query.data &&
            <Pane
              defaultWidth="fill"
              noOverflow
              padContent={false}
              paneTitle={<FormattedMessage id="ui-plugin-rs-siquery-vufind.resultsHeader" />}
              paneSub={<FormattedMessage id="ui-rs.patronrequests.found" values={{ number: totalCount }} />}
            >
              <MultiColumnList
                autosize
                columnMapping={{
                  title: <FormattedMessage id="ui-plugin-rs-siquery-vufind.columns.title" />,
                  authors: <FormattedMessage id="ui-plugin-rs-siquery-vufind.columns.contributors" />,
                  edition: <FormattedMessage id="ui-plugin-rs-siquery-vufind.columns.edition" />,
                  formats: <FormattedMessage id="ui-plugin-rs-siquery-vufind.columns.formats" />,
                  physicalDescriptions: <FormattedMessage id="ui-plugin-rs-siquery-vufind.columns.description" />,
                }}
                contentData={results}
                formatter={{
                  authors: v => (typeof v?.authors?.primary === 'object' ? Object.keys(v.authors.primary).join('; ') : ''),
                  formats: rec => rec.formats?.join(', '),
                  physicalDescriptions: rec => rec.physicalDescriptions?.join(', '),
                }}
                hasMargin
                loading={query.isFetching}
                // MCL asks again while a page is loading; by default that cancels the
                // fetch and requests the same page again.
                onNeedMoreData={() => query.fetchNextPage({ cancelRefetch: false })}
                onRowClick={(_e, row) => onSelect(row)}
                pageAmount={PER_PAGE}
                totalCount={totalCount}
                virtualize
                visibleColumns={['title', 'authors', 'edition', 'formats', 'physicalDescriptions']}
              />
            </Pane>
          }
          {query.isLoading &&
            <LoadingPane />
          }
        </Paneset>
      </Modal>
    </>
  );
};

export default PluginRsSIQueryVufind;
