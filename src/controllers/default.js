import {controller, get} from 'koa-dec-router';

export default @controller('/') class ProjectsCtrl {
  @get('/')
  async healthCheck(ctx) {
    console.log('healthCheck');

    ctx.ok('OK');
  }
}
