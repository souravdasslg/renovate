import { RenovateConfig, getConfig } from '../../../util';

import { flattenUpdates } from '../../../../lib/workers/repository/updates/flatten';
import { LANGUAGE_DOCKER } from '../../../../lib/constants/languages';

let config: RenovateConfig;
beforeEach(() => {
  jest.resetAllMocks();
  config = getConfig();
  config.errors = [];
  config.warnings = [];
});

describe('workers/repository/updates/flatten', () => {
  describe('flattenUpdates()', () => {
    it('flattens', () => {
      config.lockFileMaintenance.enabled = true;
      config.packageRules = [
        {
          updateTypes: ['minor'],
          automerge: true,
        },
        {
          paths: ['frontend/package.json'],
          lockFileMaintenance: {
            enabled: false,
          },
        },
      ];
      const packageFiles = {
        npm: [
          {
            packageFile: 'package.json',
            deps: [
              { depName: '@org/a', updates: [{ newValue: '1.0.0' }] },
              { depName: 'foo', updates: [{ newValue: '2.0.0' }] },
              {
                updateTypes: ['pin'],
                updates: [{ newValue: '2.0.0' }],
              },
            ],
          },
          {
            packageFile: 'backend/package.json',
            deps: [{ depName: 'bar', updates: [{ newValue: '3.0.0' }] }],
          },
          {
            packageFile: 'frontend/package.json',
            deps: [{ depName: 'baz', updates: [{ newValue: '3.0.1' }] }],
          },
        ],
        dockerfile: [
          {
            packageFile: 'Dockerfile',
            deps: [
              {
                depName: 'amd64/node',
                language: LANGUAGE_DOCKER,
                updates: [{ newValue: '10.0.1' }],
              },
            ],
          },
          {
            packageFile: 'Dockerfile',
            deps: [
              {
                depName: 'calico/node',
                language: LANGUAGE_DOCKER,
                updates: [{ newValue: '3.2.0' }],
              },
            ],
          },
        ],
      };
      const res = flattenUpdates(config, packageFiles);
      expect(res).toHaveLength(9);
      expect(
        res.filter(r => r.updateType === 'lockFileMaintenance')
      ).toHaveLength(2);
    });
  });
});
