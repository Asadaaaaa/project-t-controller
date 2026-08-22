# ProjectT Controller

REST API backend service for ProjectT built with Node.js, Express, and Sequelize ORM (MySQL).

## 🚀 Features

- **RBAC Middleware**: Fine-grained role and permission validation for all endpoints.
- **AI Daily Summary Engine**: Powered by Google Gemini (`gemini-3.7-flash` primary) with Multi-Key Rotation and Multi-Model Fallback Chain for 99.9% uptime and zero quota limits.
- **WhatsApp Web Integration**: Internal webhooks and on-demand synchronization for WhatsApp chats and messages.
- **User & Session Scoping**: Multi-tenant isolation per user for WhatsApp sessions, chat history, summaries, and action items.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your database credentials and `GEMINI_API_KEY` (supports comma-separated keys for auto-rotation).

### Running
```bash
npm start
# or development
npm run dev
```
