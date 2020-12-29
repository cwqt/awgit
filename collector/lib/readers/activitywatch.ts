import { IDay } from '../models';
import { ReaderFn } from './index';
import { AWClient } from 'aw-client';

enum AwBucket {
  Code = "aw-watcher-vscode_zephyr.mynet",
  Web = "aw-watcher-web-chrome",
}

export const readActivityWatch: ReaderFn = async (days: IDay[]): Promise<IDay[]> => {
  const client = new AWClient('awgit');

  for(let i=0; i<days.length; i++) {
    let yesterday = days[i-1];
    let currentDay = days[i];
    
    if(!yesterday) continue;
  }


  return days;
};
