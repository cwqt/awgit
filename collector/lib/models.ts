export interface IDay {
  _id?:string;
  date: Date;
  commits: ICommit[];
  stats: IDayStats;
}

export interface IDayStats {
  productive: number;
  nonproductive: number;
  language: number;
  communications: number;
  other: number;
}

export interface ICommit {
  message: string;
  sha: string;
  url: string;
  signing_key?:string;
}