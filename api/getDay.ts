import { handleRoute, VercelFunction } from '../helpers/handler';
import { IDay } from '../helpers/interfaces';

const getAllDays: VercelFunction = async (request, fs): Promise<IDay> => {
  const collection = fs.collection('days');

  return (await collection.doc(request.query['did'] as string).get()).data() as IDay;
};

export default handleRoute(getAllDays);
