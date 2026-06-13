const mysql = require('mysql2/promise');

const DB = {
  host: 'localhost', port: 3306,
  user: 'root', password: 'Vanthe@12345',
};

async function run() {
  // 1. Connect without database to create it
  const root = await mysql.createConnection(DB);
  console.log('✅ Connected to MySQL');

  await root.execute('CREATE DATABASE IF NOT EXISTS itss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('✅ Database itss ready');
  await root.end();

  // 2. Connect to itss
  const conn = await mysql.createConnection({ ...DB, database: 'itss' });

  // 3. Create tables
  await conn.execute('DROP TABLE IF EXISTS events');
  await conn.execute('DROP TABLE IF EXISTS users');

  await conn.execute(`
    CREATE TABLE users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(256) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table users created');

  await conn.execute(`
    CREATE TABLE events (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      title VARCHAR(256) NOT NULL,
      description TEXT NULL,
      type ENUM('hoc','deadline','lam_them','holiday') NOT NULL,
      tag_label VARCHAR(100) DEFAULT '',
      event_date VARCHAR(10) NOT NULL,
      start_time VARCHAR(8) NOT NULL,
      end_time VARCHAR(8) NOT NULL,
      location VARCHAR(256) DEFAULT '',
      recurrence_series_id INT UNSIGNED NULL,
      recurrence_frequency ENUM('none','daily','weekly','monthly') NOT NULL DEFAULT 'none',
      recurrence_interval INT UNSIGNED NOT NULL DEFAULT 1,
      recurrence_until_date VARCHAR(10) NULL,
      recurrence_group_key VARCHAR(64) NULL,
      deadline_due_datetime DATETIME NULL,
      deadline_priority ENUM('low','medium','high') NULL,
      deadline_is_completed BOOLEAN DEFAULT FALSE,
      deadline_completed_at DATETIME NULL,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      INDEX idx_user_date (user_id, event_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Table events created (with holiday ENUM)');

  // 4. Seed users (password = 123456)
  await conn.execute(`
    INSERT INTO users (full_name, email, password_hash) VALUES
      ('Nguyen Van Demo', 'demo@itss.com', '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy'),
      ('Nguyen Thi An',  'an@seed.com',   '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy'),
      ('Tran Van Binh',  'binh@seed.com', '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy')
  `);
  console.log('✅ Users seeded  (password: 123456)');

  // 5. Seed events for user 1 (demo)
  await conn.execute(`
    INSERT INTO events (user_id, title, description, type, tag_label, event_date, start_time, end_time, location, deadline_due_datetime, deadline_priority, deadline_is_completed)
    VALUES
      (1,'Giải tích - Chương 5: Tích phân','Ôn tập tích phân bất định','hoc','Toán','2026-06-13','07:30','09:30','Phòng A101',NULL,NULL,FALSE),
      (1,'Lập trình Web - React & TypeScript','Bài 8: Hooks nâng cao','hoc','CNTT','2026-06-13','13:00','15:00','Lab B204',NULL,NULL,FALSE),
      (1,'Vật lý - Điện từ trường','Chương 4: Cảm ứng điện từ','hoc','Vật lý','2026-06-14','09:00','11:00','Phòng C102',NULL,NULL,FALSE),
      (1,'Nộp báo cáo ITSS - Sprint 3','Deadline nộp báo cáo cuối Sprint 3 lên Moodle','deadline','ITSS','2026-06-14','23:00','23:59','Online - Moodle','2026-06-14 16:00:00','high',FALSE),
      (1,'Họp nhóm ITSS - Review code','Review pull request, phân công task tuần sau','hoc','ITSS','2026-06-15','14:00','16:00','Online - Google Meet',NULL,NULL,FALSE),
      (1,'Bài tập lớn Vật lý','Nộp bài tập lớn về điện tử - 10 bài toán','deadline','Vật lý','2026-06-16','23:00','23:59','Email giảng viên','2026-06-16 16:00:00','medium',FALSE),
      (1,'Thi cuối kỳ - Giải tích','Thi viết, được dùng tài liệu A4 1 tờ','deadline','Toán','2026-06-18','07:00','09:00','Hội trường A','2026-06-18 00:00:00','high',FALSE),
      (1,'Làm thêm - Quán cà phê','Ca sáng, mở cửa 6h30','lam_them','','2026-06-18','07:00','11:00','The Coffee House','2026-06-18 11:00:00',NULL,FALSE),
      (1,'Kiểm tra giữa kỳ - Mạng máy tính','Trắc nghiệm 40 câu','hoc','Mạng','2026-06-20','13:00','14:30','Phòng B301',NULL,NULL,FALSE),
      (1,'Giải tích - Chương 6: Phương trình vi phân','Lý thuyết + bài tập','hoc','Toán','2026-06-20','07:30','09:30','Phòng A101',NULL,NULL,FALSE),
      (1,'Nộp project cuối khoá - ITSS2','Deadline cuối cùng nộp toàn bộ source code, báo cáo','deadline','ITSS','2026-06-23','23:00','23:59','Online - GitHub + Moodle','2026-06-23 23:59:00','high',FALSE),
      (1,'Tiếng Anh - Speaking Practice','Luyện nói chủ đề Technology','hoc','Anh văn','2026-06-12','15:00','16:00','Phòng D205',NULL,NULL,FALSE),
      (1,'Ôn tập Giải tích - Nhóm học','Giải đề thi các năm trước','hoc','Toán','2026-06-16','19:00','21:30','Thư viện tầng 3',NULL,NULL,FALSE),
      (1,'Làm thêm - Gia sư Toán lớp 10','Dạy học sinh ôn thi THPT','lam_them','','2026-06-21','08:00','10:00','Nhà học sinh','2026-06-21 10:00:00',NULL,FALSE),
      (1,'Ngủ','Nghỉ ngơi sau kỳ thi','hoc','','2026-06-15','10:05','12:00','Nhà',NULL,NULL,FALSE),
      (1,'Tết Thiếu Nhi','Ngày lễ quốc tế thiếu nhi','holiday','Ngày lễ','2026-06-01','00:00','23:59','',NULL,NULL,FALSE),
      (1,'Ngày thành lập Đoàn TNCS HCM','Kỷ niệm ngày thành lập Đoàn','holiday','Ngày lễ','2026-03-26','00:00','23:59','',NULL,NULL,FALSE)
  `);
  console.log('✅ Events seeded (including holiday examples)');

  const [ev] = await conn.execute('SELECT COUNT(*) as c FROM events WHERE user_id=1');
  console.log(`✅ Total events for demo user: ${ev[0].c}`);

  await conn.end();
  console.log('\n🎉 Setup complete! Login: demo@itss.com / 123456');
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
