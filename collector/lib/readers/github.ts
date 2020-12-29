import { IDay } from '../models';
import { ReaderFn } from './index';

export const readGitHub:ReaderFn = async (days:IDay[]):Promise<IDay[]> => {

  return days;
}