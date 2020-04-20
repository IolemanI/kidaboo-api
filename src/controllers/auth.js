import { controller, post } from 'koa-dec-router';
import bcrypt from 'bcrypt';
import moment from 'moment';
import isEmpty from 'lodash/isEmpty';
import * as HttpStatus from 'http-status-codes';

import { UsersRepo } from '../repository/Users';
import * as validation from '../lib/validation';
import { generateJwt, decodeJwt } from '../lib/auth';
import { getRoleAcl } from '../lib/acl'

import { log, LOG_LOGIN_FAILED, LOG_LOGIN_SUCCESS, LOG_RECOVER_PASSWORD, LOG_CONFIRM_EMAIL } from '../lib/logger';

export default @controller("/auth")
class AuthController {
  @post("/register")
  async register(ctx) {
    // validate the request body first
    const req = ctx.request;
    const { error } = validation.validateUser(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return
    }

    let user = await UsersRepo.save(req.body);

    if (typeof user === 'undefined') {
      ctx.badRequest("Failed to save user.");
      return;
    }
    ctx.status = HttpStatus.CREATED;
    ctx.body = {
      id: user.id,
    };
  }

  @post("/login")
  async login(ctx) {
    const { email, password } = ctx.request.body;

    try {
      let data;
      let account;
      let passed;

      const token = ctx.cookies.get('access_token');
      if (token) {
        data = decodeJwt(token);

        account = await UsersRepo.loginByEmail(data.email);

        if (!account) {
          log(LOG_LOGIN_FAILED, { email: data.email });
          return ctx.unauthorized({ message: `User with email ${data.email} not found` })
        }
      } else if (!token && !isEmpty(ctx.request.body)) {
        const { error } = validation.validateCreds(ctx.request.body);

        if (error) {
          return ctx.badRequest(error.details[0].message);
        }
        data = {
          email,
        };
        account = await UsersRepo.loginByEmail(data.email);

        if (!account) {
          log(LOG_LOGIN_FAILED, { email: data.email });
          return ctx.unauthorized({ message: `User with email ${data.email} not found` })
        }

        passed = await bcrypt.compare(password, account.authData.password);
        if (!passed) {
          log(LOG_LOGIN_FAILED, { email: data.email });
          return ctx.unauthorized({ message: `Invalid email or password` })
        }
        // const session = await UsersRepo.setSession(account.id);
        // account = Object.assign(account, session);
      } else {
        return ctx.noContent();
      }

      if (!account.authData.confirmed) {
        log(LOG_LOGIN_FAILED, { email: data.email });
        return ctx.unauthorized({ message: `Account is not confirmed.` })
      }

      log(LOG_LOGIN_SUCCESS, { email: data.email });

      const user = account.get({ plain: true });
      user.permissions = getRoleAcl(account.access_role).allow;

      delete user.password;
      delete user.reset_password_token;
      delete user.reset_password_expires;

      const accessToken = await generateJwt(account);
      ctx.cookies.set('access_token', accessToken, {
        httpOnly: true,
        sameSite: true,
        expires: new Date(moment().add(1, 'hour').toISOString()),
      });

      const refreshToken = await generateJwt(account, 'refresh');
      ctx.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: true,
        expires: new Date(moment().add(1, 'year').toISOString()),
      });

      await UsersRepo.updateAuthData(user.id, {
        refreshToken,
      });

      return ctx.ok({
        accessToken: accessToken,
        refreshToken: refreshToken,
      })
    } catch (err) {
      console.error(err);
      if (err.message.indexOf('jwt expired') !== -1) {
        return ctx.unauthorized({ sessionExpired: true, message: `Session token expired` })
      }
      ctx.cookies.set('access_token', '', {
        httpOnly: true,
        sameSite: true,
      });
      ctx.cookies.set('refresh_token', '', {
        httpOnly: true,
        sameSite: true,
      });
      return ctx.badRequest({ message: err.message })
    }
  }

  @post("/logout")
  async logout(ctx) {
    ctx.cookies.set('access_token', '', {
      httpOnly: true,
      sameSite: true,
    });
    ctx.ok({});
  }

  @post("/forgot-password")
  async forgotPasswd(ctx) {
    const req = ctx.request;
    if (!req.body.email) {
      ctx.badRequest("Email is missing");
    }

    const { error } = validation.validateEmail(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return
    }

    let sent = await UsersRepo.forgotPasswd(req.body);
    if (typeof sent !== 'undefined') {
      ctx.badRequest("Forgot pass flow is failed.");
      return
    }
    ctx.ok()
  }

  @post("/reset-password")
  async resetPasswd(ctx) {
    const req = ctx.request;

    const { error } = validation.validateResetPasswd(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return;
    }

    let user = await UsersRepo.resetPasswd(req.body);

    log(LOG_RECOVER_PASSWORD, { email: user.email, token: req.body.token });

    if (typeof user === 'undefined') {
      ctx.badRequest("Failed to reset user password.");
      return;
    }
    ctx.ok({
      id: user.id,
    });
  }

  @post("/confirm-email")
  async confirmEmail(ctx) {
    const req = ctx.request;

    const { error } = validation.validateConfirmEmail(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return;
    }

    let user = await UsersRepo.confirm(req.body);

    log(LOG_CONFIRM_EMAIL, { email: user.email, token: req.body.token });

    if (!user) {
      ctx.badRequest("Failed to confirm email.");
      return;
    }
    ctx.ok({
      id: user.id,
      email: user.email,
    });
  }
}
