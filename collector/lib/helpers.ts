import { start } from 'repl';
import { Collection } from './firestore';

/**
 * @description Strip time from a date
 */
export const timeless = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getStartAndEndDates = async (collection: Collection): Promise<[Date, Date]> => {
  let startDate: Date = 
    (await collection.orderBy('date', 'desc').limit(1).get()).docs
      .map((x) => x.data())[0]
      ?.date.toDate() || null;

  if(!startDate) {
    console.log("No start dte")
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 10);
    startDate = yesterday;
  }

  const endDate = new Date();
  return [timeless(startDate), timeless(endDate)];
};

export const addDay = (date:Date, amount:number):Date => {
  return timeless(new Date(new Date((date.getTime() + (amount * 60 * 60 * 24 * 1000)))))
}