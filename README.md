# Branch Sentry

Branch Sentry is a comprehensive, full-stack application designed to track, log, and manage operational issues across multiple bank branches in real-time. It features an AI-powered chatbot for natural language queries and a highly configurable automated reporting system.

## ✨ Features

- **Real-Time Database:** Built on Firestore, all data for branches and issues updates instantly across the application.
- **AI Chatbot:** An integrated AI assistant (powered by Genkit) that allows users to query branch and issue data using natural language.
- **User Authentication:** Secure user signup and login system with an approval process for new accounts.
- **Automated Reporting:** A cron-job-powered system that sends daily summaries of open issues to configured channels, with customizable templates for each team.
- **Dynamic Filtering & Sorting:** All tables include robust options for searching, filtering, and sorting data.
- **CRUD Operations:** Full capabilities to create, read, update, and delete branches and issues.
- **Bulk Upload:** Easily import a list of branches from a CSV file.
- **Clone Issues:** Quickly duplicate an existing issue to streamline the process of logging recurring problems.
- **Modern UI/UX:** A responsive interface built with ShadCN UI and Tailwind CSS, featuring skeleton loaders for a smooth user experience and support for both dark and light modes.

## 🚀 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 15 (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Database:** [Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Generative AI:** [Google's Genkit](https://firebase.google.com/docs/genkit)
- **Forms:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation

## 🏁 Getting Started

### Prerequisites

- Node.js and npm (or a compatible package manager)
- A Firebase project with Firestore and Authentication enabled.
- A Gemini API Key for the AI features.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```

2.  Navigate to the project directory:
    ```bash
    cd <project-directory>
    ```

3.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env.local` file in the root of the project and add the following environment variables:

```env
# Required for Genkit AI features
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Required for the notification service
NOTIFY_API_KEY="YOUR_NOTIFY_SERVICE_API_KEY"
```

You will also need to update the Firebase configuration in `src/lib/firebase.ts` with your own project's credentials.

### Running the Application

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
