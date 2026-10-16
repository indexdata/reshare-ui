let nextSymbolKey = 0;

export const normalizeAuthority = value => (value || '').trim().toLowerCase();

const withEditorMetadata = (symbol, originalAuthority) => ({
  ...symbol,
  _editor: {
    // Persisted rows must keep their React identity when server data refreshes.
    key: symbol.id ? `stored-symbol:${symbol.id}` : `new-symbol:${nextSymbolKey++}`,
    originalAuthority,
  },
});

export const apiSymbolsToFormSymbols = symbols => symbols?.map(symbol => (
  withEditorMetadata(symbol, normalizeAuthority(symbol.authority))
));

export const createFormSymbol = () => withEditorMetadata({ authority: '', symbol: '' }, null);

export const formSymbolsToApiSymbols = symbols => symbols?.map(row => {
  const symbol = { ...row };

  delete symbol._editor;
  return symbol;
});
