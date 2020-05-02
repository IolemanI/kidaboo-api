import * as http from 'http'
import * as https from 'https'
import fs from 'fs'
import Koa from 'koa'
import cors from '@koa/cors'
import respond from 'koa-respond'
import bodyParser from 'koa-bodyparser'
import compress from 'koa-compress'
import helmet from 'koa-helmet';
import DecRouter from 'koa-dec-router';

import {logger} from './logger'

import {errorHandler} from '../middleware/error-handler'

/**
 * Creates and returns a new Koa application.
 * Does *NOT* call `listen`!
 *
 * @return {Promise<http.Server>} The configured app.
 */
export async function createServer() {
  logger.debug('Creating server...');
  const app = new Koa();

  const decRouter = DecRouter({
    controllersDir: `${__dirname}/../controllers` // eslint-disable-line no-undef
  });

  app.proxy = true;

  app
  // Top middleware is the error handler.
    .use(errorHandler)
    .use(helmet())
    .use(compress())
    // Adds ctx.ok(), ctx.notFound(), etc..
    .use(respond())
    // Handles CORS.
    .use(cors({
      credentials: true,
      exposeHeaders: 'Authorization',
      origin: (ctx) => {
        return ctx.request.header.origin;
      }
    }))
    // Parses request bodies.
    .use(bodyParser())

    .use(decRouter.router.routes())
    .use(decRouter.router.allowedMethods())
  ;


  let server;

  if (process.env.NODE_ENV === 'production') {// eslint-disable-line no-undef
    server = https.createServer({
      key: fs.readFileSync('privkey.pem'),// eslint-disable-line no-undef
      cert: fs.readFileSync('fullchain.pem')// eslint-disable-line no-undef
    }, app.callback());
  } else {
    server = http.createServer(app.callback());
  }

  // Creates a http server ready to listen.

  // Add a `close` event listener so we can clean up resources.
  server.on('close', () => {
    // You should tear down database connections, TCP connections, etc
    // here to make sure Jest's watch-mode some process management
    // tool does not release resources.
    logger.debug('Server closing, bye!')
  });

  logger.debug('Server created, ready to listen', {scope: 'startup'})
  return server;
}
