require('dotenv').config();
const fs = require('fs');
import notifier from 'node-notifier';
import firestore from './firestore';
import logger from './logger';
import { getStartAndEndDates, timeless } from './helpers';
import { IDay, IPrivateData } from './models';
import Readers from './readers';

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

const PRIVATE:IPrivateData = JSON.parse(fs.readFileSync(__dirname+'/private.json'));
if(!PRIVATE) throw new Error("Missing private data file");
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

    logger.info(`Getting data for days between ${start} & ${end}`)

    notifier.notify({
      title: 'awgit',
      message: `Generating data for the last ${dayDifference} day(s)`,
      sound: true,
    });

    let days: IDay[] = [];
    for (let i = 0; i < dayDifference; i++) {
      days.push({
        // make new date from start adding i days onto it
        date: timeless(new Date(new Date().setDate(start.getDate() + i))),
        commits: [],
        stats: {
          productive: 0,
          nonproductive: 0,
          language: 0,
          communications: 0,
          other: 0,
        },
      });
    }

    console.log(days);
    process.exit(1);

    await Readers.ActivityWatch(days);
    await Readers.GitHub(days);
    await Readers.GitLab(days);

    logger.info("Sending days to Firestore")
    const batch = fs.batch();
    days.forEach((d) => batch.set(collection.doc(), d));
    await batch.commit();
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
})();
