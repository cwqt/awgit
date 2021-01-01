import { handleRoute, VercelFunction } from '../helpers/handler';

const getConfig: VercelFunction = async (request, fs) => {
  const config = fs.collection('config');
  
  const env = (await config.doc('days').get()).data();
  return env;
};

export default handleRoute(getConfig);
