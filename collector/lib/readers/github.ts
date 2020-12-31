import { IDay } from '../models';
import { ReaderFn } from './index';

export const readGitHub:ReaderFn = async (days:IDay[]):Promise<IDay[]> => {
  const oldestDay = days[0];
  const newestDay = days[days.length - 1];
  if(oldestDay.date == newestDay.date) return days;

  console.log(days)


  return days;
}