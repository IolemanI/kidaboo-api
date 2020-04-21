import { getAcl } from '../lib/acl';
import { decodeJwt } from '../lib/auth';
import { UsersRepo } from '../repository/users';
import {log, LOG_ACCESS_ROLEDENIED} from "../lib/logger";

export async function checkUserAcl(user, resourceName, rule) {
  const dbUser = await UsersRepo.getById(user.id);
  const role = dbUser.authData.role;

  return checkAcl(role, resourceName, rule);
}

export function checkAcl(role, resourceName, rule) {
  return new Promise((resolve, reject) => {
    getAcl().query(role, resourceName, rule, function(err, allowed) {
      if (err) {
        return reject(err);
      }
      resolve(allowed);
    });
  });
}

export function permission(resourceName, rule) {
  return (ctx, next) => {
    return jwtAuth()(ctx, () => {
      return checkPermission(ctx, next);
    });
  };

  async function checkPermission(ctx, next) {
    let ruleText = rule;
    if (typeof rule === 'function') {
      ruleText = await rule(ctx);
    }
    if (resourceName && !await checkUserAcl(ctx.state.user, resourceName, ruleText)) {
      log(LOG_ACCESS_ROLEDENIED, { url: ctx.request.href, role: ctx.state.user.authData.role, resourceName, ruleText }, { user_id: ctx.state.user.id });
      return ctx.forbidden({ message: 'Denied' });
    }

    return await next();
  }
}

export function jwtAuth() {
  return async (ctx, next) => {
    ctx.state.checkPermission = (resourceName, rule) => {
      return checkAcl(ctx.state.user.authData.role, resourceName, rule)
    };

    const token = ctx.cookies.get('access_token');

    if (!token) {
      log(LOG_ACCESS_ROLEDENIED, ctx.request.href, 'No Access Token');
      return ctx.unauthorized({ message: 'Access Token expected' });
    }
    try {
      let email;

      if (token) {
        // if session is expired, decodeJwt() returns "sessionExpired": true
        let data = decodeJwt(token);

        email = data.email;
        if (!email) {
          log(LOG_ACCESS_ROLEDENIED, ctx.request.href, 'Invalid jwt token');
          return ctx.unauthorized({ message: 'Invalid jwt token' });
        }
      }

      // eslint-disable-next-line require-atomic-updates
      ctx.state.user = await UsersRepo.loginByEmail(email);
    } catch (err) {
      return ctx.unauthorized({ message: err.message, sessionExpired: true });
    }

    if (!ctx.state.user) {
      return ctx.unauthorized({ message: 'User not found' });
    }

    return await next();
  };
}
