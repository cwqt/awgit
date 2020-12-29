import { start } from 'repl';
import { Collection } from './firestore';

/**
 * @description Strip time from a date
 */
export const timeless = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getStartAndEndDates = async (collection: Collection): Promise<[Date, Date]> => {
  const startDate: Date = 
    (await collection.orderBy('date', 'desc').limit(1).get()).docs
      .map((x) => x.data())[0]
      ?.date.toDate() || new Date()

  const endDate = new Date();
  return [timeless(startDate), timeless(endDate)];
};
