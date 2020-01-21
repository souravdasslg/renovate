import * as validate from '../../../../lib/workers/repository/finalise/validate';
import { platform } from '../../../util';
import { PR_STATUS_OPEN } from '../../../../lib/constants/pull-requests';
import {
  BRANCH_STATUS_FAILURE,
  BRANCH_STATUS_SUCCESS,
} from '../../../../lib/constants/branch-constants';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('workers/repository/validate', () => {
  describe('validatePrs()', () => {
    it('returns if disabled', async () => {
      await validate.validatePrs({ suppressNotifications: ['prValidation'] });
    });
    it('catches error', async () => {
      platform.getPrList.mockResolvedValueOnce([
        {
          state: PR_STATUS_OPEN,
          branchName: 'some/branch',
          title: 'Update Renovate',
        },
      ]);
      await validate.validatePrs({});
      expect(platform.setBranchStatus).toHaveBeenCalledTimes(0);
      expect(platform.ensureComment).toHaveBeenCalledTimes(0);
      expect(platform.ensureCommentRemoval).toHaveBeenCalledTimes(0);
    });
    it('returns if no matching files', async () => {
      platform.getPrList.mockResolvedValueOnce([
        {
          state: PR_STATUS_OPEN,
          branchName: 'some/branch',
          title: 'Update Renovate',
        },
      ]);
      platform.getPrFiles.mockResolvedValueOnce(['readme.md']);
      await validate.validatePrs({});
      expect(platform.setBranchStatus).toHaveBeenCalledTimes(0);
      expect(platform.ensureComment).toHaveBeenCalledTimes(0);
      expect(platform.ensureCommentRemoval).toHaveBeenCalledTimes(0);
    });
    it('validates failures if cannot parse', async () => {
      platform.getPrList.mockResolvedValueOnce([
        {
          state: PR_STATUS_OPEN,
          branchName: 'some/branch',
          title: 'Update Renovate',
        },
      ]);
      platform.getPrFiles.mockResolvedValueOnce(['renovate.json']);
      platform.getFile.mockResolvedValue('not JSON');
      await validate.validatePrs({});
      expect(platform.setBranchStatus).toHaveBeenCalledTimes(1);
      expect(platform.setBranchStatus.mock.calls[0][0].state).toEqual(
        BRANCH_STATUS_FAILURE
      );
      expect(platform.ensureComment).toHaveBeenCalledTimes(1);
      expect(platform.ensureCommentRemoval).toHaveBeenCalledTimes(0);
    });
    it('validates failures if config validation fails', async () => {
      platform.getPrList.mockResolvedValueOnce([
        {
          state: PR_STATUS_OPEN,
          branchName: 'some/branch',
          title: 'Update Renovate',
        },
      ]);
      platform.getPrFiles.mockResolvedValueOnce(['renovate.json']);
      platform.getFile.mockResolvedValue('{"foo":1}');
      await validate.validatePrs({});
      expect(platform.setBranchStatus).toHaveBeenCalledTimes(1);
      expect(platform.setBranchStatus.mock.calls[0][0].state).toEqual(
        BRANCH_STATUS_FAILURE
      );
      expect(platform.ensureComment).toHaveBeenCalledTimes(1);
      expect(platform.ensureCommentRemoval).toHaveBeenCalledTimes(0);
    });
    it('validates successfully', async () => {
      platform.getPrList.mockResolvedValueOnce([
        {
          state: PR_STATUS_OPEN,
          branchName: 'some/branch',
          title: 'Update Renovate',
        },
      ]);
      platform.getPrFiles.mockResolvedValueOnce(['renovate.json']);
      platform.getFile.mockResolvedValue('{}');
      await validate.validatePrs({});
      expect(platform.setBranchStatus).toHaveBeenCalledTimes(1);
      expect(platform.setBranchStatus.mock.calls[0][0].state).toEqual(
        BRANCH_STATUS_SUCCESS
      );
      expect(platform.ensureComment).toHaveBeenCalledTimes(0);
      expect(platform.ensureCommentRemoval).toHaveBeenCalledTimes(1);
    });
  });
});
