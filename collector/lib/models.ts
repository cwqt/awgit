export interface IDay {
  _id?:string;
  date: Date;
  commits: ICommit[];
  stats: {
    productive: number;
    nonproductive: number;
    other: number;
  }
}

export interface ICommit {
  message: string;
  sha: string;
  url: string;
}