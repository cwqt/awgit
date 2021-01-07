# awgit  &nbsp;  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgitlab.com%2Fcxss%2Fawgit&env=FIREBASE_API_KEY,FIREBASE_PASSWORD,FIREBASE_EMAIL&project-name=awgit&repository-name=awgit)


A re-write of [days](https://gitlab.com/cxss/archive/-/tree/master/days), using [ActivityWatch](https://activitywatch.net/) & [Firebase](https://firebase.google.com/).

API uses [Vercel](https://vercel.com/) serverless functions written in TypeScript.  
Now with support for GitLab & GitHub :)


## Running the collector

You'll need these environment variables in your `.env`
```
NETLIFY_HOOK_ID
FIREBASE_EMAIL
FIREBASE_PASSWORD
FIREBASE_API_KEY
GITLAB_API_KEY
GITHUB_API_KEY
GITHUB_USERNAME
GITLAB_USERNAME
```

To get the collector to run every day, create a file called `.collect.sh` in your home, and add the following:

```sh
#!/bin/bash -l
cd /PATH_TO_REPO/awgit/collector
npm run collector
```

Then run `crontab -e` & add: `0 10 * * * /Users/YOUR_USERNAME/.collect.sh`  
Which will make the collector run every day at 10am
