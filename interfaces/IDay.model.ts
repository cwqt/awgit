export interface IDay {
  _id?:string;
  date: Date;
  commits: ICommit[];
  stats: {
    visual: number;
    writing: number;
    audio: number;
  }
}

export interface ICommit {
  message: string;
  sha: string;
  url: string;
}