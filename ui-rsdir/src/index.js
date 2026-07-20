import DirectoryRoute from './routes/DirectoryRoute';

const RSDir = (props) => {
  const {
    actAs,
  } = props;

  if (actAs === 'settings') {
    // TODO settings?
  }
  return <DirectoryRoute {...props} />;
};

export default RSDir;
