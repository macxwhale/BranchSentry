# Branch Sentry System Architecture

## 1. Overview: The Modern Monolith

This application is architected as a **Modern Monolith**. This means that the entire application—frontend, backend logic, and API routes—resides within a single Next.js codebase. This approach simplifies development and deployment.

It is "modern" because it doesn't build every piece of functionality from scratch. Instead, it leverages powerful, managed cloud services for specialized tasks like database, authentication, and AI. This gives us the development speed of a monolith while harnessing the scalability and robustness of a microservices-like architecture.

---

## 2. Core Technologies

- **Framework:** [Next.js](https://nextjs.org/) 15 (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React](https://react.dev/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Firestore](https://firebase.google.com/docs/firestore) (real-time, NoSQL)
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Generative AI:** [Google's Genkit](https://firebase.google.com/docs/genkit)
- **Forms:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation

---

## 3. Project Structure

The codebase is organized into a `src` directory, following modern Next.js conventions.

-   `/src/app/`: This is the core of the Next.js App Router.
    -   `layout.tsx`: The root layout for the entire application.
    -   `page.tsx`: The main entry point page.
    -   `/dashboard/`: Contains all pages and layouts for the main authenticated part of the app.
        -   `layout.tsx`: The primary layout for the dashboard, including the sidebar and header.
        -   `page.tsx`: The main dashboard page displaying all branches.
        -   `/branches/[id]/page.tsx`: The detail page for a specific branch.
        -   `loading.tsx`: Skeleton loader components that are automatically shown by Next.js during data fetching.
    -   `/api/`: Contains backend API routes, such as the cron job for sending reports (`/api/cron/...`).

-   `/src/components/`: Contains all reusable React components.
    -   `/ui/`: Holds the standard, un-styled components provided by ShadCN (Button, Card, etc.).
    -   `chat.tsx`: The AI chat component.
    -   `auth-guard.tsx`: A client-side component that protects routes and redirects unauthenticated users.

-   `/src/lib/`: A folder for shared utilities, configuration, and core logic.
    -   `firebase.ts`: Initializes and exports the Firebase app instance, Firestore DB, and Auth.
    -   `firestore.ts`: Contains all functions for writing data to Firestore (add, update, delete).
    -   `notifications.ts`: Logic for sending notifications via a server action.
    -   `types.ts`: TypeScript type definitions for our main data structures (`Branch`, `Issue`).

-   `/src/hooks/`: Contains all custom React hooks.
    -   `use-collection.ts` & `use-doc.ts`: Reusable hooks for subscribing to real-time data from Firestore.
    -   `use-user.ts`: A centralized hook to get the current user's auth state and profile.

-   `/src/contexts/`: For React Context providers.
    -   `auth-context.tsx`: Manages the core Firebase Authentication state (login, logout, signup).

-   `/src/ai/`: Home for all Generative AI logic using Genkit.
    -   `genkit.ts`: Initializes and configures the global Genkit instance.
    -   `/flows/chat-flow.ts`: Defines the AI agent's logic, including the prompt, tools (functions the AI can call), and interaction flow.

---

## 4. Data Flow and State Management

-   **Real-Time Data from Firestore:** The application uses a reactive data model. Instead of manually fetching data, we use the custom `useCollection` and `useDoc` hooks to open a real-time subscription to Firestore. When data changes in the database, Firestore pushes the update to the client, and our hooks automatically update the component state, causing the UI to re-render instantly.

-   **Form State:** All forms (e.g., adding/editing a branch or issue) are managed by `react-hook-form`. A Zod schema defines the validation rules, and the `useForm` hook manages the form state, validation, and submission, which significantly cleans up the component code.

---

## 5. Authentication Flow

1.  A user lands on the `/login` page.
2.  They sign up or log in via the `auth-context.tsx`, which calls the respective Firebase Authentication functions.
3.  Upon successful login, they are redirected to `/dashboard`.
4.  The `DashboardLayout` uses the `AuthGuard` component, which in turn uses the `useUser` hook.
5.  `useUser` checks if the user's profile in the `users` collection in Firestore has the `approved: true` flag.
6.  If the user is logged in and approved, they can view the dashboard. Otherwise, they are redirected back to the `/login` page.

---

## 6. AI Integration with Genkit

The AI chatbot is powered by Genkit. The core logic is in `/src/ai/flows/chat-flow.ts`.

-   **Tools:** The AI is given "tools" which are just TypeScript functions it can decide to call. For this app, it has tools to `getBranches`, `getAllIssues`, and `logIssue`.
-   **Prompt:** A detailed prompt instructs the AI on how to behave, what its personality is, and how to use its tools to answer user questions or perform actions.
-   **Flow:** The `chatFlow` function orchestrates the process: it takes the user's query, sends it to the language model along with the available tools, and returns the model's textual response.
