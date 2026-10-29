import React, { useEffect, useState } from 'react';

// Chromium's navpanes parameter controls the initial thumbnail sidebar visibility.
const PdfFrame = ({ pdf, title, thumbnails = true }) => {
  const [url, setUrl] = useState();

  useEffect(() => {
    setUrl(undefined);
    if (!pdf) return undefined;
    const next = URL.createObjectURL(pdf);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [pdf]);

  if (!url) return null;
  return <iframe src={thumbnails ? url : `${url}#navpanes=0`} width="100%" height="100%" title={title} />;
};

export default PdfFrame;
