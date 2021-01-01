import Axios from 'axios';
import PRIVATE from '../index';
import { addDay, timeless } from '../helpers';
import { ICommit, IDay } from '../models';
import { ReaderFn } from './index';
import logger from '../logger';

const pgp = require('pgp-utils');

const avoidRatelimit = async () => {
  await new Promise((resolve) => setTimeout(resolve, 150));
};

const getSignedCommitKid = async (repoSlug: string, commitRef: string): Promise<string | null> => {
  await avoidRatelimit();
  const res = await Axios.get(`https://api.github.com/repos/${repoSlug}/commits/${commitRef}`, {
    auth: {
      username: process.env.GITHUB_USERNAME,
      password: process.env.GITHUB_API_KEY,
    },
  });

  const sig = res.data?.commit.verification?.signature;
  if (!sig) return;

  const key = pgp.armor.decode(sig)[1].body;
  const short = pgp.util.format_fingerprint(key).substring(0, 79).split(' ').slice(-4).join('');
  return short;
};

export const readGitHub: ReaderFn = async (days: IDay[]): Promise<IDay[]> => {
  //Instead of calling the GitHub API for every day in days, call between the first & last day in the array
  // to avoid getting ratelimited
  const oldestDay = days[0];
  const newestDay = days[days.length - 1];
  if (oldestDay.date == newestDay.date) return days;

  // GitHub has no mechanism for getting dates within a period, so we'll just paging backwards
  // until we've got something with a date before the oldestDay.date (-1 day just to be sure)
  let githubEvents: any[] = [];
  let gotDateBeforeOldestDay = false;
  let i = 0;
  while (!gotDateBeforeOldestDay) {
    const res = await Axios.get(
      `https://api.github.com/users/${process.env.GITHUB_USERNAME}/events?page=${i}&per_page=20`,
      {
        auth: {
          username: process.env.GITHUB_USERNAME,
          password: process.env.GITHUB_API_KEY,
        },
      }
    );

    githubEvents = githubEvents.concat(res.data);
    gotDateBeforeOldestDay = res.data.some((d: any) => new Date(d.created_at) < addDay(oldestDay.date, -1));
    await avoidRatelimit();
    i++; // get next page
  }

  logger.info(`Got ${githubEvents.length} events`);

  githubEvents = githubEvents.filter((e: any) => e.type == 'PushEvent');
  const dateMappedEvents: Map<string, any[]> = githubEvents.reduce((acc, curr) => {
    const eventDate = timeless(new Date(curr.created_at)).toISOString();
    acc.has(eventDate) ? acc.set(eventDate, [...acc.get(eventDate), curr]) : acc.set(eventDate, []);
    return acc;
  }, new Map());

  for (let i = 0; i < days.length; i++) {
    let today = days[i];
    const todaysGitContributions = dateMappedEvents.get(today.date.toISOString()) || [];

    today.commits = today.commits.concat(
      (
        await Promise.all(
          todaysGitContributions.map<Promise<ICommit[]>>(async (e) => {
            const isPrivate = PRIVATE.repos[e.repo.name] || null;

            return await Promise.all(
              e.payload.commits.map(async (c: any) => {
                return {
                  slug: `${e.actor.display_login}/${isPrivate ?? e.repo.name}@${e.payload.ref
                    .split('/') // ref/heads/master
                    .pop()}`, // cxss/repo@master
                  sha: c.sha,
                  url: isPrivate ? '#' : c.url,
                  message: isPrivate ? 'Made a private contribution' : c.message,
                  signing_key: await getSignedCommitKid(e.repo.name, c.sha) || "",
                };
              })
            );
          })
        )
      ).flat()
    );
  }

  return days;
};
