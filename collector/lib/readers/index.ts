import logger from '../logger';
import { IDay } from '../models';

import { readActivityWatch } from './activitywatch';
import { readGitLab } from './gitlab';
import { readGitHub } from './github';

export type ReaderFn = (days: IDay[]) => Promise<IDay[]>;

export const readify = (readFn: ReaderFn, reader: string): ReaderFn => {
  return async (days: IDay[]): Promise<IDay[]> => {
    logger.info(`Reading data from \x1b[1m${reader}\x1b[0m`);
    return await readFn(days);
  };
};

export default {
  ActivityWatch: readify(readActivityWatch, 'ActivityWatch'),
  GitHub: readify(readGitHub, 'GitHub'),
  GitLab: readify(readGitLab, 'GitLab'),
};
