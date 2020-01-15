import { readFileSync } from 'fs';
import { extractPackageFile } from '../../../lib/manager/cargo/extract';

const cargo1toml = readFileSync(
  'test/manager/cargo/_fixtures/Cargo.1.toml',
  'utf8'
);
const cargo2toml = readFileSync(
  'test/manager/cargo/_fixtures/Cargo.2.toml',
  'utf8'
);
const cargo3toml = readFileSync(
  'test/manager/cargo/_fixtures/Cargo.3.toml',
  'utf8'
);
const cargo4toml = readFileSync(
  'test/manager/cargo/_fixtures/Cargo.4.toml',
  'utf8'
);
const cargo5toml = readFileSync(
  'test/manager/cargo/_fixtures/Cargo.5.toml',
  'utf8'
);

describe('lib/manager/cargo/extract', () => {
  describe('extractPackageFile()', () => {
    let config;
    beforeEach(() => {
      config = {};
    });
    it('returns null for invalid toml', () => {
      expect(
        extractPackageFile({ fileContent: 'invalid toml', config })
      ).toBeNull();
    });
    it('returns null for empty', () => {
      const cargotoml = '[dependencies]\n';
      expect(extractPackageFile({ fileContent: cargotoml, config })).toBeNull();
    });
    it('returns null for empty', () => {
      const cargotoml = '[dev-dependencies]\n';
      expect(extractPackageFile({ fileContent: cargotoml, config })).toBeNull();
    });
    it('returns null for empty', () => {
      const cargotoml = '[target."foo".dependencies]\n';
      expect(extractPackageFile({ fileContent: cargotoml, config })).toBeNull();
    });
    it('extracts multiple dependencies', () => {
      const res = extractPackageFile({ fileContent: cargo1toml, config });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(15);
    });
    it('extracts multiple dependencies', () => {
      const res = extractPackageFile({ fileContent: cargo2toml, config });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(18 + 6 + 1);
    });
    it('handles inline tables', () => {
      const res = extractPackageFile({ fileContent: cargo3toml, config });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(8);
    });
    it('handles standard tables', () => {
      const res = extractPackageFile({ fileContent: cargo4toml, config });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(6);
    });
    it('extracts platform specific dependencies', () => {
      const res = extractPackageFile({ fileContent: cargo5toml, config });
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(4);
    });
  });
});
