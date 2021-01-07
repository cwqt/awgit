import { NowRequest, NowResponse } from '@vercel/node';
import firestore, { FireStore } from './firestore';

export type VercelFunction = (request: NowRequest, fs: FireStore) => Promise<any>;

export const handleRoute = (f: VercelFunction) => {
  return async (request: NowRequest, response: NowResponse) => {
    try {
      const [fs, _] = await firestore.setup();
      const ret = await f(request, fs);
      response.json(ret);
    } catch (error) {
      console.log(error);
      response.status(500).json({ status: 'fail', message: error.message });
    }
  };
};
