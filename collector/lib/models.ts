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
  slug:string; // cxss/repo@master
  sha: string;
  url: string;
  message: string;
  signing_key?:string;
}

export interface IPrivateData {
  websites:{
    productive: string[];
    nonproductive: string[];
  }; // google.com
  windows:string[]; // somewindow
  repos: {[index:string]:string}
}