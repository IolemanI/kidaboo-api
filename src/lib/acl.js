import uniq from 'lodash/uniq';
import { Acl } from 'virgen-acl';

export const ACL_LIST = 'list';
export const ACL_VIEW_OWN = 'view:own';
export const ACL_VIEW_ANY = 'view:any';
export const ACL_EDIT_OWN = 'edit:own';
export const ACL_EDIT_ANY = 'edit:any';
export const ACL_CREATE = 'create';

export const RES_USERS = 'Users';

const acl = new Acl();
export function getAcl() {
  return acl;
}

export const ROLE_SUPER_ADMIN = 'Super Admin';
export const ROLE_ADMIN = 'Admin';
export const ROLE_USER = 'User';

const ACL = {
  [ROLE_USER]: {
    allow: {
      [RES_USERS]: [ACL_VIEW_OWN, ACL_EDIT_OWN],
    }
  },
  [ROLE_ADMIN]: {
    parent: ROLE_USER,
    allow: {
      [RES_USERS]: [ACL_LIST, ACL_VIEW_ANY, ACL_VIEW_OWN, ACL_CREATE],
    }
  },
  [ROLE_SUPER_ADMIN]: {
    parent: ROLE_ADMIN,
    allow: {
      [RES_USERS]: [ACL_EDIT_ANY],
    }
  }
};

acl.addResource(RES_USERS);

acl.deny();
for (const roleName in ACL) {
  const role = ACL[roleName];
  acl.addRole(roleName, role.parent);
  if (role.allow) {
    for (const resourceName in role.allow) {
      acl.allow(roleName, resourceName, role.allow[resourceName]);
    }
  }
}

export function getRoleAcl(roleName) {
  let acl = { ...ACL[roleName] } || {};
  acl.allow = acl.allow || {};
  if (acl.parent) {
    const role = getRoleAcl(acl.parent);
    if (role.allow) {
      for (const resourceName in role.allow) {
        acl.allow[resourceName] = uniq((acl.allow[resourceName] || []).concat(role.allow[resourceName]));
      }
    }
  }
  delete acl.parent;
  return acl;
}
