/* eslint-disable no-undef */
import { controller, get, put, post } from "koa-dec-router";
import { UsersRepo } from "../repository/users";
import { permission } from "../middleware/auth";
import { paginationMiddleware } from '../middleware/pagination';
import fileUploader from '../middleware/file-uploader';

import {
  RES_USERS,
  ACL_VIEW_OWN,
  ACL_CREATE,
  ACL_EDIT_OWN,
  ACL_EDIT_ANY,
  ACL_VIEW_ANY,
  ACL_LIST,
} from "../lib/acl";
import * as HttpStatus from 'http-status-codes';

export default @controller("/accounts")
class AccountController {
  @get('', permission(RES_USERS, ACL_LIST), paginationMiddleware({
    sorting: {
      default: ['name', 'last_name']
    },
    query: ['name', 'last_name']
  }))
  async getUsers(ctx) {
    const [data, count] = await UsersRepo.getUsersByFilter(ctx.pagination);

    ctx.ok({ data, count });
  }

  @get("/:id", permission(RES_USERS, ctx => (ctx.state.user.id === +ctx.params.id) ? ACL_VIEW_OWN : ACL_VIEW_ANY))
  @get("/me", permission(RES_USERS, ACL_VIEW_OWN))
  async getAccount(ctx) {    
    const id = ctx.params.id ? ctx.params.id : ctx.state.user.id;
    
    let user = await UsersRepo.getById(id);

    if (!user) {
      return ctx.throw(HttpStatus.UNAUTHORIZED, 'User not found')
    }
    ctx.ok(user);
  }

  @post("/", permission(RES_USERS, ACL_CREATE))
  @put('/:id', permission(RES_USERS, ctx => (ctx.state.user.id === +ctx.params.id) ? ACL_EDIT_OWN : ACL_EDIT_ANY))
  async saveAccount(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    let user = await UsersRepo.save(data, id);

    ctx.ok({
      id: user.id,
    });
  }
}
