import { IDay } from '../models';
import { ReaderFn } from './index';

export const readGitLab:ReaderFn = async (days:IDay[]):Promise<IDay[]> => {

  return days;
}