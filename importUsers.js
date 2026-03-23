require('dotenv').config();

/**
 * Script import user từ file Excel
 * Usage: node importUsers.js <đường_dẫn_file_excel>
 *
 * File Excel cần có 2 cột: username (A), email (B)
 * Script sẽ:
 *   1. Sinh mật khẩu ngẫu nhiên 16 ký tự
 *   2. Tạo user với role "user"
 *   3. Gửi email chứa mật khẩu cho user
 */

const excelJS = require('exceljs');
const mongoose = require('mongoose');

const userModel = require('./schemas/users');
const roleModel = require('./schemas/roles');
const cartModel = require('./schemas/cart');
const { sendCredentials } = require('./utils/sendMailHandler');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/NNPTUD-C2');
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connected');
});
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Error:', err);
});

// Sinh chuỗi ngẫu nhiên 16 ký tự
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  const excelPath = process.argv[2];
  if (!excelPath) {
    console.error('Vui lòng cung cấp đường dẫn file Excel.\nUsage: node importUsers.js <đường_dẫn_file_excel>');
    process.exit(1);
  }

  // Đọc file Excel
  let workbook = new excelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  let worksheet = workbook.worksheets[0];

  // Role "user" — tự tạo nếu chưa có (Mongoose dùng collection "roles", không phải "role")
  let userRole = await roleModel.findOne({ name: 'user', isDeleted: false });
  if (!userRole) {
    userRole = await roleModel.create({
      name: 'user',
      description: 'Regular user (tạo tự động khi import)'
    });
    console.log(`[Role] Đã tạo mới role "user" với ID: ${userRole._id}`);
  } else {
    console.log(`[Role] Đã có role "user" với ID: ${userRole._id}`);
  }

  let results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let index = 2; index <= worksheet.rowCount; index++) {
    const row = worksheet.getRow(index);
    let username = row.getCell(1).value;
    let email = row.getCell(2).value;

    if (!username || !email) {
      results.push({ username: username || '(trống)', email: email || '(trống)', success: false, error: 'Username hoặc email bị trống' });
      errorCount++;
      continue;
    }

    // Kiểm tra user đã tồn tại chưa
    let existing = await userModel.findOne({
      $or: [{ username: username }, { email: email }],
      isDeleted: false
    });
    if (existing) {
      results.push({ username, email, success: false, error: 'User đã tồn tại' });
      errorCount++;
      continue;
    }

    // Sinh mật khẩu ngẫu nhiên 16 ký tự
    const plainPassword = generatePassword(16);

    let session;
    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        // Tạo user (pre-save hook sẽ tự hash password)
        let newUser = new userModel({
          username: username,
          password: plainPassword,
          email: email,
          role: userRole._id
        });
        await newUser.save({ session });

        // Tạo cart cho user
        let newCart = new cartModel({ user: newUser._id });
        await newCart.save({ session });

        // Gửi email chứa mật khẩu
        await sendCredentials(email, username, plainPassword);

        results.push({ username, email, success: true });
        successCount++;
        console.log(`[OK] Tạo user thành công: ${username} (${email})`);
      });
    } catch (err) {
      results.push({ username, email, success: false, error: err.message });
      errorCount++;
      console.error(`[FAIL] Tạo user thất bại: ${username} - ${err.message}`);
    } finally {
      if (session) await session.endSession();
    }
  }

  console.log('\n========== KẾT QUẢ ==========');
  console.log(`Tổng user xử lý: ${results.length}`);
  console.log(`Thành công: ${successCount}`);
  console.log(`Thất bại: ${errorCount}`);
  console.log('==============================\n');

  results.forEach(r => {
    if (r.success) {
      console.log(`  [OK]  ${r.username} - ${r.email}`);
    } else {
      console.log(`  [FAIL] ${r.username} - ${r.email} | Lý do: ${r.error}`);
    }
  });

  await mongoose.disconnect();
  console.log('\n[MongoDB] Disconnected. Hoàn tất!');
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  mongoose.disconnect();
  process.exit(1);
});
