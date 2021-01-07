import { handleRoute, VercelFunction } from '../helpers/handler';
import { IDay } from '../helpers/interfaces';

const getAllDays: VercelFunction = async (req, fs): Promise<Array<Omit<IDay, 'commits'>>> => {
  const DAY_LIMIT = 182;
  const collection = fs.collection('days');

  const dateRegex = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/;
  const start = req.query.start as string;
  const end = req.query.end as string;

  if (start && !start.match(dateRegex)) throw Error(`Invalid start date (YYYY-MM-DD)`);
  if (end && !end.match(dateRegex)) throw Error(`Invalid start date (YYYY-MM-DD)`);

  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : addDay(startDate, -(DAY_LIMIT - 1));

  const dayDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
  if (Math.abs(dayDifference) > DAY_LIMIT)
    throw Error(`Must be less-than-or-equal to 100 days between dates`);

  const days = await collection.where('date', '<=', startDate).where('date', '>=', endDate).get();

  return days.docs.map((d) => {
    const data = d.data();
    return {
      _id: data._id,
      date: data.date,
      commit_count: data.commit_count,
      stats: data.stats,
    };
  });
};

export default handleRoute(getAllDays);

const timeless = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDay = (date: Date, amount: number): Date => {
  return timeless(new Date(new Date(date.getTime() + amount * 60 * 60 * 24 * 1000)));
};
