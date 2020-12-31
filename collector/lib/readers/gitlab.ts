import Axios from 'axios';
import { timeless } from '../helpers';
import { ICommit, IDay } from '../models';
import { ReaderFn } from './index';

const getProjectById = async (projectId: number): Promise<any> => {
  await new Promise((resolve) => setTimeout(resolve, 500)); //avoid rate-limit
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

  const res = await Axios.get(
    `https://gitlab.com/api/v4/events?action_type=pushed&after=${oldestDay.date}&before=${newestDay.date}`,
    {
      headers: {
        ['PRIVATE-TOKEN']: process.env.GITLAB_API_KEY,
      },
    }
  );

  const data: any[] = res.data;
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

    today.commits = today.commits.concat(
      await Promise.all(
        todaysGitContributions
          .filter((c) => c.action_name == 'pushed to') // only commits
          .map<Promise<ICommit>>(async (c: any) => {
            if (!projectMap.has(c.project_id))
              projectMap.set(c.project_id, await getProjectById(c.project_id));

            return {
              project: projectMap.get(c.project_id).path_with_namespace, // e.g. cxss/days
              message: c.push_data.commit_title || '',
              sha: c.push_data.commit_to,
              url: `https://gitlab.com/projects/${c.project_id}`,
            };
          })
      )
    );
  }

  return days;
};
