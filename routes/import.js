var express = require("express");
var router = express.Router();
const { uploadExcel } = require('../utils/uploadHandler');
const path = require('path');
const excelJS = require('exceljs');
const userModel = require('../schemas/users');
const roleModel = require('../schemas/roles');
const cartModel = require('../schemas/cart');
const mongoose = require('mongoose');
const { sendCredentials } = require('../utils/sendMailHandler');
const { cellToString } = require('../utils/excelCellValue');
const { checkLogin, checkRole } = require('../utils/authHandler');

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

router.post("/import-users", checkLogin, checkRole("ADMIN"),
  uploadExcel.single('file'),
  async function (req, res, next) {
    if (!req.file) {
      return res.status(404).send({ message: "file upload rong" });
    }

    let pathFile = path.join(__dirname, '../uploads', req.file.filename);
    let workbook = new excelJS.Workbook();
    await workbook.xlsx.readFile(pathFile);
    let worksheet = workbook.worksheets[0];

    let userRole = await roleModel.findOne({ name: 'user', isDeleted: false });
    if (!userRole) {
      userRole = await roleModel.create({
        name: 'user',
        description: 'Regular user (tao tu dong khi import)'
      });
    }

    let success = [];
    let failed = [];

    for (let index = 2; index <= worksheet.rowCount; index++) {
      const row = worksheet.getRow(index);
      let username = cellToString(row.getCell(1).value);
      let email = cellToString(row.getCell(2).value);

      if (!username || !email) {
        failed.push({ username: username || '(trong)', email: email || '(trong)', error: 'Username hoac email bi trong' });
        continue;
      }

      let existing = await userModel.findOne({
        $or: [{ username: username }, { email: email }],
        isDeleted: false
      });
      if (existing) {
        failed.push({ username, email, error: 'User da ton tai' });
        continue;
      }

      const plainPassword = generatePassword(16);

      try {
        let session = await mongoose.startSession();
        session.startTransaction();
        try {
          let newUser = new userModel({
            username: username,
            password: plainPassword,
            email: email,
            role: userRole._id
          });
          await newUser.save({ session });

          let newCart = new cartModel({ user: newUser._id });
          await newCart.save({ session });

          await sendCredentials(email, username, plainPassword);

          await session.commitTransaction();
          success.push({ username, email });
        } catch (err) {
          await session.abortTransaction();
          failed.push({ username, email, error: err.message });
        } finally {
          session.endSession();
        }
      } catch (err) {
        failed.push({ username, email, error: err.message });
      }
    }

    const fs = require('fs');
    if (fs.existsSync(pathFile)) fs.unlinkSync(pathFile);

    res.send({
      total: worksheet.rowCount - 1,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    });
  }
);

module.exports = router;
