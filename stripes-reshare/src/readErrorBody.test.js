import readErrorBody from './readErrorBody';

// Real Response.clone() yields a fully body-readable response; both readers go
// through clone() so the original stays inspectable.
const makeResponse = ({ contentType, json, text }) => ({
  headers: { get: () => contentType },
  clone: () => ({ json, text }),
});

describe('readErrorBody', () => {
  it('reads the message from a JSON `error` body', async () => {
    const text = jest.fn();
    const response = makeResponse({
      contentType: 'application/json',
      json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      text,
    });

    await expect(readErrorBody(response)).resolves.toEqual({
      message: 'Bad request',
      parsedBody: { error: 'Bad request' },
    });
    expect(text).not.toHaveBeenCalled();
  });

  it('reads the message from a JSON `message` body when `error` is absent', async () => {
    const response = makeResponse({
      contentType: 'application/json',
      json: jest.fn().mockResolvedValue({ message: 'Backend message' }),
      text: jest.fn(),
    });

    await expect(readErrorBody(response)).resolves.toMatchObject({ message: 'Backend message' });
  });

  it('parses a +json media type', async () => {
    const response = makeResponse({
      contentType: 'application/problem+json',
      json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      text: jest.fn(),
    });

    await expect(readErrorBody(response)).resolves.toMatchObject({ message: 'Bad request' });
  });

  it('reads text and skips json() when Content-Type is not JSON', async () => {
    const json = jest.fn();
    const response = makeResponse({
      contentType: 'text/html; charset=utf-8',
      json,
      text: jest.fn().mockResolvedValue('<html>Bad gateway</html>'),
    });

    await expect(readErrorBody(response)).resolves.toEqual({
      message: '<html>Bad gateway</html>',
      parsedBody: undefined,
    });
    expect(json).not.toHaveBeenCalled();
  });

  it('reads only clones, leaving the original response body intact', async () => {
    // useOkapiKy attaches this response to the thrown error, so the original
    // body must stay unconsumed for consumers to inspect.
    const originalJson = jest.fn();
    const originalText = jest.fn();
    const response = {
      headers: { get: () => 'text/plain' },
      clone: () => ({ json: jest.fn(), text: jest.fn().mockResolvedValue('boom') }),
      json: originalJson,
      text: originalText,
    };

    await readErrorBody(response);

    expect(originalJson).not.toHaveBeenCalled();
    expect(originalText).not.toHaveBeenCalled();
  });

  it('falls back to text when no Content-Type header and JSON fails to parse', async () => {
    const response = makeResponse({
      contentType: undefined,
      json: jest.fn().mockRejectedValue(new Error('not json')),
      text: jest.fn().mockResolvedValue('Plain text failure'),
    });

    await expect(readErrorBody(response)).resolves.toMatchObject({ message: 'Plain text failure' });
  });
});
