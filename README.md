# 🤖 AI Interview Prep Kit

### Full-Stack Engineering Assessment — Trao

An AI-powered full-stack application that transforms a **Job Description (JD), Company Website, and Interview Timeline** into a structured, personalised interview preparation kit.

The application researches the company, extracts role requirements, generates requirement-based interview questions, creates flashcards, builds a deterministic study schedule, checks requirement coverage, and allows users to customise and practise their preparation kit.

> **Built as part of the Trao Software Engineer Full-Stack Engineering Assessment.**

---

## 🚀 Live Deployment

### 🌐 Frontend

**Live Application:**
https://trao-interview-preparation-kit.vercel.app/

### ⚙️ Backend

**Backend API:**
https://trao-interview-preparation-kit-1.onrender.com

**Health Check:**
https://trao-interview-preparation-kit-1.onrender.com/api/health

### 🗄️ Database

MongoDB Atlas

---

## 📦 GitHub Repository

**Repository:**
https://github.com/Shaluu-24/Trao-Interview-Preparation-Kit

```text
Trao-Interview-Preparation-Kit/
├── backend/
├── frontend/
└── README.md
```

---

## 🎯 Project Overview

The **AI Interview Prep Kit** helps candidates prepare for interviews without manually researching multiple sources.

The user provides:

* 📄 Job Description
* 🌐 Company Website
* 📅 Number of days available before the interview

The application then generates:

* 🏢 Company Brief
* 💼 Role Breakdown
* 💻 Categorised Interview Questions
* 🃏 Flashcards
* 📅 Day-by-Day Study Schedule
* 📊 Requirement Coverage Analysis

The generated kit can then be edited, reordered, regenerated and practised inside the application.

---

## ✨ Features

### 🔐 Authentication

* Secure user registration
* Login and logout
* Session-based authentication
* Protected API endpoints
* User-specific interview kits
* Users can access only their own kits
* Invalid and expired sessions are handled safely

### 📝 Job Description & Company Input

Users can provide:

* Job description as text
* Company website URL
* Number of preparation days

The Job Description is entered directly by the user rather than being scraped from a job board.

### 🏢 Company Research

The application:

* Validates the company URL
* Retrieves company pages
* Cleans retrieved HTML
* Discovers relevant internal links
* Ranks potentially useful pages
* Searches for hiring-related information
* Uses public interview-process discussions when available
* Records unavailable sources without failing the complete run

The crawler does not depend only on fixed `/careers` or `/jobs` paths.

---

## 🧠 Requirement Extraction

The Job Description is analysed to identify relevant requirements.

Each requirement receives a stable ID and is classified as:

* `technical`
* `behavioural`
* `domain`

Requirements are also classified as:

* `must`
* `nice`

Example:

```json
{
  "id": "r1",
  "text": "Experience with React",
  "kind": "technical",
  "priority": "must"
}
```

---

## 🤖 AI Generation Pipeline

The application uses a **multi-stage generation pipeline** instead of a single large LLM prompt.

```text
Job Description
       │
       ▼
Requirement Extraction
       │
       ▼
Company URL Validation
       │
       ▼
Website Retrieval
       │
       ▼
Content Cleaning
       │
       ▼
Relevant Link Discovery
       │
       ▼
Hiring / Company Research
       │
       ▼
Company Brief Generation
       │
       ▼
Requirement-Based Question Generation
       │
       ├───────────────┐
       ▼               ▼
   Flashcards       Schedule
       │               │
       └───────┬───────┘
               ▼
       Coverage Checking
               │
               ▼
       Missing Requirement Detection
               │
               ▼
       Second-Pass Generation
               │
               ▼
       Final Kit Validation
               │
               ▼
       Persisted Interview Kit
```

---

## 🔄 Second-Pass Coverage

Coverage checking is performed using deterministic application logic.

The system compares:

```text
Extracted Requirements
        VS
Generated Question requirement_ids
```

If a requirement does not have a corresponding question:

1. The requirement is identified as uncovered.
2. Additional questions are generated.
3. Coverage is checked again.
4. The final kit is validated.

This ensures that must-have requirements are not silently omitted.

---

## 🃏 Flashcards & Practice Mode

The application provides interactive flashcards derived from the generated preparation content.

Users can:

* Reveal answers one card at a time
* Track confidence
* Identify weaker topics
* Review uncovered material
* Continue practising from the generated kit

---

## 📅 Deterministic Study Schedule

Schedule allocation is handled by application code rather than the LLM.

The scheduler:

* Uses exactly the number of days requested
* Allocates question IDs to each day
* Assigns integer durations in minutes
* Ensures must-have requirements appear in the schedule
* Prioritises harder and higher-priority topics earlier

Example:

```json
{
  "days_available": 5,
  "days": [
    {
      "day": 1,
      "focus": "Core technical requirements",
      "question_ids": ["q1", "q2"],
      "minutes": 60
    }
  ]
}
```

---

## ✏️ Editable Kit Builder

The generated kit is treated as a customisable draft.

Users can:

* ✏️ Edit questions
* ➕ Add questions
* 🗑️ Delete questions
* ↕️ Reorder questions
* 🔄 Regenerate individual sections
* ✏️ Edit flashcards
* ➕ Add flashcards
* 🏢 Edit the company brief
* 📅 Regenerate the schedule

Regenerating one section is designed to preserve changes made elsewhere in the kit.

---

## 📋 Kit Structure

Every generated kit follows the required structure from the Trao assessment.

```json
{
  "source": {
    "company": "",
    "company_url": "",
    "role": "",
    "location": "",
    "jd_chars": 0,
    "researched_at": "",
    "pages_used": []
  },
  "company_brief": {
    "summary": "",
    "what_they_do": "",
    "sources": []
  },
  "role": {
    "title": "",
    "seniority": "",
    "responsibilities": [],
    "requirements": []
  },
  "questions": [],
  "flashcards": [],
  "schedule": {
    "days_available": 5,
    "days": []
  },
  "coverage": {
    "uncovered_requirement_ids": [],
    "passes": 2
  }
}
```

Every requirement has a stable ID.

Every question references the requirements it covers.

Every schedule entry references valid question IDs.

---

## 🧪 Batch Evaluation

The mandatory batch command is:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

The command:

* Reads multiple test cases
* Runs the same pipeline used by the application
* Uses the requested number of preparation days
* Continues after individual failures
* Records successful and failed cases
* Produces the required Appendix B output format

### Example Input

```json
[
  {
    "id": "case-01",
    "jd": "Backend Engineer with Node.js and MongoDB experience...",
    "company_url": "https://example.com",
    "days": 5
  }
]
```

### Example Output

```json
{
  "version": "1.0",
  "generated_at": "2026-09-25T00:00:00.000Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": {},
      "error": null
    }
  ]
}
```

A failed case does not terminate the complete batch.

---

## 🧩 Validation

Generated kits are validated before persistence.

Validation covers:

* Required structure
* Unique IDs
* Valid requirement references
* Valid question references
* Valid flashcard references
* Valid schedule question IDs
* Valid difficulty values
* Integer schedule durations
* Required Appendix A fields

The validation layer uses **Zod**.

---

## ⚠️ Error & Edge Case Handling

The application handles:

* Invalid company URLs
* 404 responses
* Request timeouts
* Unreachable company websites
* Missing hiring pages
* Missing public interview discussions
* Very short Job Descriptions
* Invalid LLM JSON
* Incomplete LLM output
* LLM rate limiting
* Temporary provider failures
* Duplicate submissions
* 1-day preparation schedules
* Long preparation timelines

The application prefers reporting incomplete research rather than fabricating information.

---

## 🔒 Security

Security considerations include:

* Password hashing
* Session-based authentication
* Protected API routes
* User ownership checks
* URL validation
* Production protection against private and loopback targets
* Request size limits
* Content validation
* Generated output validation
* CORS configuration
* Environment-based secrets
* API keys excluded from source control

External webpage content is treated as **untrusted data** rather than instructions.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────┐
│             Next.js                 │
│        React + Tailwind CSS         │
│                                     │
│ Authentication / Builder / Practice │
│ Flashcards / Schedule / UI          │
└────────────────┬────────────────────┘
                 │
                 │ REST API
                 ▼
┌─────────────────────────────────────┐
│          Node.js + Express          │
│                                     │
│ Auth                                │
│ Retrieval                           │
│ Extraction                          │
│ Generation                          │
│ Coverage                            │
│ Scheduling                          │
│ Validation                          │
│ Persistence                         │
└───────────────┬─────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌─────────────────┐
│ MongoDB Atlas │  │   LLM Provider  │
│ Users / Kits  │  │ AI Generation   │
└───────────────┘  └─────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

* Next.js
* React
* Tailwind CSS

### Backend

* Node.js
* Express.js
* JavaScript
* Zod
* Cheerio

### Database

* MongoDB
* MongoDB Atlas
* Mongoose

### AI

* OpenAI-compatible LLM API
* Structured JSON generation
* Rate-limit handling
* Retry and JSON-repair handling

### Deployment

* Vercel — Frontend
* Render — Backend
* MongoDB Atlas — Database
* GitHub — Source Control

---

## 📁 Project Structure

```text
Trao-Interview-Preparation-Kit/
│
├── backend/
│   ├── src/
│   │   ├── batch/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── schema/
│   │   ├── services/
│   │   │   ├── generation/
│   │   │   ├── schedule/
│   │   │   └── pipeline/
│   │   └── server.js
│   │
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   └── app/
│   ├── package.json
│   └── .env.local
│
└── README.md
```

---

## 💻 Local Installation

### Prerequisites

* Node.js 18+
* npm
* MongoDB Atlas account
* LLM API access

### 1. Clone Repository

```bash
git clone https://github.com/Shaluu-24/Trao-Interview-Preparation-Kit.git
cd Trao-Interview-Preparation-Kit
```

---

## ⚙️ Backend Setup

```bash
cd backend
npm install
```

Create:

```text
backend/.env
```

Add:

```env
MONGO_URI=your_mongodb_connection_string
LLM_PROVIDER=openai
LLM_API_KEY=your_llm_api_key
SESSION_SECRET=your_random_session_secret
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

---

## 🎨 Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## 🧪 Running Tests

From the backend directory:

```bash
npm test
```

Tests cover important validation behaviour including:

* Kit structure validation
* Requirement references
* Question references
* Flashcard references
* Schedule references
* ID uniqueness

---

## 📦 Running the Batch Evaluator

From the backend directory:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

The batch evaluator uses the same pipeline as the application.

---

## 🌐 Production Environment Variables

### Frontend — Vercel

```env
NEXT_PUBLIC_API_URL=https://trao-interview-preparation-kit-1.onrender.com
```

### Backend — Render

```env
MONGO_URI=your_mongodb_connection_string
LLM_PROVIDER=openai
LLM_API_KEY=your_llm_api_key
SESSION_SECRET=your_random_session_secret
FRONTEND_URL=https://trao-interview-preparation-kit.vercel.app
```

> Never commit real credentials, API keys, database passwords or session secrets to GitHub.

---

## 🔑 Environment Variables

| Variable              | Purpose                                 |
| --------------------- | --------------------------------------- |
| `MONGO_URI`           | MongoDB Atlas connection                |
| `LLM_PROVIDER`        | Selected LLM provider                   |
| `LLM_API_KEY`         | LLM authentication                      |
| `LLM_MODEL`           | Optional LLM model                      |
| `LLM_API_BASE_URL`    | Optional OpenAI-compatible API endpoint |
| `SESSION_SECRET`      | Session secret                          |
| `PORT`                | Backend port                            |
| `FRONTEND_URL`        | Allowed frontend origin                 |
| `NEXT_PUBLIC_API_URL` | Frontend API URL                        |

---

## 🔄 Generation Responsibilities

### Requirement Extraction

Identifies requirements directly supported by the Job Description.

### Company Research

Retrieves and cleans relevant company pages.

### Hiring Research

Discovers hiring-related pages through crawling and link ranking.

### Public Discussion Research

Looks for publicly available interview-process information.

### Company Brief

Creates a concise company summary based on retrieved sources.

### Question Generation

Generates questions based on individual requirements and categories.

### Coverage Check

Uses deterministic application logic to identify uncovered requirements.

### Flashcards

Creates revision material from generated preparation content.

### Scheduler

Allocates preparation material across the requested number of days.

### Validation

Ensures the generated kit matches the required structure before persistence.

---

## 🎯 Key Design Decisions

### Multi-Stage AI Pipeline

The system does not depend on a single prompt to generate the entire preparation kit.

Research, extraction, question generation, coverage checking and scheduling are separated into dedicated stages.

### Deterministic Coverage

Requirement coverage is determined by application logic rather than the LLM.

### Deterministic Scheduling

Schedule allocation is handled through code because it is an arithmetic and allocation problem.

### Bounded Second Pass

The coverage loop is bounded to prevent uncontrolled repeated generation.

### Structured Validation

LLM output is validated before being accepted as a final kit.

---

## ⚠️ Known Limitations

* Public interview discussions may not exist for every company.
* Some websites may block automated retrieval.
* Free-tier LLM providers may impose rate limits.
* AI-generated information depends on retrieved source quality.
* Very short Job Descriptions naturally produce smaller kits.
* External website information can change over time.

When information cannot be retrieved, the application reports the limitation rather than inventing information.

---

## 🎥 Demo Walkthrough

The walkthrough demonstrates:

1. 🔐 Registering and logging in
2. 📄 Creating a kit from a Job Description
3. 🌐 Providing the company website
4. 📅 Selecting preparation days
5. ⚙️ Running the research and generation pipeline
6. 🏢 Viewing the company brief
7. 💼 Reviewing role requirements
8. 💻 Reviewing categorised questions
9. ✏️ Editing and reordering questions
10. 🔄 Regenerating a section while preserving edits
11. 🃏 Practising flashcards
12. 📊 Tracking preparation coverage
13. 📅 Reviewing the generated study schedule

---

## 📌 Trao Assessment Requirements Covered

| Requirement            | Implementation                           |
| ---------------------- | ---------------------------------------- |
| Authentication         | Session-based authentication             |
| Company research       | Website retrieval and crawling           |
| Hiring-page discovery  | Link discovery and ranking               |
| Public discussion      | Research stage                           |
| Requirement extraction | Dedicated generation stage               |
| Question generation    | Requirement/category-based generation    |
| Second-pass coverage   | Deterministic coverage loop              |
| Flashcards             | Preparation content                      |
| Schedule               | Deterministic allocation                 |
| Kit validation         | Zod validation                           |
| Batch command          | `npm run evaluate`                       |
| Error handling         | Structured failure handling              |
| Security               | URL, session, CORS and output validation |
| Persistence            | MongoDB Atlas                            |
| Frontend               | Next.js + Tailwind CSS                   |
| Backend                | Node.js + Express                        |
| Deployment             | Vercel + Render                          |

---

## 🔗 Submission Links

### 🌐 Hosted Project

https://trao-interview-preparation-kit.vercel.app/

### 📂 GitHub Repository

https://github.com/Shaluu-24/Trao-Interview-Preparation-Kit

### ⚙️ Backend API

https://trao-interview-preparation-kit-1.onrender.com

---

## 👩‍💻 Author

**Shalini K**

B.E. Computer Science and Engineering — 2026

* GitHub: https://github.com/Shaluu-24
* LinkedIn: https://linkedin.com/in/shalini-kubendran
* LeetCode: https://leetcode.com/u/Shalu_03/
* Replit: https://replit.com/@shalu2410

---

## 📄 Assessment

Built for the:

**Trao Full-Stack Engineering Assessment — The AI Interview Prep Kit**

**Assessment ID:** `FS-AI-INTERVIEW-01`

---

## 🚀 End-to-End Workflow

```text
Job Description
       +
Company Website
       +
Preparation Days
       ↓
Research
       ↓
Requirement Extraction
       ↓
AI Generation
       ↓
Coverage Check
       ↓
Second Pass
       ↓
Validation
       ↓
Interview Kit
       ↓
Edit + Practice
       ↓
Personalised Interview Preparation
```

**Built with Next.js, Node.js, Express, MongoDB, and AI.**
