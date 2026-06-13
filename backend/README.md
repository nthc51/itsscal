# Calendar BE — MongoDB

## Cài đặt

```bash
npm install
cp .env.example .env
# Điền MONGO_URI vào .env
```

**MongoDB Atlas (cloud):**
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/calendar_db
```

**MongoDB local:**
```
MONGO_URI=mongodb://localhost:27017/calendar_db
```

## Chạy

```bash
npm run dev   # development
npm start     # production
```

---

## API Endpoints

### Auth — `/api/auth`

| Method | URL | Body |
|--------|-----|------|
| POST | `/api/auth/register` | `{ full_name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | — |
| POST | `/api/auth/refresh-token` | _(cookie)_ |

### Event — `/api/event` *(cần Bearer token)*

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/event` | Tạo sự kiện |
| GET | `/api/event` | Toàn bộ sự kiện |
| GET | `/api/event/today` | Việc hôm nay |
| GET | `/api/event/deadlines` | Deadline sắp đến |
| GET | `/api/event/month?year=2025&month=6` | Lịch tháng |
| GET | `/api/event/week?week_start=2025-06-02&week_end=2025-06-08` | Lịch tuần |
| GET | `/api/event/:id` | Chi tiết sự kiện |
| PUT | `/api/event/:id` | Cập nhật sự kiện |
| DELETE | `/api/event/:id` | Xóa sự kiện |
| PATCH | `/api/event/:id/complete` | Đánh dấu deadline hoàn thành |
| PATCH | `/api/event/:id/priority` | `{ priority: "high" }` |

---

## Body mẫu tạo sự kiện

```json
{
  "title": "Học Toán",
  "description": "Ôn chương 3",
  "type": "hoc",
  "tag_label": "Toán cao cấp",
  "event_date": "2025-06-10",
  "start_time": "08:00",
  "end_time": "10:00",
  "location": "Phòng A101"
}
```

```json
{
  "title": "Nộp bài tập lớn",
  "type": "deadline",
  "event_date": "2025-06-15",
  "start_time": "22:00",
  "end_time": "23:59",
  "priority": "high"
}
```

> `type` nhận: `hoc` | `deadline` | `lam_them`  
> Khi `type = "deadline"` → trường `deadline` được tự động tạo trong document.  
> Nếu trùng lịch → **HTTP 409** kèm tên event bị trùng.

---

## Test bằng curl

```bash
# 1. Đăng ký
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Nguyen Van A","email":"a@test.com","password":"123456"}'

# 2. Đăng nhập — copy token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"123456"}'

# 3. Tạo event
curl -X POST http://localhost:5000/api/event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Học Toán","type":"hoc","event_date":"2025-06-10","start_time":"08:00","end_time":"10:00"}'

# 4. Test trùng lịch (cùng ngày, giờ đè lên)
curl -X POST http://localhost:5000/api/event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Học Lý","type":"hoc","event_date":"2025-06-10","start_time":"09:00","end_time":"11:00"}'
# → HTTP 409: Trùng lịch với: "Học Toán" (08:00 - 10:00)

# 5. Deadline sắp đến (sort gần nhất lên đầu)
curl http://localhost:5000/api/event/deadlines \
  -H "Authorization: Bearer <token>"
```
