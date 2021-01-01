require('dotenv').config();
const fs = require('fs');
import notifier from 'node-notifier';
import firestore from './firestore';
import logger from './logger';
import { getStartAndEndDates, timeless } from './helpers';
import { IDay, IDaysEnvironment, IPrivateData } from './models';
import Readers from './readers';
import { DefaultSerializer } from 'v8';

[
  'FIREBASE_API_KEY',
  'FIREBASE_EMAIL',
  'FIREBASE_PASSWORD',
  'GITLAB_API_KEY',
  'GITHUB_API_KEY',
  'GITHUB_USERNAME',
  'GITLAB_USERNAME',
].forEach((v) => {
  if (!process.env[v]) throw new Error(`Missing environment variable: ${v}`);
});

const PRIVATE: IPrivateData = JSON.parse(fs.readFileSync(__dirname + '/private.json'));
if (!PRIVATE) throw new Error('Missing private data file');
export default PRIVATE;

(async () => {
  try {
    logger.info('Starting to collect data');
    const [fs, collection] = await firestore.setup();
    const [start, end] = await getStartAndEndDates(collection);
    const dayDifference = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    if (dayDifference <= 1) {
      logger.info(`No day difference`);
      process.exit(0);
    }

    logger.info(`Getting data for days between ${start} & ${end}`);

    notifier.notify({
      title: 'awgit',
      message: `Generating data for the last ${dayDifference} day(s)`,
      sound: true,
    });

    let days: IDay[] = [];
    for (let i = 0; i < dayDifference; i++) {
      days.push({
        // make new date from start adding i days onto it
        date: timeless(new Date(new Date((start.getTime() + (i * 60 * 60 * 24 * 1000))))),
        commits: [],
        commit_count: 0,
        stats: {
          productive: 0,
          nonproductive: 0,
          language: 0,
          communications: 0,
          other: 0,
        },
      });
    }

    await Readers.ActivityWatch(days);
    await Readers.GitHub(days);
    await Readers.GitLab(days);
    days.forEach(day => { day.commit_count = day.commits.length });

    logger.info('Sending days to Firestore');
    const batch = fs.batch();
    days.forEach((d) => {
      const doc = collection.doc();
      d._id = doc.id;
      console.log(d)
      batch.set(doc, d);
    });

    await batch.commit();

    const env = await fs.collection('config').doc('days').get();
    const envData = env.data();

    // Get previous longest day - if it exists
    let longestDay = (await fs.collection("days").doc(envData.longest_day).get()).data();
    let longestDayTime = longestDay
      ? Object.values<number>(longestDay.stats).reduce((a, c) => (a += c), 0)
      : 0;

    // Sum up days stats times & check if any day was longer than the previously longest
    let totalDaysTime = days.reduce((acc, curr) => {
      let currDayTime = Object.values(curr.stats).reduce((a, c) => (a += c), 0);
      if (currDayTime > longestDayTime) {
        longestDay = curr;
        longestDayTime = currDayTime;
      }

      return (acc += currDayTime);
    }, 0);

    //Update the configuration
    await env.ref.update({
      longest_day: longestDay._id,
      total_days: envData.total_days + days.length,
      total_hours: envData.total_hours + totalDaysTime
    });
  } catch (error) {
    console.log(error);
    logger.error(error);
    notifier.notify({
      title: 'awgit',
      message: error.message,
      sound: true,
    });
  } finally {
    logger.info('Finished collecting data');
  }
})().then(() => process.exit(0));
