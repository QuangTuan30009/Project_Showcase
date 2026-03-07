# Backend Deployment Guide - Render

## Bước 1: Tạo tài khoản Render

1. Truy cập: https://render.com
2. Đăng ký tài khoản (có thể dùng GitHub)

## Bước 2: Deploy Backend

1. Vào Dashboard → Click **"New +"** → Chọn **"Web Service"**
2. Kết nối với GitHub repository: **QuangTuan30009/Project_Showcase**
3. Cấu hình như sau:

### Basic Settings:

- **Name:** `project-showcase-backend` 
- **Region:** Singapore (gần VN nhất) hoặc Oregon
- **Branch:** `main`
- **Root Directory:** `Backend`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Environment Variables (rất quan trọng):

Click **"Advanced"** → Add Environment Variables:

```
MONGODB_URI=mongodb+srv://taquangtuan2016_db_user:Cm4i7KHfACc93oq7@cluster0.oy8uqyp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

PORT=5000

NODE_ENV=production
```

### Instance Type:

- Chọn **"Free"** (miễn phí, đủ dùng)

4. Click **"Create Web Service"**
5. Đợi 3-5 phút để Render build và deploy

## Bước 3: Lấy URL Backend

Sau khi deploy xong, bạn sẽ có URL dạng:

```
https://project-showcase-backend.onrender.com
```

## Bước 4: Test Backend API

Mở trình duyệt và test:

```
https://your-backend-url.onrender.com/api/projects
```

Nếu thấy JSON data → Thành công! ✅

## Bước 5: Cập nhật Frontend

Cập nhật file `Frontend/src/Services/api.js`:

```javascript
const API_URL = "https://your-backend-url.onrender.com/api";
```

## Lưu ý:

- Free tier của Render sẽ "ngủ" sau 15 phút không hoạt động
- Lần đầu truy cập sau khi ngủ sẽ mất ~30 giây để "thức dậy"
- Tự động deploy mỗi khi push code lên GitHub
