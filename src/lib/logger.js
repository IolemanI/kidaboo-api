import { Bristol } from 'bristol';
import palin from 'palin';
import { env } from './env';

export const logger = new Bristol();

if (env.LOG_LEVEL !== 'off') {
  logger.addTarget('console').withFormatter(palin, {
    // rootFolderName: 'api-data' // Edit this to match your actual foldername
  })
}

export const LOG_LOGIN_SUCCESS = 'Login::Success';
export const LOG_LOGIN_FAILED = 'Login::Failed';
export const LOG_ACCESS_ROLEDENIED = 'Access::RoleDenied';

export const LOG_REFRESH_FAILED = 'Refresh::Failed';

export const LOG_RECOVER_PASSWORD = 'Auth::RecoverPassword';
export const LOG_CONFIRM_EMAIL = 'Auth::ConfirmEmail';

export const LOG_REG_SEND_EMAIL = 'Registration::SendEmail';
export const LOG_CONF_SEND_EMAIL = 'Confirmation::SendEmail';

export const LOG_USER_EDIT = 'User::Edit';
export const LOG_SOCIALS_EDIT = 'Socials::Edit';

export function log(action, payload = null, object) {
  logger.debug(action, payload, object)
}
