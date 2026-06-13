require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const User = require('../models/User');
const Event = require('../models/Event');

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => console.log(`  ❌ FAIL: ${msg}`);
const HEAD = (msg) => console.log(`\n${'-'.repeat(55)}\n🧪 ${msg}\n${'-'.repeat(55)}`);

async function run() {
  console.log('\n🔌 Connecting to MySQL...');
  await connectDB();
  console.log('✅ Connected to MySQL');

  // ─── [1] Tables tồn tại ────────────────────────────────
  HEAD('[1] Kiểm tra tables trong DB');
  const qi = sequelize.getQueryInterface();
  let tables = [];
  try { tables = await qi.showAllTables(); } catch (e) { /* ignore */ }
  console.log('  Tables hiện có:', tables);
  tables.includes('users')  ? PASS('Table "users" tồn tại')  : FAIL('Table "users" KHÔNG tồn tại');
  tables.includes('events') ? PASS('Table "events" tồn tại') : FAIL('Table "events" KHÔNG tồn tại');

  // ─── [2] Đếm rows ──────────────────────────────────────
  HEAD('[2] Đếm số rows');
  const userCount = await User.count();
  const eventCount = await Event.count();
  console.log(`  Users:  ${userCount}`);
  console.log(`  Events: ${eventCount}`);
  userCount > 0 ? PASS(`Có ${userCount} user trong DB`) : FAIL('Không có user nào trong DB');
  eventCount > 0 ? PASS(`Có ${eventCount} event trong DB`) : FAIL('Không có event nào trong DB');

  // ─── [3] Kiểm tra schema User ───────────────────────────────
  HEAD('[3] Kiểm tra schema User');
  const user = await User.findOne({ raw: true });
  if (user) {
    console.log('  Sample user row:');
    console.log('  ', JSON.stringify(user, null, 2).replace(/\n/g, '\n  '));
    user.full_name ? PASS('Có trường full_name') : FAIL('Thiếu trường full_name');
    user.email ? PASS('Có trường email') : FAIL('Thiếu trường email');
    user.password_hash ? PASS('Có trường password_hash') : FAIL('Thiếu trường password_hash');
    !user.password ? PASS('Không lưu plain password') : FAIL('⚠️ Đang lưu plain password!');
  } else {
    FAIL('Không tìm được user để kiểm tra schema');
  }

  // ─── [4] Kiểm tra schema Event ──────────────────────────────
  HEAD('[4] Kiểm tra schema Event');
  const events = await Event.findAll({ raw: true, limit: 10 });
  if (events.length > 0) {
    events.forEach((ev, i) => {
      console.log(`\n  Event #${i + 1}:`);
      console.log('  ', JSON.stringify(ev, null, 2).replace(/\n/g, '\n  '));
    });
    const ev0 = events[0];
    ev0.user_id ? PASS('Có trường user_id (ref User)') : FAIL('Thiếu user_id');
    ev0.title ? PASS('Có trường title') : FAIL('Thiếu title');
    ev0.type ? PASS(`type hợp lệ: "${ev0.type}"`) : FAIL('Thiếu type');
    ev0.event_date ? PASS(`event_date: ${ev0.event_date}`) : FAIL('Thiếu event_date');
    ev0.start_time ? PASS(`start_time: ${ev0.start_time}`) : FAIL('Thiếu start_time');
    ev0.end_time ? PASS(`end_time: ${ev0.end_time}`) : FAIL('Thiếu end_time');
  } else {
    FAIL('Không có event để kiểm tra');
  }

  // ─── [5] Kiểm tra deadline fields ─────────────────────
  HEAD('[5] Kiểm tra fields Deadline');
  const deadline = await Event.findOne({ where: { type: 'deadline' }, raw: true });
  if (deadline) {
    console.log('  Deadline event:', deadline.title);
    deadline.deadline_due_datetime ? PASS('Có deadline_due_datetime') : FAIL('Thiếu deadline_due_datetime');
    ['low', 'medium', 'high'].includes(deadline.deadline_priority) ? PASS(`priority hợp lệ: "${deadline.deadline_priority}"`) : FAIL('priority không hợp lệ');
    const rawCompleted = deadline.deadline_is_completed;
    const isBooleanLike = [true, false, 1, 0, '1', '0'].includes(rawCompleted);
    isBooleanLike
      ? PASS(`is_completed: ${rawCompleted === true || rawCompleted === 1 || rawCompleted === '1'}`)
      : FAIL('is_completed không phải boolean-like');
  } else {
    console.log('  ⚠️  Không có event type=deadline để test (bỏ qua)');
  }

  // ─── [6] Kiểm tra event type=hoc KHÔNG có deadline ─────────
  HEAD('[6] Kiểm tra event "hoc" không có deadline fields');
  const hocEv = await Event.findOne({ where: { type: 'hoc' }, raw: true });
  if (hocEv) {
    (hocEv.deadline_due_datetime === null || hocEv.deadline_due_datetime === undefined) ? PASS('"hoc" event có deadline = null (đúng)') : FAIL('"hoc" event không được có deadline');
  } else {
    console.log('  ⚠️  Không có event type=hoc để test (bỏ qua)');
  }

  // ─── [7] Kiểm tra index ─────────────────────────────────────
  HEAD('[7] Kiểm tra Indexes trên table "events"');
  let indexes = [];
  try { indexes = await sequelize.getQueryInterface().showIndex('events'); } catch (e) { /* ignore */ }
  console.log('  Indexes:');
  indexes.forEach((idx) => console.log(`    - ${JSON.stringify(idx.fields || idx)}`));
  const hasCompound = indexes.some((i) => (i.fields || []).some(f => f.attribute === 'user_id') && (i.fields || []).some(f => f.attribute === 'event_date'));
  hasCompound ? PASS('Có compound index {user_id, event_date}') : FAIL('Thiếu compound index {user_id, event_date}');

  // ─── [8] Kiểm tra unique email ──────────────────────────────
  HEAD('[8] Kiểm tra unique constraint trên email');
  try {
    const existingUser = await User.findOne({ raw: true });
    if (existingUser) {
      await User.create({ full_name: 'Duplicate', email: existingUser.email, password_hash: 'xxx' });
      FAIL('Cho phép email trùng — unique constraint KHÔNG hoạt động!');
    }
  } catch (e) {
    const name = e.name || '';
    name.includes('UniqueConstraint') ? PASS('Unique email constraint hoạt động đúng') : FAIL(`Lỗi không mong đợi: ${e.message || e}`);
  }

  // ─── Kết thúc ────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('✅ DB Test hoàn tất!');
  console.log('═'.repeat(55) + '\n');
  await sequelize.close();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err.message || err);
  process.exit(1);
});
