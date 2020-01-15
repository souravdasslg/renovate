import { readFileSync } from 'fs';
import { extractPackageFile } from '../../../lib/manager/circleci/extract';

const file1 = readFileSync(
  'test/manager/circleci/_fixtures/config.yml',
  'utf8'
);
const file2 = readFileSync(
  'test/manager/circleci/_fixtures/config2.yml',
  'utf8'
);

describe('lib/manager/circleci/extract', () => {
  describe('extractPackageFile()', () => {
    it('returns null for empty', () => {
      expect(extractPackageFile({ fileContent: 'nothing here' })).toBeNull();
    });
    it('extracts multiple image lines', () => {
      const res = extractPackageFile({ fileContent: file1 });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(4);
    });
    it('extracts orbs too', () => {
      const res = extractPackageFile({ fileContent: file2 });
      expect(res.deps).toMatchSnapshot();
      // expect(res.deps).toHaveLength(4);
    });
  });
});
