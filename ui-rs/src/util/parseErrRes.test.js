import parseErrRes from './parseErrRes';

describe('parseErrRes', () => {
  it('formats a response status and JSON error message', async () => {
    const error = {
      response: {
        status: 400,
        clone: () => ({
          json: async () => ({ error: 'Bad request' }),
        }),
      },
    };

    await expect(parseErrRes(error)).resolves.toBe('400 Bad request');
  });

  it('falls back to response text when JSON parsing fails', async () => {
    const error = {
      response: {
        status: 500,
        clone: () => ({
          json: async () => { throw new Error('Invalid JSON'); },
        }),
        text: async () => 'Server error',
      },
    };

    await expect(parseErrRes(error)).resolves.toBe('500 Server error');
  });
});
