import { getName } from '../../../test/util';
import { extractPackageFile } from './extract';

describe(getName(), () => {
  describe('extractPackageFile()', () => {
    it('returns a result', () => {
      const res = extractPackageFile('12.0.0\n');
      // FIXME: explicit assert condition
      expect(res.deps).toMatchSnapshot();
    });
  });
});
