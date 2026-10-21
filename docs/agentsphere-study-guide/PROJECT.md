# 💸 Hisaab — Expense Sharing & Splitting App

> *"Hisaab"* (हिसाब) — Hindi for **"account"** or **"calculation"**.  
> A full-stack mobile application to track, split, and settle shared expenses with friends and groups.

---

## 📌 Overview

**Hisaab** is a cross-platform expense-splitting application built for friend groups, travel buddies, roommates, and anyone who shares costs. Users can add expenses, split them equally or unequally, and let the app compute the minimal set of transactions needed to settle all debts — no mental math required.

The app runs as a **React Native (Expo)** mobile client backed by a **Node.js + Express** REST API and a **MongoDB** database.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 👥 **Friends Management** | Add and manage people you split expenses with |
| 📁 **Group Support** | Organize expenses by trip, event, or shared household |
| 💰 **Expense Tracking** | Log expenses with payer, participants, and amount |
| ⚖️ **Equal & Unequal Splits** | Support both equal splits and custom amount splits |
| 📊 **Smart Settlements** | Greedy algorithm minimizes the number of transactions to settle all debts |
| 🗂️ **Journey Archive** | Archive and review past trips/events with full expense history |
| 🌓 **Dark & Light Mode** | Automatically adapts to the device's system theme |
| ☁️ **Cloud Sync** | All data persisted in MongoDB — synced across devices |
| 📱 **Mobile-first UI** | Built with React Native Paper (Material Design) for a polished experience |

---

## 🛠️ Tech Stack

### Frontend — React Native (Expo)

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.37 | Cross-platform build & dev tooling |
| `react` | 19.1.0 | UI library |
| `react-native` | 0.81.5 | Mobile framework |
| `react-native-paper` | ^5.14.5 | Material Design component library |
| `@react-navigation/native` | ^6.1.18 | Navigation container |
| `@react-navigation/stack` | ^6.4.1 | Stack-based screen navigation |
| `@react-navigation/bottom-tabs` | ^6.6.1 | Bottom tab bar navigation |
| `@react-native-async-storage/async-storage` | 2.2.0 | Local data persistence |
| `axios` | — | HTTP client for API calls |
| `expo-crypto` | ~15.0.9 | Cryptographic utilities |
| `@expo/vector-icons` | ^15.0.3 | Icon library |

### Backend — Node.js + Express

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19.2 | Web framework & REST API |
| `mongoose` | ^9.1.5 | MongoDB ODM |
| `mongodb` | ^7.0.0 | MongoDB driver |
| `body-parser` | ^1.20.2 | Request body parsing |
| `cors` | ^2.8.5 | Cross-origin resource sharing |
| `dotenv` | ^17.2.3 | Environment variable management |

---

## 📂 Project Structure

```
Hisaab/
├── package.json              # Root runner (concurrently starts server + client)
│
├── client/                   # React Native mobile app (Expo)
│   ├── src/
│   │   ├── context/          # React Context providers (global state)
│   │   ├── navigation/       # React Navigation configuration
│   │   ├── screens/          # Individual app screens (see below)
│   │   └── services/         # Axios API service layer
│   ├── assets/               # Images, icons, splash screens
│   ├── App.js                # App entry point & theme setup
│   ├── app.json              # Expo app configuration
│   ├── eas.json              # EAS Build configuration
│   └── metro.config.js       # Metro bundler configuration
│
└── server/                   # Node.js REST API
    ├── models/               # Mongoose data models
    │   ├── User.js
    │   ├── Friend.js
    │   ├── Group.js
    │   ├── Expense.js
    │   └── Journey.js
    ├── db.js                 # MongoDB connection setup
    ├── logic.js              # Settlement calculation algorithm
    └── index.js              # Express server, routes & controllers
```

---

## 📱 Screens

| Screen | File | Description |
|---|---|---|
| **Home** | `HomeScreen.js` | Dashboard showing friends, balances, and summary |
| **Expenses** | `ExpensesScreen.js` | List of all recorded expenses |
| **Add Expense** | `AddExpenseScreen.js` | Form to log a new expense with split options |
| **Add Friend** | `AddFriendScreen.js` | Add a person to your friends list |
| **Add Person** | `AddPersonScreen.js` | Add a new person to the system |
| **Add Group** | `AddGroupScreen.js` | Create a new group |
| **Groups** | `GroupsScreen.js` | View and manage groups |
| **Settlement** | `SettlementScreen.js` | View calculated settlement transactions |
| **Activity** | `ActivityScreen.js` | Activity log / expense history |
| **Journey Detail** | `JourneyDetailScreen.js` | View archived journey details |

---

## 🧮 Settlement Algorithm

The core settlement logic lives in `server/logic.js`. It uses a **greedy creditor-debtor algorithm** to minimize the total number of payment transactions:

1. **Balance Calculation** — For every expense, the payer is credited the full amount, and each beneficiary is debited their share (equal or custom).
2. **Split into Creditors & Debtors** — People with a positive balance are *creditors* (owed money); negative balance means *debtor* (owes money).
3. **Sort & Settle** — Both lists are sorted by amount descending. The largest debtor pays the largest creditor, with the smaller of the two amounts being settled. This repeats until all balances reach zero.

**Supports:**
- ✅ **Equal split** — amount divided evenly among all beneficiaries
- ✅ **Unequal split** — custom amounts per person stored in the `splits` map

---

## 🔌 API Reference

**Base URL:** `http://localhost:5000`

### Users
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/user/init` | Initialize a user session |

### People & Friends
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/people` | Get all people |
| `POST` | `/api/people` | Add a person |
| `GET` | `/api/friends` | Get friends list |
| `POST` | `/api/friends` | Add a friend |
| `DELETE` | `/api/friends/:id` | Remove a friend |

### Groups
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/groups` | Get all groups |
| `POST` | `/api/groups` | Create a group |
| `DELETE` | `/api/groups/:id` | Delete a group |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/expenses` | Get all expenses |
| `POST` | `/api/expenses` | Add an expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |

### Settlements & Journeys
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settlement` | Calculate & return settlement transactions |
| `GET` | `/api/journeys` | Get all archived journeys |
| `POST` | `/api/journeys/archive` | Archive the current active journey |
| `DELETE` | `/api/journeys/:id` | Delete a journey |

---

## 🗄️ Data Models

### `User`
Stores the device user identifier for session management.

### `Friend`
Represents a person in the user's friend list with a name field.

### `Group`
A named collection of people for group expense tracking.

### `Expense`
Stores expense details: `payer`, `amount`, `beneficiaries[]`, `splitType` (`equal` | `unequal`), and `splits` map for custom amounts.

### `Journey`
An archived snapshot of a completed trip/event — includes all associated expenses and settlement history for future reference.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **MongoDB** (Atlas cloud or local instance)
- **Expo Go** app on your mobile device (for physical device testing)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mohityadav55199/Hisaab.git
cd Hisaab

# 2. Install root dependencies
npm install

# 3. Install server dependencies
cd server && npm install && cd ..

# 4. Install client dependencies
cd client && npm install && cd ..
```

### Environment Setup

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hisaab
```

### Running the App

```bash
# Start both server & client simultaneously
npm run dev
```

| Service | URL |
|---|---|
| Backend API | `http://localhost:5000` |
| Web App (Expo) | `http://localhost:8081` |

> **Mobile Demo Tip:** Open `http://localhost:8081` in Chrome, press **F12**, then **Ctrl + Shift + M** to toggle device emulation (e.g., iPhone 14 Pro, Pixel 7).

---

## 👨‍💻 Author

**Mohit Yadav**
- GitHub: [@mohityadav55199](https://github.com/mohityadav55199)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">Made with ❤️ for effortless expense splitting</p>
