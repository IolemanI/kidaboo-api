/* global require */
/* global exports */
const Joi = require('joi');

function validateEmail(input) {
  const schema = {
    email: Joi.string().min(5).max(255).required().email()
  };
  return Joi.validate(input, schema);
}

function validateResetPasswd(input) {
  const schema = {
    password: Joi.string().min(6).max(255).required(),
    token: Joi.string().min(20).max(255).required(),
  };
  return Joi.validate(input, schema);
}

function validateConfirmEmail(input) {
  const schema = {
    token: Joi.string().min(20).max(255).required(),
  };
  return Joi.validate(input, schema);
}

//function to validate user 
function validateUser(user) {
  const schema = {
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(6).max(255).required(),
    phone: Joi.string().min(10).max(255).required(),
  };
  return Joi.validate(user, schema);
}

// function to validate auth credentials
function validateCreds(input) {
  const schema = {
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().max(255).required()
  };
  return Joi.validate(input, schema);
}


exports.validateUser = validateUser;
exports.validateCreds = validateCreds;
exports.validateEmail = validateEmail;
exports.validateResetPasswd = validateResetPasswd;
exports.validateConfirmEmail = validateConfirmEmail;