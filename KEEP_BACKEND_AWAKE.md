# Giữ Backend Luôn Awake (Miễn Phí)

## Vấn đề

- Render Free tier đưa backend vào "sleep mode" sau 15 phút không hoạt động
- Lần đầu truy cập sau khi ngủ mất 20-30 giây (cold start)

## Giải pháp: UptimeRobot (100% Miễn Phí)

### Bước 1: Tạo tài khoản UptimeRobot

1. Truy cập: https://uptimerobot.com
2. Click **"Get Started for Free"**
3. Đăng ký với email

### Bước 2: Tạo Monitor

1. Đăng nhập → Click **"+ Add New Monitor"**
2. Điền thông tin:

**Monitor Type:** HTTP(s)

**Friendly Name:** Project Showcase Backend

**URL (or IP):**

```
https://project-showcase-tg3m.onrender.com/api/projects
```

**Monitoring Interval:** Every 5 minutes (free tier)

3. Click **"Create Monitor"**

### Bước 3: Hoàn tất

✅ Xong! UptimeRobot sẽ tự động ping backend mỗi 5 phút.

Backend sẽ không bao giờ ngủ → Không còn cold start 30s!

## Kết quả

- ✅ Người dùng vào website **luôn nhanh**
- ✅ Không tốn tiền (100% miễn phí)
- ✅ Email thông báo nếu backend down
- ✅ Uptime monitoring dashboard

## Chi phí so sánh

| Phương án    | Chi phí  | Cold Start     |
| ------------ | -------- | -------------- |
| UptimeRobot  | $0/tháng | Không có       |
| Render Paid  | $7/tháng | Không có       |
| Không làm gì | $0/tháng | 20-30s lần đầu |

## Lưu ý

- UptimeRobot free cho phép tạo tối đa 50 monitors
- Ping interval tối thiểu là 5 phút (đủ để giữ backend awake)
- Có thể thêm email alerts để biết khi backend down
