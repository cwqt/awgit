import Axios from 'axios';
import PRIVATE from '../index';
import { timeless, addDay } from '../helpers';
import { ICommit, IDay } from '../models';
import { ReaderFn } from './index';
import logger from '../logger';

const parseLinks = require('parse-link-header');
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

  return getShortKid(sig);
};

const getShortKid = (signature: string) => {
  return pgp.util
    .format_fingerprint(pgp.armor.decode(signature)[1].body)
    .substring(0, 79)
    .split(' ')
    .slice(-4)
    .join('');
};

export const readGitHub: ReaderFn = async (days: IDay[]): Promise<IDay[]> => {
  //Instead of calling the GitHub API for every day in days, call between the first & last day in the array
  // to avoid getting ratelimited
  const oldestDay = days[0];
  const newestDay = days[days.length - 1];
  if (oldestDay.date == newestDay.date) return days;

  // GitHub has no mechanism for getting dates within a period, so we'll just paging backwards
  // until we've got something with a date before the oldestDay.date (-1 day just to be sure)
  let allCommits: any[] = [];

  for await (let org of PRIVATE.orgs) {
    logger.info(`Fetching org: ${org}`);
    const orgRepos = await Axios.get(`https://api.github.com/orgs/${org}/repos`, {
      auth: {
        username: process.env.GITHUB_USERNAME,
        password: process.env.GITHUB_API_KEY,
      },
    });

    for await (let repo of orgRepos.data) {
      logger.info(`\tFetching branches on: ${org}`);
      const branches = await Axios.get(`https://api.github.com/repos/${repo.full_name}/branches`, {
        auth: {
          username: process.env.GITHUB_USERNAME,
          password: process.env.GITHUB_API_KEY,
        },
      });

      for await (let branch of branches.data) {
        let page = 1;
        while (true) {
          logger.info(`\t\tFetching commits: page ${page} of ${repo.full_name}/${branch.name}`);
          const commits = await Axios.get(
            `https://api.github.com/repos/${repo.full_name}/commits` +
              `?author=${process.env.GITHUB_USERNAME}` +
              `&sha=${branch.commit.sha}` +
              `&page=${page}&per_page=100`,
            {
              auth: {
                username: process.env.GITHUB_USERNAME,
                password: process.env.GITHUB_API_KEY,
              },
            }
          );

          allCommits = allCommits.concat(
            commits.data.map((c: any) => ({ ...c, repo: repo.full_name, branch: branch.name }))
          );

          if (commits.data.some((d: any) => new Date(d.commit.author.date) < addDay(oldestDay.date, -1)))
            break;

          // Don't go over pagination limit, won't return a last page & last pages' page
          const links = parseLinks(commits.headers['link']);
          if (links == null || links.last == undefined) break;
          await avoidRatelimit();
          page++;
        }
      }
    }
  }

  // remove duplicate commits
  allCommits = allCommits.filter(
    (v, i, a) => a.findIndex((t) => t.commit.tree.sha === v.commit.tree.sha) === i
  );

  const dateMappedCommits: Map<string, any[]> = allCommits.reduce((acc, curr) => {
    const commitDate = timeless(new Date(curr.commit.author.date)).toISOString();
    acc.has(commitDate)
      ? acc.set(commitDate, [...acc.get(commitDate), curr])
      : acc.set(commitDate, []);
    return acc;
  }, new Map());

  console.log(dateMappedCommits);

  for (let i = 0; i < days.length; i++) {
    let today = days[i];
    const todaysGitContributions = dateMappedCommits.get(today.date.toISOString()) || [];

    today.commits = today.commits.concat(
      todaysGitContributions.map<ICommit>((c) => {
        const isPrivate = PRIVATE.repos[c.repo] || null;

        return {
          // cwqt/repo@master
          slug: `${c.author.login}/${isPrivate ?? c.repo}@${c.branch}`,
          sha: c.sha,
          url: isPrivate ? '#' : c.html_url,
          message: isPrivate ? 'Made a private contribution' : c.commit.message,
          signing_key: c.commit.verification.verified
            ? getShortKid(c.commit.verification.signature)
            : '',
        };
      })
    );
  }

  logger.info(`Got ${allCommits.length} events`);

  return days;
};
