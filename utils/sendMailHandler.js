/**
 * Mailtrap SMTP — đọc từ file .env (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS)
 * Sao chép .env.example thành .env và điền credentials từ Mailtrap → Integration.
 */

let nodemailer = require('nodemailer');

const mailHost = process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io';
const mailPort = Number(process.env.MAIL_PORT) || 2525;
const mailUser = process.env.MAIL_USER || '';
const mailPass = process.env.MAIL_PASS || '';

const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailPort === 465,
    auth: {
        user: mailUser,
        pass: mailPass,
    },
});

module.exports = {
    sendMail: async function (to, url) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "mail reset passwrod",
            text: "lick vo day de doi passs",
            html: "lick vo <a href=" + url + ">day</a> de doi passs",
        });
    },
    sendCredentials: async function (to, username, password) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "Tai khoan cua ban da duoc tao",
            text:
                `Tai khoan cua ban da duoc tao thanh cong!\n\n` +
                `Username: ${username}\n` +
                `Password: ${password}\n\n` +
                `Vui long doi mat khau ngay sau khi dang nhap.`,
            html:
                `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">` +
                `  <div style="background: #4A90E2; color: white; padding: 20px; text-align: center;">` +
                `    <h2 style="margin: 0;">Tai khoan cua ban da duoc tao thanh cong!</h2>` +
                `  </div>` +
                `  <div style="padding: 20px;">` +
                `    <p>Xin chao <b>${username}</b>,</p>` +
                `    <p>Tai khoan cua ban da duoc tao boi admin. Vui long dang nhap va doi mat khau ngay.</p>` +
                `    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">` +
                `      <tr>` +
                `        <td style="padding: 8px; border: 1px solid #ddd;"><b>Username</b></td>` +
                `        <td style="padding: 8px; border: 1px solid #ddd;">${username}</td>` +
                `      </tr>` +
                `      <tr>` +
                `        <td style="padding: 8px; border: 1px solid #ddd;"><b>Password</b></td>` +
                `        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; background: #f9f9f9;">${password}</td>` +
                `      </tr>` +
                `    </table>` +
                `    <p style="color: #e74c3c; font-size: 13px;">Khong chia se mat khau nay voi bat ky ai!</p>` +
                `  </div>` +
                `</div>`,
        });
    }
};
