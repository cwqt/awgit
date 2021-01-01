import { NowRequest, NowResponse } from '@vercel/node'
import { IDay } from '../interfaces/IDay.model';

export default (request: NowRequest, response: NowResponse) => {
  let days:Array<Omit<IDay, "commits">> = [];

  const { name = 'World' } = request.query
  response.status(200).send(`Hello ${name}!`)
}