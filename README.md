# 🚀 Project Showcase

A modern, full-stack portfolio showcase web application built with React, Express, and MongoDB. Display and manage your projects beautifully with a responsive, user-friendly interface.

![Project Showcase](https://img.shields.io/badge/Status-Live-brightgreen) ![React](https://img.shields.io/badge/React-19.2.0-blue) ![Node](https://img.shields.io/badge/Node-Express-green) ![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)

## 🌐 Live Demo

**Frontend**: [https://project-showcase-phi.vercel.app](https://project-showcase-phi.vercel.app)  
**Backend API**: [https://project-showcase-tg3m.onrender.com](https://project-showcase-tg3m.onrender.com)

## ✨ Features

- 📱 **Fully Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎨 **Modern UI/UX** - Clean and intuitive interface with smooth animations
- 🔍 **Search & Filter** - Find projects quickly by category or keywords
- 📄 **Pagination** - Browse through projects with easy navigation
- ➕ **CRUD Operations** - Add, edit, and delete projects with modal forms
- 🖼️ **Image Upload** - Support both URL and file upload (max 5MB)
- ⚡ **Fast Loading** - Optimized performance with retry logic for API calls
- 🔄 **Auto-deployment** - Automatic deployment on push to GitHub

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.0 - UI library
- **Vite** 7.3.1 - Build tool
- **Axios** 1.13.6 - HTTP client
- **SCSS** - Styling with responsive mixins
- **Bootstrap Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express** 5.2.1 - Web framework
- **MongoDB** 9.2.4 - Database driver
- **Mongoose** - ODM for MongoDB
- **CORS** 2.8.6 - Cross-origin resource sharing
- **dotenv** 17.3.1 - Environment variables management

### Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend hosting (Free tier)
- **MongoDB Atlas** - Cloud database

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

### Backend Setup

1. Navigate to Backend folder:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=development
```

4. (Optional) Migrate sample data:
```bash
node migrate.js
```

5. Start the server:
```bash
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to Frontend folder:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `src/Services/api.js` if needed:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // For local development
  // baseURL: 'https://project-showcase-tg3m.onrender.com/api', // For production
  timeout: 60000,
});
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 🗂️ Project Structure

```
Project_Son/Show-case/
├── Backend/
│   ├── models/
│   │   └── Project.js          # MongoDB schema
│   ├── data/
│   │   └── projects.json       # Sample data
│   ├── server.js               # Express server
│   ├── migrate.js              # Data migration script
│   ├── testMongo.js            # MongoDB connection test
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── Component/
│   │   │   ├── Navbar/         # Navigation component
│   │   │   ├── Hero-section/   # Hero banner
│   │   │   ├── About/          # About section
│   │   │   └── Project/        # Project components
│   │   │       ├── index.jsx   # Main project component
│   │   │       ├── Project-list/ # Project grid
│   │   │       └── AddProjectModal/ # Add/Edit modal
│   │   ├── Services/
│   │   │   └── api.js          # Axios configuration
│   │   ├── Style/
│   │   │   └── mixin.scss      # SCSS mixins
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create new project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Request Body Example (POST/PUT)
```json
{
  "title": "My Awesome Project",
  "description": "A brief description",
  "category": "Technical",
  "techStack": ["React", "Node.js", "MongoDB"],
  "image": "https://example.com/image.jpg",
  "githubLink": "https://github.com/username/repo",
  "liveDemoLink": "https://demo.example.com"
}
```

## 🚀 Deployment

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
   - `MONGODB_URI`
   - `NODE_ENV=production`

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `Frontend`
3. Vercel will auto-detect Vite configuration
4. Deploy!

Auto-deployment is enabled - push to `main` branch triggers automatic updates.

## 📱 Responsive Breakpoints

- **Desktop**: > 1024px (3 column grid)
- **Tablet**: 768px - 1024px (2 column grid)
- **Mobile**: < 768px (1 column grid)

## ⚠️ Important Notes

- **Free Tier Sleep**: Render Free tier sleeps after 15 minutes of inactivity. First load may take 20-30 seconds.
- **Image Size Limit**: Maximum 5MB for file uploads. For larger images, use image URLs instead.
- **Payload Limit**: Backend supports up to 10MB payload for base64-encoded images.
- **MongoDB Atlas**: May require DNS configuration (8.8.8.8, 1.1.1.1) on some networks.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Ta Quang Tuan**
- GitHub: [@QuangTuan30009](https://github.com/QuangTuan30009)
- Project Repository: [Project_Showcase](https://github.com/QuangTuan30009/Project_Showcase)

## 🙏 Acknowledgments

- Icons by [Bootstrap Icons](https://icons.getbootstrap.com/)
- Deployed with [Vercel](https://vercel.com) and [Render](https://render.com)
- Database hosted on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

Made with ❤️ by Ta Quang Tuan
