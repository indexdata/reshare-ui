// Preserve scans across app switches, including results arriving after unmount.
import { useSyncExternalStore } from 'react';
import scanActions from './scanActions';
import STATUS from './scanStatus';

const initialState = {
  action: scanActions[0].action,
  // Scan ids, newest first; scanData holds each one's barcode, action, status, request and error.
  scans: [],
  scanData: {},
  selected: null,
  // The id of the scan waiting for an item barcode.
  prompt: null,
};

let state = initialState;
const listeners = new Set();

const set = (update) => {
  state = { ...state, ...update(state) };
  listeners.forEach(l => l());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getScanState = () => state;
export const useScanState = () => useSyncExternalStore(subscribe, getScanState);

// An error whose message is a translation id, since the store has no intl.
export const scanError = (messageId) => Object.assign(new Error(messageId), { messageId });

let lastId = 0;

export const addScan = (barcode) => {
  const id = ++lastId;
  set(s => ({
    scans: [id, ...s.scans],
    scanData: { ...s.scanData, [id]: { barcode, action: s.action, status: STATUS.PENDING } },
    selected: id,
  }));
  return id;
};

// A scan cleared by an action change or reset may still be running; drop what it reports.
export const updateScan = (id, patch) => set(s => (
  s.scans.includes(id)
    ? { scanData: { ...s.scanData, [id]: { ...s.scanData[id], ...patch } } }
    : {}
));

export const selectScan = (id) => set(() => ({ selected: id }));

let pending = null;

const settlePrompt = (settle) => {
  if (!pending) return;
  const { resolve, reject } = pending;
  pending = null;
  set(() => ({ prompt: null }));
  settle(resolve, reject);
};

export const answerPrompt = (barcode) => settlePrompt(resolve => resolve(barcode));
export const dismissPrompt = () => settlePrompt((_, reject) => reject(scanError('ui-update.error.dismissed')));

export const requestItemBarcode = (id) => {
  dismissPrompt();
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    set(() => ({ prompt: id }));
  });
};

export const setAction = (action) => {
  dismissPrompt();
  set(() => ({ action, scans: [], scanData: {}, selected: null }));
};

export const reset = () => {
  dismissPrompt();
  set(() => initialState);
};
