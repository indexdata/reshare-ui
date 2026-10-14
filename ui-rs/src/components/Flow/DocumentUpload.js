import React, { useState } from 'react';
import { useField } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
// Imported by path: the package index loads every data-transfer component
import { FileUploader } from '@folio/stripes-data-transfer-components/lib/FileUploader';
import { Layout } from '@folio/stripes/components';
import { IfInterface, useStripes } from '@folio/stripes/core';
import { useIntlCallout, useOkapiKy } from '@projectreshare/stripes-reshare';

// Uploads to DMS and fills the named form field without submitting.
// onUploadingChange lets the form block submission while uploading.
const Uploader = ({ name, disabled, onUploadingChange }) => {
  const { input } = useField(name, { subscription: { value: true } });
  const okapiKy = useOkapiKy().extend({ timeout: false });
  const sendCallout = useIntlCallout();
  const maxUpload = useStripes().config?.reshare?.maxDMSUpload;
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState();

  const setBusy = busy => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const upload = async file => {
    const formData = new FormData();
    formData.set('file', file);
    setBusy(true);
    try {
      const res = await okapiKy.post('dms/upload', { body: formData });
      const { url } = await res.json();
      setUploaded({ url, fileName: file.name });
      input.onChange(url);
    } catch (e) {
      sendCallout('ui-rs.upload.error', 'error', { errMsg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (accepted, rejected) => {
    if (rejected.length > 0) {
      const tooLarge = rejected.some(r => r.errors.some(err => err.code === 'file-too-large'));
      sendCallout(tooLarge ? 'ui-rs.upload.tooLarge' : 'ui-rs.upload.oneFile', 'error', { max: maxUpload });
    } else if (accepted.length > 0) {
      upload(accepted[0]);
    }
  };

  return (
    <FileUploader
      title={<FormattedMessage id={uploading ? 'ui-rs.upload.uploading' : 'ui-rs.upload.drop'} />}
      uploadButtonText={<FormattedMessage id="ui-rs.upload.button" />}
      onDrop={onDrop}
      multiple={false}
      maxSize={maxUpload ? maxUpload * 1024 * 1024 : undefined}
      disabled={disabled || uploading}
      isDropZoneActive={false}
    >
      {uploaded && uploaded.url === input.value &&
        <div><FormattedMessage id="ui-rs.upload.uploaded" values={{ fileName: uploaded.fileName }} /></div>
      }
      {maxUpload && <div><FormattedMessage id="ui-rs.upload.max" values={{ max: maxUpload }} /></div>}
    </FileUploader>
  );
};

const DocumentUpload = props => (
  <IfInterface name="dms">
    <Layout className="padding-bottom-gutter">
      <Uploader {...props} />
    </Layout>
  </IfInterface>
);

export default DocumentUpload;
