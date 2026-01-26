# Banking System Web App 🏦

A modern banking system simulation built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Firebase**.

This project demonstrates real-world fintech concepts such as authentication, protected routes, per-user data storage, transaction handling, and responsive UI design.

---

## 🚀 Features

- User registration & login (Firebase Authentication)
- Protected dashboard routes
- Account balance management
- Deposit & withdrawal functionality
- Transaction history (mini statement)
- Per-user data persistence with Firestore
- Mobile-first responsive design
- Clean and scalable project structure

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS
- **Backend / BaaS:** Firebase
- **Authentication:** Firebase Auth
- **Database:** Firebase Firestore
- **Deployment:** Vercel (ready)

---

## 📂 Project Structure

src/
├── app/
│ ├── login/
│ ├── register/
│ ├── dashboard/
│ └── layout.tsx
├── components/
│ └── Navbar.tsx
├── lib/
│ └── firebase.ts
└── styles/

yaml
Copy code

---

## 🔐 Authentication Flow

- Users register or login using email & password
- Firebase Authentication manages sessions
- Unauthenticated users are redirected to login
- Each user has isolated banking data

---

## 📊 Firestore Data Model

users
└── userId
├── balance
├── createdAt

transactions
└── transactionId
├── userId
├── type
├── amount
├── date

yaml
Copy code

---

## ▶️ Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/your-repo-name.git
2. Install dependencies
bash
Copy code
npm install
3. Add Firebase config
Create .env.local and add your Firebase keys.

4. Run locally
bash
Copy code
npm run dev
⚠️ Disclaimer
This is a banking system simulation built for learning and portfolio purposes.
No real financial transactions are processed.

📌 Future Improvements
Money transfer between users

Admin dashboard

Charts & analytics

Firestore security rules hardening

Dark mode

👨‍💻 Author
Clement Simeon
Built as a real-world fintech portfolio project.

yaml
Copy code

---

## ✅ Other VERY IMPORTANT Things to Add to Your Repo

### 1️⃣ `.gitignore`
Make sure it includes:
.env.local
node_modules
.next

yaml
Copy code

⚠️ **Never push Firebase keys to GitHub**

---

### 2️⃣ Environment Variables Example
Create:
