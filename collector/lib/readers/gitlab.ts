import Axios from 'axios';
import logger from '../logger';
import { addDay, timeless } from '../helpers';
import { ICommit, IDay } from '../models';
import { ReaderFn } from './index';
const linkHeaders = require('parse-link-header');


// https://docs.gitlab.com/ee/user/gitlab_com/index.html#gitlabcom-specific-rate-limits
// 600 req / min = 0.1 seconds / req
const avoidRatelimit = async () => {
  await new Promise((resolve) => setTimeout(resolve, 150));
};

const getSignedCommitKid = async (projectId: number, commitSHA: string): Promise<string | null> => {
  await avoidRatelimit();
  let ret: string | null;

  try {
    const res = await Axios.get(
      `https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${commitSHA}/signature`,
      {
        headers: {
          ['PRIVATE-TOKEN']: process.env.GITLAB_API_KEY,
        },
      }
    );
    ret = res.data.gpg_key_primary_keyid;
  } catch (error) {
    ret = null;
  }

  return ret;
};

const getProjectById = async (projectId: number): Promise<any> => {
  await avoidRatelimit();
  const res = await Axios.get(`https://gitlab.com/api/v4/projects/${projectId}`, {
    headers: {
      ['PRIVATE-TOKEN']: process.env.GITLAB_API_KEY,
    },
  });

  return res.data;
};

export const readGitLab: ReaderFn = async (days: IDay[]): Promise<IDay[]> => {
  //Instead of calling the GitHub API for every day in days, call between the first & last day in the array
  // to avoid getting ratelimited
  const oldestDay = days[0];
  const newestDay = days[days.length - 1];
  if (oldestDay.date == newestDay.date) return days;

  let data: any[] = [];
  // We can use a start/end point with GitLab API but returns them in pages of default 20
  // Go +-1 day just to be sure because I think something about the dates is fucking this
  let isStillPaging = true;
  let page = 1;
  while(isStillPaging) {
    const res = await Axios.get(
      `https://gitlab.com/api/v4/events?page=${page}&page_size=100&action=pushed&after=${addDay(oldestDay.date, -1)
        .toISOString()
        .substring(0, 10)}&before=${addDay(newestDay.date, 1).toISOString().substring(0, 10)}`,
      {
        headers: {
          ['PRIVATE-TOKEN']: process.env.GITLAB_API_KEY,
        },
      }
    );

    data = data.concat(res.data);
    await avoidRatelimit();
    const link = linkHeaders(res.headers.link);

    if(link.next) {
      page = link.next.page;
    } else {
      isStillPaging = false;
    }
  }

  logger.info(`Got ${data.length} events`);

  const dateMappedContribs: Map<string, any[]> = data.reduce((acc: Map<string, any[]>, curr) => {
    const commitDate = timeless(new Date(curr.created_at)).toISOString();
    acc.has(commitDate)
      ? acc.set(commitDate, [...acc.get(commitDate), curr])
      : acc.set(commitDate, []);

    return acc;
  }, new Map<string, any[]>());

  const projectMap: Map<number, any> = new Map();
  for (let i = 0; i < days.length; i++) {
    let today = days[i];
    const todaysGitContributions = dateMappedContribs.get(today.date.toISOString()) || [];

    // console.log(today.date, todaysGitContributions);

    today.commits = today.commits.concat(
      await Promise.all(
        todaysGitContributions
          .filter((c) => c.action_name == 'pushed to') // only commits
          .map<Promise<ICommit>>(async (c: any) => {
            if (!projectMap.has(c.project_id))
              projectMap.set(c.project_id, await getProjectById(c.project_id));

            return {
              slug: `${projectMap.get(c.project_id).path_with_namespace}@${c.push_data.ref}`, // e.g. cxss/days@master
              message: c.push_data.commit_title || '',
              sha: c.push_data.commit_to,
              url: `https://gitlab.com/projects/${c.project_id}`,
              signing_key: await getSignedCommitKid(c.project_id, c.push_data.commit_to) || "",
            };
          })
      )
    );
  }

  return days;
};
