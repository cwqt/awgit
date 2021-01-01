import { NowRequest, NowResponse } from '@vercel/node';

export default async (request:NowRequest, response:NowResponse) => {
  response.send(`
  <html>
  <style>b { min-width: 140px; display: inline-block }</style>
  <img src="image.png" width="200"/>
  <h1 style="margin: 0px">awgit</h1>
  <a href="https://gitlab.com/cxss/awgit">gitlab.com/cxss/awgit</a>
  <br/>
  <br/>
  <h2 style="margin: 0px">routes</h2>
  <ul style="margin-top: 0">
    <li><b><code>GET /</code></b> this page dummy</li>
    <li><b><code>GET /days</code></b> list of all days, minus commits</li>
    <li><b><code>GET /days/config</code></b> some meta info, total days, total hrs</li>
    <li><b><code>GET /days/:did</code></b> get a specific day (with commits)</li>
  </ul>
  </html>
  `)
}
