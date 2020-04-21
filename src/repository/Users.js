import { Op } from 'sequelize';
import bcrypt from "bcrypt";
import crypto from "crypto";

import pick from "lodash/pick";
import { Users } from "../models/Users";
import { AuthData } from "../models/AuthData";
import { generateToken, decodeToken } from "../helpers/tokenHelper";

import { 
  log, 
  LOG_REG_SEND_EMAIL, 
  LOG_CONF_SEND_EMAIL,
} from '../lib/logger';
import { 
  sendEmail, 
  FORGOT_PWD_TEMPLATE, 
  EMAIL_CONFIRMATION_TEMPLATE,
} from "../lib/mailer";

const saltRounds = 10;

export class UsersRepo {
  static getById(id) {
    return Users.findByPk(id, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
      ],
      include: [
        {
          model: AuthData,
          as: 'authData',
          attributes: [
            'role',
            'confirmed',
          ],
        },
      ],
    });
  }

  static loginByEmail(email) {
    return Users.findOne({
      where: {
        email,
      },
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
      ],
      include: [
        {
          model: AuthData,
          as: 'authData',
          attributes: [
            'role',
            'confirmed',
            'password',
            'refreshToken',
            'confirmationToken',
            'resetToken',
          ],
        },
      ],
    });
  }

  static async save(body, id) {
    let user;
    let authData;

    if (id) {
      user = await Users.findByPk(id, {
        include: [
          {
            model: AuthData,
            as: 'authData',
            attributes: [
              'role',
              'confirmed',
              'password',
              'refreshToken',
              'confirmationToken',
              'resetToken',
            ],
          },
        ],
      });

      if (!user) {
        const error = new Error();
        error.message = `User not found.`;
        error.type = error.name = 'RequestValidationError';
        throw error;
      }
    } else {
      user = new Users();
      authData = new AuthData();

      Object.assign(authData, { 
        confirmationToken: await generateToken(),
      });
    }

    const preparedUserEmail = body.email.toLowerCase();
    let exist = await Users.find({ where: { email: preparedUserEmail } });
    if (exist && exist.id !== user.id) {
      const error = new Error()
      error.message = `User with this email already exists.`;
      error.type = error.name = 'RequestValidationError';
      throw error;
    }

    const _user = pick(body, [
      'firstName',
      'lastName',
      'email',
      'phone',
    ]);
    const _authData = pick(body, [
      'password',
      'oldPassword',
    ]);
    
    if (_authData.password && _authData.oldPassword) {
      let passed = await bcrypt.compare(_authData.oldPassword, user.authData.password);

      if (passed) {
        _authData.password = await bcrypt.hash(_authData.password, saltRounds);
        _authData.oldPassword = undefined;
      } else {
        const error = new Error();
        error.message = `Wrong password.`;
        error.type = error.name = 'RequestValidationError';
        throw error;
      }
    }

    if (_authData.password && !_authData.oldPassword) {
      _authData.password = await bcrypt.hash(_authData.password, saltRounds);
    }

    Object.assign(user, _user);
    user = await user.save();

    if (!id) {
      _authData.userId = user.id;
    }
    Object.assign(authData, _authData);

    authData = await authData.save();

    // if (!id) {
    //   log(LOG_REG_SEND_EMAIL, { email: user.email });
    //   sendEmail({
    //     userName: user.name,
    //     email: user.email,
    //     url: `/confirm?token=${user.confirmation_token}`,
    //     subject: 'Welcome to useheard.com!'
    //   }, EMAIL_CONFIRMATION_TEMPLATE);
    // }
    return user;
  }

  static async getUsersByFilter({ skip: offset, size: limit, query, sorting: order }) {
    const params = {
      where: {},
      attributes: [
        'id',
        'name',
        'lastName',
        'email',
      ],
    };

    if (query) {
      params.where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
      ]
    }
    let data = await Users.findAll({
      ...params,
      limit,
      offset,
      order
    });
    delete params.include;
    delete params.attributes;
    const count = Users.count({
      ...params
    });

    return Promise.all([data, count]);
  }

  static async forgotPasswd(data) {
    const preparedUserEmail = data.email.toLowerCase();
    let user = await Users.findOne({ where: { email: preparedUserEmail } });
    if (typeof user === 'undefined') {
      return false
    }

    let token = crypto.randomBytes(20).toString('hex');

    user.update({ resetPasswordToken:token, resetPasswordExpires: Date.now() + 86400000})
    .then(() => {})
    .catch(err => {
      console.error(err.message || err.data.message);
    });

    log(LOG_CONF_SEND_EMAIL, { email: user.email });

    return sendEmail({
      userName: user.name,
      email: user.email,
      url: `/recover?token=${token}`,
      subject: 'Password help has arrived!'
    }, FORGOT_PWD_TEMPLATE);
  }
  
  static async resetPasswd(data) {
    let user = await Users.findOne({
      where: {
        resetPasswordToken: data.token,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      }
    });

    if (typeof user === 'undefined') {
      console.log("Can't get user with specified token.");
      return
    }

    user.password = await bcrypt.hash(data.password, saltRounds);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    return user.save();
  }
  
  static async confirm(data) {
    let authData = await AuthData.findOne({
      where: {
        confirmationToken: data.token,
      },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: [
            'email',
          ],
        },
      ],
    });

    if (!authData) {
      console.log("Can't get user with specified token.");
      return;
    }

    authData.confirmationToken = null;
    authData.confirmed = true;
    await authData.save();
    return authData.user;
  }
  
  static async updateAuthData(userId, data) {
    let authData = await AuthData.findOne({
      where: {
        UserId: userId,
      },
    });

    if (!authData) {
      const error = new Error();
      error.message = `User not found.`;
      error.type = error.name = 'RequestValidationError';
      throw error;
    }

    const _authData = pick(data, [
      'password',
      'refreshToken',
      'resetToken',
    ]);
    Object.assign(authData, _authData);

    authData = await authData.save();

    // user.confirmationToken = null;
    // user.confirmationExpires = null;
    // user.confirmed = true;
    return authData.save();
  }
}
