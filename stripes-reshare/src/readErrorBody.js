/**
 * Read an error response body by `Content-Type`, returning `{ message, parsedBody }`
 * (`parsedBody` only when JSON). JSON types are parsed with the message taken from
 * `error`/`message`; anything else is read as text; with no header, JSON is
 * tried first then text. Used by `useOkapiKy`'s afterResponse hook.
 */

const isJsonType = (contentType) => /[/+]json\b/i.test(contentType || '');

// Both readers clone() so the original body stays unconsumed — useOkapiKy
// attaches this response to the thrown error for consumers to inspect.
const readJson = async (response) => {
  try {
    return await response.clone().json();
  } catch (_) {
    return undefined;
  }
};

const readText = async (response) => {
  try {
    return await response.clone().text();
  } catch (_) {
    return undefined;
  }
};

const readErrorBody = async (response) => {
  const contentType = response?.headers?.get?.('content-type') ?? '';

  if (contentType && !isJsonType(contentType)) {
    return { message: await readText(response), parsedBody: undefined };
  }

  const parsedBody = await readJson(response);
  let message;
  if (parsedBody !== undefined) message = parsedBody?.error || parsedBody?.message;
  if (!message) message = await readText(response);
  return { message, parsedBody };
};

export default readErrorBody;
