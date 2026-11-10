// Keep search and editor labels identical, including fallback names.
const fieldLabel = (intl, fieldLabelId, path) => intl.formatMessage({
  id: fieldLabelId(path),
  defaultMessage: path.split('.').pop(),
});

export default fieldLabel;
