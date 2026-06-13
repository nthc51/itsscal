require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/db');
const User = require('../models/User');
const Event = require('../models/Event');

const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;

async function seed() {
  console.log('\n🌱 Bắt đầu seed data...');
  await connectDB();

  // ─── Xoá data cũ của seed users ─────────────────────────────
  const seedEmails = ['an@seed.com', 'binh@seed.com', 'chi@seed.com'];
  const oldUsers = await User.findAll({ where: { email: seedEmails } });
  const oldIds = oldUsers.map((u) => u.id);
  if (oldIds.length > 0) {
    await Event.destroy({ where: { user_id: oldIds } });
    await User.destroy({ where: { id: oldIds } });
    console.log(YELLOW(`⚠️  Đã xoá ${oldIds.length} user cũ + events liên quan để seed lại`));
  }

  // ─── Tạo 3 users ────────────────────────────────────────────
  const hash = await bcrypt.hash('123456', 10);

  const createdUsers = await User.bulkCreate([
    { full_name: 'Nguyen Thi An', email: 'an@seed.com', password_hash: hash },
    { full_name: 'Tran Van Binh', email: 'binh@seed.com', password_hash: hash },
    { full_name: 'Le Thi Chi', email: 'chi@seed.com', password_hash: hash },
  ]);

  const [an, binh, chi] = createdUsers;
  console.log(CYAN('\n👤 Đã tạo 3 users:'));
  [an, binh, chi].forEach((u) => console.log(`   • ${u.full_name} (${u.email}) — id: ${u.id}`));

  // ─── Tạo events cho từng user ────────────────────────────────
  const events = [
    { user_id: an.id, title: 'Học Giải tích', description: 'Ôn tập chương 5: Tích phân', type: 'hoc', tag_label: 'Toán cao cấp', event_date: '2026-06-02', start_time: '07:30', end_time: '09:30', location: 'Phòng A101' },
    { user_id: an.id, title: 'Học Lập trình Python', description: 'Bài 12: OOP nâng cao', type: 'hoc', tag_label: 'CNTT', event_date: '2026-06-03', start_time: '13:00', end_time: '15:00', location: 'Lab B204' },
    { user_id: an.id, title: 'Nộp báo cáo thực tập', description: 'Nộp qua email giảng viên hướng dẫn', type: 'deadline', event_date: '2026-06-10', start_time: '23:00', end_time: '23:59', deadline_due_datetime: new Date('2026-06-10T16:59:00Z'), deadline_priority: 'high', deadline_is_completed: false },
    { user_id: an.id, title: 'Thi cuối kỳ Vật lý', description: 'Mang thước kẻ, máy tính Casio', type: 'deadline', event_date: '2026-06-20', start_time: '07:00', end_time: '09:00', location: 'Hội trường C', deadline_due_datetime: new Date('2026-06-20T00:00:00Z'), deadline_priority: 'high', deadline_is_completed: false },
    { user_id: an.id, title: 'Họp nhóm đồ án', description: 'Phân công task sprint 3', type: 'hoc', tag_label: 'Đồ án môn học', event_date: '2026-06-05', start_time: '18:00', end_time: '20:00', location: 'Online - Google Meet' },

    { user_id: binh.id, title: 'Ca sáng quán cà phê', description: 'Mở cửa từ 6h30, pha đồ uống', type: 'lam_them', event_date: '2026-06-02', start_time: '06:30', end_time: '11:30', location: 'The Coffee House - Q1' },
    { user_id: binh.id, title: 'Ca tối phục vụ tiệc', description: 'Event tiệc cưới tại nhà hàng', type: 'lam_them', event_date: '2026-06-07', start_time: '17:00', end_time: '22:00', location: 'Nhà hàng Bình Minh' },
    { user_id: binh.id, title: 'Học Tiếng Anh giao tiếp', description: 'Unit 8: Business English', type: 'hoc', tag_label: 'Ngoại ngữ', event_date: '2026-06-04', start_time: '19:00', end_time: '21:00', location: 'Trung tâm IELTS Plus' },
    { user_id: binh.id, title: 'Nộp hồ sơ xin việc fulltime', type: 'deadline', event_date: '2026-06-15', start_time: '17:00', end_time: '17:30', deadline_due_datetime: new Date('2026-06-15T10:00:00Z'), deadline_priority: 'medium', deadline_is_completed: false },
    { user_id: binh.id, title: 'Ca sáng cuối tuần', type: 'lam_them', event_date: '2026-06-08', start_time: '07:00', end_time: '12:00', location: 'The Coffee House - Q1' },

    { user_id: chi.id, title: 'Nộp bài tập lớn Cơ sở dữ liệu', description: 'ERD + SQL script + báo cáo Word', type: 'deadline', event_date: '2026-05-28', start_time: '23:00', end_time: '23:59', deadline_due_datetime: new Date('2026-05-28T16:00:00Z'), deadline_priority: 'high', deadline_is_completed: true, deadline_completed_at: new Date('2026-05-27T14:30:00Z') },
    { user_id: chi.id, title: 'Học Mạng máy tính', description: 'Chương 4: Transport Layer', type: 'hoc', tag_label: 'Mạng máy tính', event_date: '2026-06-03', start_time: '07:30', end_time: '11:30', location: 'Phòng D301' },
    { user_id: chi.id, title: 'Làm thêm gia sư Toán', description: 'Dạy học sinh lớp 10', type: 'lam_them', event_date: '2026-06-06', start_time: '15:00', end_time: '17:00', location: 'Nhà học sinh - Q.Bình Thạnh' },
    { user_id: chi.id, title: 'Đăng ký học bổng', type: 'deadline', event_date: '2026-06-30', start_time: '17:00', end_time: '17:00', deadline_due_datetime: new Date('2026-06-30T10:00:00Z'), deadline_priority: 'medium', deadline_is_completed: false },
    { user_id: chi.id, title: 'Học Học máy (ML)', description: 'Lab: Linear Regression', type: 'hoc', tag_label: 'AI/ML', event_date: '2026-06-11', start_time: '13:00', end_time: '17:00', location: 'Lab AI - Tầng 5' },
  ];

  const inserted = await Event.bulkCreate(events);
  console.log(CYAN('\n📅 Đã tạo events:'));

  const byUser = { [an.id]: [], [binh.id]: [], [chi.id]: [] };
  inserted.forEach((e) => byUser[e.user_id]?.push(e));

  const names = { [an.id]: 'An', [binh.id]: 'Binh', [chi.id]: 'Chi' };
  for (const [uid, evs] of Object.entries(byUser)) {
    console.log(`\n   👤 ${names[uid]} (${evs.length} events):`);
    evs.forEach((e) => {
      const tag = e.type === 'deadline' ? '⏰' : e.type === 'lam_them' ? '💼' : '📚';
      const done = e.deadline_is_completed ? ' [DONE]' : '';
      const pri = e.deadline_priority ? ` [${e.deadline_priority.toUpperCase()}]` : '';
      console.log(`      ${tag} [${e.type}] ${e.title} — ${e.event_date}${pri}${done}`);
    });
  }

  // ─── Tổng kết ────────────────────────────────────────────────
  const totalUsers = await User.count();
  const totalEvents = await Event.count();
  console.log(GREEN(`\n✅ Seed hoàn tất!`));
  console.log(`   Tổng users trong DB : ${totalUsers}`);
  console.log(`   Tổng events trong DB: ${totalEvents}`);
  console.log('\n   🔑 Login bằng:');
  seedEmails.forEach((e) => console.log(`      email: ${e}  |  password: 123456`));
  console.log('');

  await sequelize.close();
}

seed().catch((err) => {
  console.error('❌ Seed lỗi:', err.message || err);
  process.exit(1);
});
