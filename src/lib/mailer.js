/* global exports */
/* global require */
import { env } from './env';
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

const __dirname = path.resolve(path.dirname(''));

function initTransport() {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: env.MAIL_USER,
            pass: env.MAIL_PASSWD
        }
    });

    var handlebarsOptions = {
        viewEngine: 'handlebars',
        viewPath: path.join(__dirname, 'templates'),
        extName: '.html'
    };

    transporter.use('compile', hbs(handlebarsOptions));
    return transporter;
}

async function sendEmail(data, template) {
    let transporter = initTransport();
    var mailData = {
        to: data.email,
        from: env.MAIL_USER,
        template,
        subject: data.subject,
        context: {
            url: env.CLIENT_HOST + data.url,
            name: data.userName
        }
    };
    await transporter.sendMail(mailData, function (err) {
        if(err) {
            console.error(err.message || err.data.message);
        }
    });
}

exports.sendEmail = sendEmail;

exports.FORGOT_PWD_TEMPLATE = 'forgot-password-email';
exports.EMAIL_CONFIRMATION_TEMPLATE = 'email-confirmation';