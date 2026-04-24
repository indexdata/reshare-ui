import React, { useCallback, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';

const PARAM = 'aside';

const useRequestAside = (slots) => {
  const history = useHistory();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  const openSlot = (() => {
    const slot = queryString.parse(location.search)[PARAM];
    return slot && slots[slot] ? slot : undefined;
  })();

  const setSlot = useCallback((next) => {
    const { search, pathname, hash, state } = locationRef.current;
    const nextQuery = { ...queryString.parse(search) };
    if (next) nextQuery[PARAM] = next;
    else delete nextQuery[PARAM];
    history.replace({
      pathname,
      search: queryString.stringify(nextQuery),
      hash,
      state,
    });
  }, [history]);

  const toggle = useCallback((slot) => {
    setSlot(slot === queryString.parse(locationRef.current.search)[PARAM] ? undefined : slot);
  }, [setSlot]);

  const isOpen = useCallback((slot) => (
    queryString.parse(locationRef.current.search)[PARAM] === slot
  ), []);

  const AsidePane = useCallback((props) => {
    const slot = queryString.parse(locationRef.current.search)[PARAM];
    if (!slot) return null;
    const Component = slots[slot];
    if (!Component) return null;
    return <Component onToggle={() => setSlot(undefined)} {...props} />;
  }, [slots, setSlot]);

  return { AsidePane, toggle, isOpen, openSlot };
};

export default useRequestAside;
