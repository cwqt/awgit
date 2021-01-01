import { handleRoute, VercelFunction } from '../helpers/handler';
import { IDay } from '../helpers/interfaces';

const getAllDays: VercelFunction = async (request, fs): Promise<Array<Omit<IDay, 'commits'>>> => {
  const collection = fs.collection('days');
  
  return (await collection.get()).docs.map((d) => {
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
