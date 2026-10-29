import { previewError } from './templatePreview';

describe('previewError', () => {
  const rejection = (error, template) => Object.assign(new Error(error), { status: 400, parsedBody: { error, template } });

  it('takes the location and message from the template object', () => {
    const failure = rejection('sample long: template body: template: template:4:3: index out of range', {
      part: 'body', sample: 'long', line: 4, column: 3, message: 'index out of range',
    });
    expect(previewError(failure, '<p>')).toEqual({
      rejected: true, body: '<p>', part: 'body', sample: 'long', line: 4, column: 3, message: 'index out of range',
    });
  });

  it('reports a rejection without a template object by its message', () => {
    expect(previewError(rejection('invalid template purpose "x"'), '<p>')).toEqual({
      rejected: true, body: '<p>', message: 'invalid template purpose "x"',
    });
  });

  it('passes on any other failure as it is', () => {
    const failure = Object.assign(new Error('Request failed with status code 500'), { status: 500 });
    expect(previewError(failure, '<p>')).toEqual({ rejected: false, message: 'Request failed with status code 500' });
  });
});
