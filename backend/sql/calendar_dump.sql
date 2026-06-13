-- Schema + seed for Calendar app (MySQL)
-- Generated for import into MySQL Workbench
-- Run in Workbench or via: mysql -u user -p calendar < calendar_dump.sql

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(256) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(256) NOT NULL,
  description TEXT DEFAULT '',
  type ENUM('hoc','deadline','lam_them') NOT NULL,
  tag_label VARCHAR(100) DEFAULT '',
  event_date VARCHAR(10) NOT NULL,
  start_time VARCHAR(8) NOT NULL,
  end_time VARCHAR(8) NOT NULL,
  location VARCHAR(256) DEFAULT '',
  deadline_due_datetime DATETIME NULL,
  deadline_priority ENUM('low','medium','high') NULL,
  deadline_is_completed BOOLEAN DEFAULT FALSE,
  deadline_completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_user_date (user_id, event_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed users (password = 123456)
INSERT INTO users (full_name, email, password_hash) VALUES
  ('Nguyen Thi An', 'an@seed.com', '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy'),
  ('Tran Van Binh', 'binh@seed.com', '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy'),
  ('Le Thi Chi', 'chi@seed.com', '$2b$10$6Z7CF5WYo.X.j7WCPoz4yOSIJx4Qhra8vE9D.cEb0HR6.Lz4lkQZy');

-- Get user IDs for inserts
-- (When importing in Workbench you can run following selects to find IDs.)

-- Seed events
INSERT INTO events (user_id, title, description, type, tag_label, event_date, start_time, end_time, location, deadline_due_datetime, deadline_priority, deadline_is_completed, deadline_completed_at)
VALUES
  -- AN
  (1, 'Học Giải tích', 'Ôn tập chương 5: Tích phân', 'hoc', 'Toán cao cấp', '2026-06-02', '07:30', '09:30', 'Phòng A101', NULL, NULL, NULL, NULL),
  (1, 'Học Lập trình Python', 'Bài 12: OOP nâng cao', 'hoc', 'CNTT', '2026-06-03', '13:00', '15:00', 'Lab B204', NULL, NULL, NULL, NULL),
  (1, 'Nộp báo cáo thực tập', 'Nộp qua email giảng viên hướng dẫn', 'deadline', '', '2026-06-10', '23:00', '23:59', '', '2026-06-10 16:59:00', 'high', FALSE, NULL),
  (1, 'Thi cuối kỳ Vật lý', 'Mang thước kẻ, máy tính Casio', 'deadline', '', '2026-06-20', '07:00', '09:00', 'Hội trường C', '2026-06-20 00:00:00', 'high', FALSE, NULL),
  (1, 'Họp nhóm đồ án', 'Phân công task sprint 3', 'hoc', 'Đồ án môn học', '2026-06-05', '18:00', '20:00', 'Online - Google Meet', NULL, NULL, NULL, NULL),

  -- BINH
  (2, 'Ca sáng quán cà phê', 'Mở cửa từ 6h30, pha đồ uống', 'lam_them', '', '2026-06-02', '06:30', '11:30', 'The Coffee House - Q1', NULL, NULL, NULL, NULL),
  (2, 'Ca tối phục vụ tiệc', 'Event tiệc cưới tại nhà hàng', 'lam_them', '', '2026-06-07', '17:00', '22:00', 'Nhà hàng Bình Minh', NULL, NULL, NULL, NULL),
  (2, 'Học Tiếng Anh giao tiếp', 'Unit 8: Business English', 'hoc', 'Ngoại ngữ', '2026-06-04', '19:00', '21:00', 'Trung tâm IELTS Plus', NULL, NULL, NULL, NULL),
  (2, 'Nộp hồ sơ xin việc fulltime', '', 'deadline', '', '2026-06-15', '17:00', '17:30', '', '2026-06-15 10:00:00', 'medium', FALSE, NULL),
  (2, 'Ca sáng cuối tuần', '', 'lam_them', '', '2026-06-08', '07:00', '12:00', 'The Coffee House - Q1', NULL, NULL, NULL, NULL),

  -- CHI
  (3, 'Nộp bài tập lớn Cơ sở dữ liệu', 'ERD + SQL script + báo cáo Word', 'deadline', '', '2026-05-28', '23:00', '23:59', '', '2026-05-28 16:00:00', 'high', TRUE, '2026-05-27 14:30:00'),
  (3, 'Học Mạng máy tính', 'Chương 4: Transport Layer', 'hoc', 'Mạng máy tính', '2026-06-03', '07:30', '11:30', 'Phòng D301', NULL, NULL, NULL, NULL),
  (3, 'Làm thêm gia sư Toán', 'Dạy học sinh lớp 10', 'lam_them', '', '2026-06-06', '15:00', '17:00', 'Nhà học sinh - Q.Bình Thạnh', NULL, NULL, NULL, NULL),
  (3, 'Đăng ký học bổng', '', 'deadline', '', '2026-06-30', '17:00', '17:00', '', '2026-06-30 10:00:00', 'medium', FALSE, NULL),
  (3, 'Học Học máy (ML)', 'Lab: Linear Regression', 'hoc', 'AI/ML', '2026-06-11', '13:00', '17:00', 'Lab AI - Tầng 5', NULL, NULL, NULL, NULL);

-- End of dump
