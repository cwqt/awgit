import { IDay, IDayStats } from '../models';
import { ReaderFn } from './index';
import { AWClient } from 'aw-client';
import { URL } from 'url';
import logger from '../logger';
import PRIVATE from '../index';

// needs to be called as PRIVATE not parsed yet when imported
const getMaps = () => {
  const WindowGenreMap: { [index in keyof IDayStats]: string[] } = {
    nonproductive: ['Discord', 'Spotify', 'steam_osx', 'News'],
    productive: [
      'kitty',
      'Electron', // VSCode
      'Sublime Text',
      'Calendar',
      'Notes',
      'Xcode',
      'zoom.us',
      'iTerm2',
      'Postman',
      'TablePlus',
      'Terminal',
      'Activity Monitor',
    ],
    language: ['Anki'],
    communications: ['WhatsApp', 'Telegram'],
    other: [],
  };
  
  const WebsiteGenreMap: { [index in keyof IDayStats]: string[] } = {
    nonproductive: [
      'youtube.com',
      'amazon.com',
      'boards.4chan.org',
      'boards.4channel.org',
      'facebook.com',
      'twitter.com',
      'reddit.com',
      'medium.com',
      ...PRIVATE.websites.nonproductive
    ],
    productive: [
      'us02web.zoom.us',
      'en.wikipedia.org',
      'github.com',
      'gitlab.com',
      'npmjs.com',
      'wikipedia.org',
      'atlassian.net',
      'notion.so',
      'vercel.com',
      'netlify.com',
      'aws.amazon.com',
      'localhost',
      'stackoverflow.com',
      'console.firebase.google.com',
      'linkedin.com',
      'ibm.com',
      'helm.sh',
      'cass.si',
      'forestry.io',
      'angular.io',
      ...PRIVATE.websites.productive
    ],
    language: [
      'duolingo.com',
      'forum.duolingo.com',
      'duome.eu',
      'translate.google.com',
      'ordbok.uib.no',
    ],
    communications: ['messenger.com', 'discord.com', 'gmail.com', 'mail.google.com'],
    other: [],
  };
  
  const StatKeyMap = Object.keys(WindowGenreMap);
  
  return { WindowGenreMap, WebsiteGenreMap, StatKeyMap };
}

export const readActivityWatch: ReaderFn = async (days: IDay[]): Promise<IDay[]> => {
  const client = new AWClient('awgit');
  const { WindowGenreMap, WebsiteGenreMap, StatKeyMap } = getMaps();

  for (let i = 0; i < days.length; i++) {
    let yesterday = days[i - 1];
    let today = days[i];
    if (!yesterday) continue;

    // WINDOW EVENTS =========================================================================================================
    // Get all window times from aw-watcher-window
    const windowEvents: any[] = (
      await client.query(
        [{ start: yesterday.date, end: today.date }],
        [
          `afk_events = query_bucket(find_bucket("aw-watcher-afk_"));`,
          `window_events = query_bucket(find_bucket("aw-watcher-window_"));`,
          `window_events = filter_period_intersect(window_events, filter_keyvals(afk_events, "status", ["not-afk"]));`,
          `merged_events = merge_events_by_keys(window_events, ["app", "title"]);`,
          `RETURN = sort_by_duration(merged_events);`,
        ]
      )
    ).flat();
    logger.info(`\tCollecting Window Events (${windowEvents.length})`);

    let untrackedWindowEvents: any[] = [];
    windowEvents.forEach((e: any, idx) => {
      try {
        let hitByFilter = false;
        for (let i = 0; i < StatKeyMap.length; i++) {
          let titles = (<any>WindowGenreMap)[StatKeyMap[i]];
          // check substrings
          if (titles.some((t: string) => t.includes(e.data.app))) {
            (<any>today).stats[StatKeyMap[i]] += e.duration;
            hitByFilter = true;
            break;
          }
        }

        if (!hitByFilter) untrackedWindowEvents.push(e);
      } catch (error) {
        logger.error(error.message + JSON.stringify(e));
      }
    });

    today.stats.other += untrackedWindowEvents
      .filter((e) => e.data.app != 'Google Chrome') // track browser use later
      .reduce((acc, curr) => (acc += curr.duration), 0);

    // WEB EVENTS =========================================================================================================
    // Get languages/other time from querying aw-watcher-web-chrome bucket
    // totalWebTime contains total time across all websites
    let untrackedWebEvents: any[] = [];
    const webEvents: any[] = (
      await client.query(
        [{ start: yesterday.date, end: today.date }],
        [
          `afk_events = query_bucket(find_bucket("aw-watcher-afk_"));`,
          `web_events = query_bucket("aw-watcher-web-chrome");`,
          `web_events = filter_period_intersect(web_events, filter_keyvals(afk_events, "status", ["not-afk"]));`,
          `merged_events = merge_events_by_keys(web_events, ["url"]);`,
          `RETURN = sort_by_duration(merged_events);`,
        ]
      )
    ).flat();
    logger.info(`Collecting Chrome Event (${webEvents.length})`);

    webEvents.forEach((e: any, idx) => {
      try {
        const hostname = new URL(e.data.url).hostname.replace('www.', '').trim();

        let hitByFilter = false;
        for (let i = 0; i < StatKeyMap.length; i++) {
          let titles = (<any>WebsiteGenreMap)[StatKeyMap[i]];
          // check substrings
          if (titles.some((t: string) => t.includes(hostname))) {
            (<any>today).stats[StatKeyMap[i]] += e.duration;
            hitByFilter = true;
            break;
          }
        }

        if (!hitByFilter) untrackedWebEvents.push(e);
      } catch (error) {
        logger.error(error.message + JSON.stringify(e));
      }
    });

    today.stats.other += untrackedWebEvents
      .filter((e) => e.data.url != 'chrome://newtab/')
      .reduce((acc, curr) => (acc += curr.duration), 0);
  }

  // Round numbers
  days.forEach((d) => {
    Object.keys(d.stats).forEach(
      (s) => ((<any>d).stats[s] = parseFloat(((<any>d).stats[s] / 3600).toFixed(2)))
    );
  });

  return days;
};
