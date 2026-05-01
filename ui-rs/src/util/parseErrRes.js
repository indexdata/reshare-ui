const parseErrRes = async (error, key = 'error') => {
  const status = error?.response?.status;
  let body = '';
  if (error?.response) {
    try {
      const json = await error.response.clone().json();
      body = json?.[key] ?? '';
    } catch (_) {
      try { body = (await error.response.text()) ?? ''; } catch (_e) { /* ignore */ }
    }
  }
  return [status, body || error?.message].filter(Boolean).join(' ');
};

export default parseErrRes;
