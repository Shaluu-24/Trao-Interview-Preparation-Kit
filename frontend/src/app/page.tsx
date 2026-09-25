"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Requirement = {
  id: string;
  text: string;
  kind: string;
  priority?: number | string;
};

type Question = {
  id: string;
  requirement_id?: string;
  requirement_ids?: string[];
  category: "technical" | "behavioral" | string;
  difficulty: number;
  question: string;
  prompt?: string;
  answer: string;
  answer_outline?: string;
  covered?: boolean;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids?: string[];
};

type ScheduleDay = {
  day: number;
  focus: string;
  minutes: number;
  question_ids?: string[];
};

type CoverageItem = {
  requirement: string | Requirement;
  covered: boolean;
  question_ids: string[];
};

type Kit = {
  source?: {
    company?: string;
    company_url?: string;
    role?: string;
  };

  company_brief?: {
    summary?: string;
    what_they_do?: string;
    products?: string[];
    hiring_signals?: string[];
    sources?: string[];
  };

  role: {
    title: string;
    summary?: string;
    responsibilities?: string[];
    must_requirements: Requirement[];
    nice_to_have?: Requirement[];
  };

  questions: Question[];

  flashcards: Flashcard[];

  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };

  coverage: {
    total_requirements: number;
    covered_requirements: number;
    uncovered_requirements: number;
    items: CoverageItem[];
  };
};

const demoRequirements: Requirement[] = [
  { id: "r1", text: "Programming", kind: "technical", priority: 1 },
  { id: "r2", text: "Data Analysis", kind: "technical", priority: 1 },
  { id: "r3", text: "SQL", kind: "technical", priority: 1 },
  { id: "r4", text: "Communication", kind: "behavioral", priority: 1 },
  { id: "r5", text: "Problem Solving", kind: "behavioral", priority: 1 },
  { id: "r6", text: "Stakeholder Management", kind: "domain", priority: 1 },
  { id: "r7", text: "Documentation", kind: "domain", priority: 1 },
  { id: "r8", text: "Excel", kind: "technical", priority: 1 },
  { id: "r9", text: "Power BI", kind: "technical", priority: 1 },
];

function getRequirementText(
  value: string | Requirement | undefined
): string {
  if (!value) return "Requirement";

  if (typeof value === "string") {
    return value;
  }

  return value.text || "Requirement";
}

function difficultyLabel(value: number) {
  if (value === 1) return "Easy";
  if (value === 3) return "Hard";
  return "Medium";
}

function difficultyClass(value: number) {
  if (value === 1) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (value === 3) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

/*
 * Detect a broad role from the supplied job description.
 * This is intentionally generic and works as a UI fallback
 * when the backend does not yet return a role title.
 */
function detectRoleTitle(jobDescription: string): string {
  const text = jobDescription.toLowerCase();

  const rolePatterns: Array<[string, string[]]> = [
    ["Business Analyst", [
      "business analyst",
      "business analysis",
      "requirements gathering",
      "stakeholder management",
    ]],
    ["Data Analyst", [
      "data analyst",
      "data analysis",
      "data analytics",
      "power bi",
      "tableau",
    ]],
    ["Data Engineer", [
      "data engineer",
      "data engineering",
      "etl",
      "data pipeline",
      "data warehouse",
    ]],
    ["Data Scientist", [
      "data scientist",
      "data science",
      "statistical modeling",
      "machine learning model",
    ]],
    ["Machine Learning Engineer", [
      "machine learning engineer",
      "ml engineer",
      "machine learning",
      "model deployment",
    ]],
    ["AI / LLM Engineer", [
      "ai engineer",
      "llm engineer",
      "generative ai",
      "large language model",
      "rag",
    ]],
    ["Frontend Developer", [
      "frontend developer",
      "front-end developer",
      "frontend engineer",
      "front-end engineer",
      "react developer",
    ]],
    ["Backend Developer", [
      "backend developer",
      "back-end developer",
      "backend engineer",
      "back-end engineer",
    ]],
    ["Full Stack Developer", [
      "full stack developer",
      "full-stack developer",
      "full stack engineer",
      "full-stack engineer",
    ]],
    ["DevOps Engineer", [
      "devops engineer",
      "devops",
      "ci/cd",
      "continuous integration",
      "continuous deployment",
    ]],
    ["Cloud Engineer", [
      "cloud engineer",
      "cloud computing",
      "aws engineer",
      "azure engineer",
      "gcp engineer",
    ]],
    ["QA / Test Engineer", [
      "qa engineer",
      "quality assurance",
      "test engineer",
      "software tester",
      "automation tester",
    ]],
    ["Product Manager", [
      "product manager",
      "product management",
      "product strategy",
    ]],
    ["Product Analyst", [
      "product analyst",
      "product analytics",
      "product metrics",
    ]],
    ["UI/UX Designer", [
      "ui/ux",
      "ui designer",
      "ux designer",
      "user experience",
      "user interface",
    ]],
    ["HR / Recruiter", [
      "human resources",
      "hr executive",
      "hr recruiter",
      "recruiter",
      "talent acquisition",
    ]],
    ["Marketing", [
      "marketing executive",
      "marketing specialist",
      "digital marketing",
      "marketing analyst",
    ]],
    ["Data Entry Specialist", [
      "data entry",
      "data entry operator",
      "data entry specialist",
    ]],
    ["Software Engineer", [
      "software engineer",
      "software developer",
      "software development",
      "application developer",
    ]],
  ];

  for (const [role, patterns] of rolePatterns) {
    if (patterns.some((pattern) => text.includes(pattern))) {
      return role;
    }
  }

  return "Role-specific Interview Preparation";
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const [kit, setKit] = useState<Kit | null>(null);

  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState("7");

  const [activeTab, setActiveTab] = useState<
    "overview" | "questions" | "flashcards" | "study" | "practice"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [coveredQuestions, setCoveredQuestions] = useState<string[]>([]);

  const [practiceIndex, setPracticeIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [confidence, setConfidence] = useState<Record<string, number>>({});

  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  const progress = useMemo(() => {
    if (!kit?.questions?.length) return 0;

    return Math.round(
      (coveredQuestions.length / kit.questions.length) * 100
    );
  }, [kit, coveredQuestions]);

  function handleLogin() {
    setAuthenticated(true);
    setShowLogin(false);
  }

  function handleLogout() {
    setAuthenticated(false);
    setShowLogin(true);
    setKit(null);
    setCoveredQuestions([]);
    setConfidence({});
    setPracticeIndex(0);
    setFlashcardIndex(0);
    setShowAnswer(false);
    setShowFlashcardAnswer(false);
  }

  async function generateKit() {
    if (!jobDescription.trim()) {
      setError("Please paste the job description.");
      return;
    }

    if (!companyUrl.trim()) {
      setError("Please enter the company website.");
      return;
    }

    const requestedDays = Number(days);

    if (
      !Number.isFinite(requestedDays) ||
      requestedDays < 1 ||
      requestedDays > 60
    ) {
      setError("Please choose between 1 and 60 preparation days.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/kits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          companyUrl,
          days: Math.min(
            60,
            Math.max(1, Math.floor(requestedDays))
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Unable to generate the prep kit."
        );
      }

      setKit(data.kit);
      setCoveredQuestions([]);
      setPracticeIndex(0);
      setFlashcardIndex(0);
      setShowAnswer(false);
      setShowFlashcardAnswer(false);
      setConfidence({});
      setActiveTab("overview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the kit."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleCovered(questionId: string) {
    setCoveredQuestions((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  }

  function markConfidence(questionId: string, value: number) {
    setConfidence((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function resetToLanding() {
    setKit(null);
    setError("");
    setActiveTab("overview");
    setCoveredQuestions([]);
    setConfidence({});
    setPracticeIndex(0);
    setFlashcardIndex(0);
    setShowAnswer(false);
    setShowFlashcardAnswer(false);
  }

  if (!authenticated || showLogin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!kit) {
    return (
      <LandingPage
        jobDescription={jobDescription}
        setJobDescription={setJobDescription}
        companyUrl={companyUrl}
        setCompanyUrl={setCompanyUrl}
        days={days}
        setDays={setDays}
        loading={loading}
        error={error}
        onGenerate={generateKit}
        onLogout={handleLogout}
      />
    );
  }

  const currentQuestion = kit.questions?.[practiceIndex];
  const currentFlashcard = kit.flashcards?.[flashcardIndex];

  const companyName =
    kit.source?.company ||
    companyUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] ||
    "Company";

  /*
   * Prefer the backend role when it is meaningful.
   * If the backend still returns its old hardcoded Software Engineer,
   * detect the actual role from the JD for the UI.
   */
  const detectedRole = detectRoleTitle(jobDescription);

  const roleTitle =
    kit.role?.title &&
    kit.role.title !== "Software Engineer"
      ? kit.role.title
      : detectedRole;

  const safeDaysAvailable =
    Number(kit.schedule?.days_available) ||
    kit.schedule?.days?.length ||
    1;

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="border-b border-white/10 bg-[#070a10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              AI
            </div>

            <div className="text-left">
              <div className="text-sm font-semibold">
                Prep Kit
              </div>

              <div className="text-[11px] text-slate-500">
                Trao Assessment
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5"
            >
              Dashboard
            </button>

            <button
              onClick={resetToLanding}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5"
            >
              Create another kit
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>INTERVIEW PREPARATION</span>
            <span>•</span>
            <span>{companyName}</span>
            <span>•</span>
            <span>{roleTitle}</span>
          </div>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {companyName} · {roleTitle}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                A structured preparation workspace built from your job
                description, role requirements, and company research.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Timeline
                </div>

                <div className="mt-1 text-sm font-semibold">
                  {safeDaysAvailable} days
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Progress
                </div>

                <div className="mt-1 text-sm font-semibold">
                  {progress}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
          <div className="grid divide-y divide-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
            <DashboardStat
              label="Questions"
              value={kit.questions?.length || 0}
              helper="role-specific"
            />

            <DashboardStat
              label="Flashcards"
              value={kit.flashcards?.length || 0}
              helper="ready to review"
            />

            <DashboardStat
              label="Study days"
              value={safeDaysAvailable}
              helper="planned"
            />

            <DashboardStat
              label="Coverage"
              value={`${progress}%`}
              helper="questions covered"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </TabButton>

          <TabButton
            active={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
          >
            Questions
          </TabButton>

          <TabButton
            active={activeTab === "flashcards"}
            onClick={() => setActiveTab("flashcards")}
          >
            Flashcards
          </TabButton>

          <TabButton
            active={activeTab === "study"}
            onClick={() => setActiveTab("study")}
          >
            Study Plan
          </TabButton>

          <TabButton
            active={activeTab === "practice"}
            onClick={() => setActiveTab("practice")}
          >
            Practice
          </TabButton>
        </div>

        {activeTab === "overview" && (
          <Overview
            kit={kit}
            roleTitle={roleTitle}
            progress={progress}
            coveredQuestions={coveredQuestions}
          />
        )}

        {activeTab === "questions" && (
          <Questions
            kit={kit}
            coveredQuestions={coveredQuestions}
            toggleCovered={toggleCovered}
          />
        )}

        {activeTab === "flashcards" && (
          <Flashcards
            flashcards={kit.flashcards || []}
            index={flashcardIndex}
            setIndex={setFlashcardIndex}
            showAnswer={showFlashcardAnswer}
            setShowAnswer={setShowFlashcardAnswer}
          />
        )}

        {activeTab === "study" && <StudyPlan kit={kit} />}

        {activeTab === "practice" && currentQuestion && (
          <Practice
            question={currentQuestion}
            index={practiceIndex}
            total={kit.questions.length}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            next={() => {
              setShowAnswer(false);

              setPracticeIndex((current) =>
                current + 1 < kit.questions.length
                  ? current + 1
                  : 0
              );
            }}
            confidence={confidence[currentQuestion.id] || 0}
            setConfidence={(value) =>
              markConfidence(currentQuestion.id, value)
            }
            covered={coveredQuestions.includes(currentQuestion.id)}
            onToggleCovered={() =>
              toggleCovered(currentQuestion.id)
            }
          />
        )}

        {activeTab === "practice" && !currentQuestion && (
          <EmptyState
            title="No questions available"
            text="Generate a prep kit with a valid job description."
          />
        )}
      </div>
    </main>
  );
}

function LoginPage({
  onLogin,
}: {
  onLogin: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  function submit() {
    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter your email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setLoginError("Please enter your name.");
      return;
    }

    setLoginError("");
    onLogin();
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#090c12] shadow-2xl shadow-black/40 lg:grid-cols-2">
          <div className="hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
                  AI
                </div>

                <div>
                  <div className="text-sm font-semibold">
                    Interview Prep Kit
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Built for Trao Assessment
                  </div>
                </div>
              </div>

              <div className="mt-24">
                <div className="text-xs uppercase tracking-widest text-slate-600">
                  PREPARE WITH PURPOSE
                </div>

                <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                  Your interview preparation, organized around the role.
                </h1>

                <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                  Turn any job description and company website into a
                  focused preparation workspace with role requirements,
                  interview questions, flashcards, coverage and a study
                  plan.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <TrustPoint text="Works across different job roles" />
              <TrustPoint text="Company research included" />
              <TrustPoint text="Structured interview practice" />
            </div>
          </div>

          <div className="p-7 md:p-10">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
                  AI
                </div>

                <div>
                  <div className="text-sm font-semibold">
                    Interview Prep Kit
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Trao Assessment
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-xs uppercase tracking-widest text-slate-600">
                {mode === "login"
                  ? "WELCOME BACK"
                  : "GET STARTED"}
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {mode === "login"
                  ? "Sign in to your workspace."
                  : "Create your preparation account."}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "Continue building focused interview preparation kits."
                  : "Create a workspace to organize your interview preparation."}
              </p>
            </div>

            <div className="space-y-5">
              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Full name
                  </label>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-white/10 bg-[#080b11] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/25"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-[#080b11] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-white/10 bg-[#080b11] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/25"
                />
              </div>

              {loginError && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {loginError}
                </div>
              )}

              <button
                onClick={submit}
                className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                {mode === "login"
                  ? "Sign in →"
                  : "Create account →"}
              </button>
            </div>

            <div className="mt-7 text-center text-sm text-slate-600">
              {mode === "login"
                ? "New to Interview Prep Kit?"
                : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setMode(
                    mode === "login" ? "signup" : "login"
                  );
                  setLoginError("");
                }}
                className="text-slate-300 transition hover:text-white"
              >
                {mode === "login"
                  ? "Create account"
                  : "Sign in"}
              </button>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6 text-center text-[11px] text-slate-700">
              Interview Prep Kit · Trao Assessment
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function LandingPage({
  jobDescription,
  setJobDescription,
  companyUrl,
  setCompanyUrl,
  days,
  setDays,
  loading,
  error,
  onGenerate,
  onLogout,
}: {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  companyUrl: string;
  setCompanyUrl: (value: string) => void;
  days: string;
  setDays: (value: string) => void;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              AI
            </div>

            <div>
              <div className="text-sm font-semibold">
                Interview Prep Kit
              </div>

              <div className="text-[11px] text-slate-500">
                Built for Trao Assessment
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#create"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Get started
            </a>

            <button
              onClick={onLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
            AI-powered interview preparation for any role
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            Turn any job description into an{" "}
            <span className="text-slate-400">
              interview plan.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            From software engineering and data analytics to business
            analysis, operations, HR and beyond — build preparation around
            the actual role you are applying for.
          </p>

          <div className="mt-9 flex justify-center gap-3">
            <a
              href="#create"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              Create your prep kit →
            </a>

            <a
              href="#workflow"
              className="rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[32px] border border-white/10 bg-[#090c12] p-5 shadow-2xl shadow-black/40">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-600">
                UNIVERSAL INTERVIEW PREPARATION
              </div>

              <div className="mt-1 text-lg font-semibold">
                Any role · Any company
              </div>
            </div>

            <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400">
              Role-aware
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <PreviewCard
              title="Role"
              value="Dynamic"
              text="Detected from JD"
            />

            <PreviewCard
              title="Questions"
              value="JD-based"
              text="Role-specific"
            />

            <PreviewCard
              title="Flashcards"
              value="Dynamic"
              text="Key requirements"
            />

            <PreviewCard
              title="Schedule"
              value="1–60"
              text="Days available"
            />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="text-xs uppercase tracking-wider text-slate-600">
                ROLE EXAMPLES
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  "Software Engineer",
                  "Business Analyst",
                  "Data Analyst",
                  "Data Engineer",
                  "Full Stack Developer",
                  "HR / Recruiter",
                  "QA Engineer",
                  "Product Manager",
                  "Any other role",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-slate-400"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="text-xs uppercase tracking-wider text-slate-600">
                PREPARATION FLOW
              </div>

              <div className="mt-4 space-y-3">
                <MiniPlan
                  day="01"
                  text="Understand the role"
                />
                <MiniPlan
                  day="02"
                  text="Build interview questions"
                />
                <MiniPlan
                  day="03"
                  text="Revise key concepts"
                />
                <MiniPlan
                  day="04"
                  text="Practice & review"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="From job description to preparation workspace."
            text="The preparation adapts to the role instead of assuming every candidate is applying for the same type of job."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <StepCard
              number="01"
              title="Understand"
              text="Analyze the job description to identify the role, responsibilities, skills and competencies."
            />

            <StepCard
              number="02"
              title="Research & Build"
              text="Research the company and turn the identified requirements into interview questions, flashcards and coverage."
            />

            <StepCard
              number="03"
              title="Practice"
              text="Follow a focused study schedule, answer questions yourself and track your confidence."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="FEATURES"
          title="Everything you need in one preparation workspace."
          text="Built around the actual job you are preparing for."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Role detection"
            text="Identify the type of role from the job description instead of assuming a software engineering position."
          />

          <Feature
            title="Requirement extraction"
            text="Capture technical, domain, behavioral and role-specific requirements from the JD."
          />

          <Feature
            title="Company research"
            text="Use the provided company website to build an honest company brief and hiring context."
          />

          <Feature
            title="Interview questions"
            text="Generate questions connected directly to the role requirements."
          />

          <Feature
            title="Flashcards"
            text="Turn important role concepts and requirements into quick revision cards."
          />

          <Feature
            title="Study schedule"
            text="Distribute preparation across the exact number of days available."
          />
        </div>
      </section>

      <section id="create" className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="mb-10 text-center">
            <div className="text-xs uppercase tracking-widest text-slate-600">
              START PREPARING
            </div>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Build your interview kit.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              Give us the job description, company website and interview
              timeline. The preparation is built around the role.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
            <div className="mb-7 grid gap-3 md:grid-cols-4">
              <TrustPoint text="Role-aware preparation" />
              <TrustPoint text="Company research" />
              <TrustPoint text="Interview questions" />
              <TrustPoint text="Day-by-day schedule" />
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Job description
                </label>

                <textarea
                  value={jobDescription}
                  onChange={(e) =>
                    setJobDescription(e.target.value)
                  }
                  rows={12}
                  placeholder="Paste the complete job description..."
                  className="w-full resize-y rounded-2xl border border-white/10 bg-[#080b11] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-white/25"
                />

                <p className="mt-2 text-xs text-slate-600">
                  Any role is supported — software, analytics, business,
                  operations, HR, design, data and more.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_180px]">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Company website
                  </label>

                  <input
                    value={companyUrl}
                    onChange={(e) =>
                      setCompanyUrl(e.target.value)
                    }
                    placeholder="https://company.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#080b11] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Days before interview
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#080b11] px-4 py-3 text-sm text-white outline-none focus:border-white/25"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <button
                onClick={onGenerate}
                disabled={loading}
                className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Researching & building your kit..."
                  : "Generate Prep Kit →"}
              </button>

              <p className="text-center text-xs text-slate-600">
                Your preparation adapts to the supplied job description.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-slate-600">
          Interview Prep Kit · Trao Assessment
        </div>
      </footer>
    </main>
  );
}

function Overview({
  kit,
  roleTitle,
  progress,
  coveredQuestions,
}: {
  kit: Kit;
  roleTitle: string;
  progress: number;
  coveredQuestions: string[];
}) {
  const items =
    kit.coverage?.items ||
    kit.role.must_requirements.map((requirement) => ({
      requirement,
      covered: false,
      question_ids: [],
    }));

  const requirementTotal =
    kit.coverage?.total_requirements ||
    kit.role.must_requirements.length ||
    0;

  /*
   * Live requirement coverage:
   * A requirement is considered covered when at least one mapped
   * question has been marked covered by the user.
   */
  const liveItems = items.map((item) => {
    const mappedIds = item.question_ids || [];

    const liveCovered =
      item.covered ||
      mappedIds.some((id) =>
        coveredQuestions.includes(id)
      );

    return {
      ...item,
      liveCovered,
    };
  });

  const coveredRequirements = liveItems.filter(
    (item) => item.liveCovered
  ).length;

  const requirementCoverage =
    requirementTotal > 0
      ? Math.round(
          (coveredRequirements / requirementTotal) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          eyebrow="COMPANY BRIEF"
          title={`About ${kit.source?.company || "the company"}`}
        >
          <p className="text-sm leading-7 text-slate-400">
            {kit.company_brief?.summary ||
              kit.company_brief?.what_they_do ||
              "Company research is available for this preparation kit."}
          </p>

          {kit.company_brief?.products &&
            kit.company_brief.products.length > 0 && (
              <InfoList
                title="Products / areas"
                items={kit.company_brief.products}
              />
            )}

          {kit.company_brief?.hiring_signals &&
            kit.company_brief.hiring_signals.length > 0 && (
              <InfoList
                title="Hiring signals"
                items={kit.company_brief.hiring_signals}
              />
            )}

          {kit.company_brief?.sources &&
            kit.company_brief.sources.length > 0 && (
              <InfoList
                title="Research sources"
                items={kit.company_brief.sources}
              />
            )}
        </Panel>

        <Panel
          eyebrow="PREPARATION"
          title="Your current progress"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-5xl font-semibold">
                {progress}%
              </div>

              <div className="mt-2 text-sm text-slate-500">
                interview questions covered
              </div>
            </div>

            <div className="text-right text-sm text-slate-500">
              {coveredQuestions.length} / {kit.questions.length}
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <SmallStat
              value={kit.questions.length}
              label="Questions"
            />

            <SmallStat
              value={kit.flashcards.length}
              label="Flashcards"
            />

            <SmallStat
              value={kit.schedule.days_available}
              label="Study days"
            />

            <SmallStat
              value={requirementTotal}
              label="Requirements"
            />
          </div>
        </Panel>
      </div>

      <Panel
        eyebrow="ROLE BREAKDOWN"
        title={roleTitle}
      >
        <p className="text-sm leading-6 text-slate-400">
          {kit.role.summary ||
            `This ${roleTitle} preparation kit is built from the skills, responsibilities and competencies identified in the supplied job description.`}
        </p>

        {kit.role.responsibilities &&
          kit.role.responsibilities.length > 0 && (
            <InfoList
              title="Responsibilities"
              items={kit.role.responsibilities}
            />
          )}

        <InfoList
          title="Must-have requirements"
          items={kit.role.must_requirements}
        />

        {kit.role.nice_to_have &&
          kit.role.nice_to_have.length > 0 && (
            <InfoList
              title="Nice to have"
              items={kit.role.nice_to_have}
            />
          )}
      </Panel>

      <Panel
        eyebrow="REQUIREMENT COVERAGE"
        title="Every requirement, clearly mapped"
      >
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
          <div>
            <div className="text-sm font-medium">
              {coveredRequirements} / {requirementTotal} requirements
              covered
            </div>

            <div className="mt-1 text-xs text-slate-600">
              Each requirement is linked to relevant interview questions.
            </div>
          </div>

          <div className="text-2xl font-semibold">
            {requirementCoverage}%
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {liveItems.map((item, index) => {
            const text = getRequirementText(item.requirement);
            const questionCount =
              item.question_ids?.length || 0;

            return (
              <div
                key={`${text}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                        item.liveCovered
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {item.liveCovered ? "✓" : "○"}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200">
                        {text}
                      </div>

                      <div className="mt-1 text-xs text-slate-600">
                        {questionCount}{" "}
                        {questionCount === 1
                          ? "question"
                          : "questions"}{" "}
                        mapped
                      </div>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] ${
                      item.liveCovered
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {item.liveCovered
                      ? "Covered"
                      : "Needs practice"}
                  </div>
                </div>

                {questionCount > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-3 text-xs text-slate-500">
                    Practice the mapped questions in the Questions tab →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Questions({
  kit,
  coveredQuestions,
  toggleCovered,
}: {
  kit: Kit;
  coveredQuestions: string[];
  toggleCovered: (id: string) => void;
}) {
  const [filter, setFilter] = useState<
    "all" | "technical" | "behavioral"
  >("all");

  const questions = (kit.questions || []).filter(
    (question) => {
      if (filter === "all") return true;
      return question.category === filter;
    }
  );

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-600">
            INTERVIEW QUESTIONS
          </div>

          <h2 className="mt-2 text-2xl font-semibold">
            Questions connected to the role.
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Review questions generated from the actual job requirements.
          </p>
        </div>

        <div className="flex gap-2">
          {(
            ["all", "technical", "behavioral"] as const
          ).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-xl px-3 py-2 text-xs capitalize transition ${
                filter === value
                  ? "bg-white text-black"
                  : "border border-white/10 text-slate-500 hover:bg-white/5"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const covered = coveredQuestions.includes(
            question.id
          );

          return (
            <div
              key={question.id}
              className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
                    Q{index + 1}
                  </span>

                  <span className="text-[10px] uppercase tracking-wider text-slate-600">
                    {question.category}
                  </span>

                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] ${difficultyClass(
                      question.difficulty
                    )}`}
                  >
                    {difficultyLabel(question.difficulty)}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-medium leading-7">
                {question.question || question.prompt}
              </h3>

              <div className="mt-5 rounded-2xl bg-black/20 p-5">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">
                  Suggested answer
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  {question.answer || question.answer_outline}
                </p>
              </div>

              <button
                onClick={() => toggleCovered(question.id)}
                className={`mt-5 rounded-xl px-4 py-2 text-xs font-medium transition ${
                  covered
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "border border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {covered
                  ? "✓ Covered"
                  : "Mark covered"}
              </button>
            </div>
          );
        })}

        {questions.length === 0 && (
          <EmptyState
            title="No questions in this category"
            text="Try another question category."
          />
        )}
      </div>
    </div>
  );
}

function Flashcards({
  flashcards,
  index,
  setIndex,
  showAnswer,
  setShowAnswer,
}: {
  flashcards: Flashcard[];
  index: number;
  setIndex: (value: number) => void;
  showAnswer: boolean;
  setShowAnswer: (value: boolean) => void;
}) {
  const card = flashcards[index];

  if (!card) {
    return (
      <EmptyState
        title="No flashcards yet"
        text="Generate a prep kit to create revision cards."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-wider text-slate-600">
          FLASHCARDS
        </div>

        <h2 className="mt-2 text-2xl font-semibold">
          Quick revision
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Card {index + 1} of {flashcards.length}
        </p>
      </div>

      <div className="min-h-[360px] rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 md:p-12">
        <div className="text-xs uppercase tracking-widest text-slate-600">
          QUESTION
        </div>

        <h3 className="mt-8 text-3xl font-semibold leading-tight">
          {card.front}
        </h3>

        {showAnswer && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-xs uppercase tracking-wider text-slate-600">
              ANSWER
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {card.back}
            </p>
          </div>
        )}

        {!showAnswer && (
          <button
            onClick={() => setShowAnswer(true)}
            className="mt-10 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Reveal answer
          </button>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        <button
          disabled={index === 0}
          onClick={() => {
            setShowAnswer(false);
            setIndex(Math.max(0, index - 1));
          }}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400 disabled:opacity-30"
        >
          ← Previous
        </button>

        <button
          onClick={() => {
            setShowAnswer(false);
            setIndex(
              (index + 1) % flashcards.length
            );
          }}
          className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
        >
          Next card →
        </button>
      </div>
    </div>
  );
}

function StudyPlan({ kit }: { kit: Kit }) {
  const requirements = Array.isArray(
    kit.role?.must_requirements
  )
    ? kit.role.must_requirements
    : [];

  const requestedDays = Number(
    kit.schedule?.days_available
  );

  const totalDays =
    Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.min(
          60,
          Math.max(1, Math.floor(requestedDays))
        )
      : 7;

  const backendDays = Array.isArray(
    kit.schedule?.days
  )
    ? kit.schedule.days
    : [];

  const generatedPlan = buildProfessionalStudyPlan(
    requirements,
    kit.questions || [],
    totalDays
  );

  const backendIsUseful =
    backendDays.length === totalDays &&
    backendDays.some(
      (day) =>
        Array.isArray(day.question_ids) &&
        day.question_ids.length > 0
    );

  const days = backendIsUseful
    ? backendDays
    : generatedPlan;

  const totalMinutes = days.reduce(
    (sum, day) => sum + (Number(day.minutes) || 0),
    0
  );

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-600">
          STUDY PLAN
        </div>

        <h2 className="mt-2 text-3xl font-semibold">
          Your preparation schedule.
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          A focused day-by-day plan based on your interview timeline,
          requirement priority, topic dependencies, and practice needs.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SmallStat
          value={totalMinutes}
          label="Total minutes"
        />

        <SmallStat
          value={days.length}
          label="Preparation days"
        />

        <SmallStat
          value={requirements.length}
          label="Must-have topics"
        />
      </div>

      <div className="space-y-4">
        {days.map((day, index) => {
          const fallbackDay = generatedPlan[index];

          const focus =
            day.focus ||
            fallbackDay?.focus ||
            "Interview preparation";

          const minutes = Number(day.minutes) || 60;

          const questionIds =
            Array.isArray(day.question_ids)
              ? day.question_ids
              : fallbackDay?.question_ids || [];

          const questionsForDay = (
            kit.questions || []
          ).filter((question) =>
            questionIds.includes(question.id)
          );

          return (
            <div
              key={`${day.day}-${index}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-white/15"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-black">
                  {String(day.day).padStart(2, "0")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs uppercase tracking-wider text-slate-600">
                    DAY {day.day}
                  </div>

                  <h3 className="text-lg font-semibold">
                    {focus}
                  </h3>

                  {questionIds.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600">
                      {questionIds.length}{" "}
                      {questionIds.length === 1
                        ? "question"
                        : "questions"}{" "}
                      included
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 px-4 py-3 text-right">
                  <div className="text-lg font-semibold">
                    {minutes}
                  </div>

                  <div className="text-[10px] uppercase tracking-wider text-slate-600">
                    minutes
                  </div>
                </div>
              </div>

              {questionsForDay.length > 0 && (
                <div className="mt-5 border-t border-white/5 pt-5">
                  <div className="mb-3 text-[10px] uppercase tracking-wider text-slate-600">
                    SESSION FOCUS
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {questionsForDay.slice(0, 4).map(
                      (question) => (
                        <div
                          key={question.id}
                          className="rounded-xl bg-black/20 px-4 py-3 text-xs text-slate-400"
                        >
                          {question.question}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildProfessionalStudyPlan(
  requirements: Requirement[],
  questions: Question[],
  totalDays: number
): ScheduleDay[] {
  const safeDays =
    Number.isFinite(Number(totalDays)) &&
    Number(totalDays) > 0
      ? Math.min(
          60,
          Math.max(1, Math.floor(Number(totalDays)))
        )
      : 7;

  const safeRequirements = [...requirements].sort(
    (a, b) => {
      const priorityA = Number(a.priority) || 2;
      const priorityB = Number(b.priority) || 2;

      return priorityA - priorityB;
    }
  );

  const chunks: Requirement[][] = Array.from(
    { length: safeDays },
    () => []
  );

  safeRequirements.forEach(
    (requirement, index) => {
      chunks[index % safeDays].push(requirement);
    }
  );

  const result: ScheduleDay[] = [];

  for (let i = 0; i < safeDays; i++) {
    const topics = chunks[i];

    const requirementIds = topics.map(
      (requirement) => requirement.id
    );

    const dayQuestions = questions.filter(
      (question) => {
        const ids = [
          ...(question.requirement_id
            ? [question.requirement_id]
            : []),
          ...(question.requirement_ids || []),
        ];

        return ids.some((id) =>
          requirementIds.includes(id)
        );
      }
    );

    const uniqueQuestionIds = Array.from(
      new Set(
        dayQuestions.map(
          (question) => question.id
        )
      )
    );

    let focus = "Interview preparation";

    if (i === safeDays - 1) {
      focus =
        topics.length > 0
          ? `Final revision · ${topics
              .map((topic) => topic.text)
              .join(" + ")}`
          : "Final interview revision";
    } else if (i === 0) {
      focus =
        topics.length > 0
          ? `Core foundations · ${topics
              .map((topic) => topic.text)
              .join(" + ")}`
          : "Core interview foundations";
    } else if (i === safeDays - 2) {
      focus =
        topics.length > 0
          ? `Practice & application · ${topics
              .map((topic) => topic.text)
              .join(" + ")}`
          : "Technical and role practice";
    } else {
      focus =
        topics.length > 0
          ? topics
              .map((topic) => topic.text)
              .join(" + ")
          : "Interview preparation";
    }

    const minutes =
      safeDays === 1
        ? 60
        : i === safeDays - 1
        ? 45
        : 60;

    result.push({
      day: i + 1,
      minutes,
      focus,
      question_ids: uniqueQuestionIds,
    });
  }

  return result;
}

function Practice({
  question,
  index,
  total,
  showAnswer,
  setShowAnswer,
  next,
  confidence,
  setConfidence,
  covered,
  onToggleCovered,
}: {
  question: Question;
  index: number;
  total: number;
  showAnswer: boolean;
  setShowAnswer: (value: boolean) => void;
  next: () => void;
  confidence: number;
  setConfidence: (value: number) => void;
  covered: boolean;
  onToggleCovered: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-wider text-slate-600">
          PRACTICE
        </div>

        <div className="mt-2 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold">
              Try answering it yourself first.
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Question {index + 1} of {total}
            </p>
          </div>

          <div
            className={`w-fit rounded-lg border px-3 py-1 text-xs ${difficultyClass(
              question.difficulty
            )}`}
          >
            {question.category} ·{" "}
            {difficultyLabel(question.difficulty)}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.025] p-7 md:p-10">
        <h3 className="text-2xl font-medium leading-9">
          {question.question || question.prompt}
        </h3>

        <div className="mt-10">
          <div className="mb-3 text-xs uppercase tracking-wider text-slate-600">
            CONFIDENCE
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() =>
                  setConfidence(value)
                }
                className={`h-10 w-10 rounded-xl border text-sm transition ${
                  confidence === value
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-slate-500 hover:bg-white/5"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-slate-600">
            1 = needs significant practice · 5 = interview ready
          </div>
        </div>

        {showAnswer && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
            <div className="text-xs uppercase tracking-wider text-slate-600">
              SUGGESTED ANSWER
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {question.answer ||
                question.answer_outline}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() =>
              setShowAnswer(!showAnswer)
            }
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5"
          >
            {showAnswer
              ? "Hide answer"
              : "Reveal suggested answer"}
          </button>

          <button
            onClick={onToggleCovered}
            className={`rounded-2xl px-5 py-3 text-sm transition ${
              covered
                ? "bg-emerald-500/10 text-emerald-300"
                : "border border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            {covered
              ? "✓ Covered"
              : "Mark as covered"}
          </button>

          <button
            onClick={next}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Next question →
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoList({
  title,
  items,
}: {
  title: string;
  items: unknown[];
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-7">
      <div className="mb-3 text-xs uppercase tracking-wider text-slate-600">
        {title}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const text =
            typeof item === "string"
              ? item
              : item &&
                typeof item === "object" &&
                "text" in item &&
                typeof (item as { text?: unknown })
                  .text === "string"
              ? (item as { text: string }).text
              : String(item);

          return (
            <div
              key={`${text}-${index}`}
              className="rounded-xl bg-black/20 px-4 py-3 text-sm text-slate-400"
            >
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-slate-600">
          {eyebrow}
        </div>

        <h2 className="mt-2 text-xl font-semibold">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function DashboardStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="p-5">
      <div className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="mt-3 text-3xl font-semibold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-600">
        {helper}
      </div>
    </div>
  );
}

function SmallStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xl font-semibold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-600">
        {label}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm transition ${
        active
          ? "bg-white font-medium text-black"
          : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function PreviewCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-xs text-slate-600">
        {title}
      </div>

      <div className="mt-2 text-2xl font-semibold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-600">
        {text}
      </div>
    </div>
  );
}

function MiniPlan({
  day,
  text,
}: {
  day: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[10px] text-slate-500">
        {day}
      </div>

      <div className="text-xs text-slate-400">
        {text}
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">
      <div className="text-xs text-slate-600">
        {number}
      </div>

      <h3 className="mt-12 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-white/20">
      <div className="mb-7 h-2 w-2 rounded-full bg-white" />

      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function TrustPoint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-400">
      ✓ {text}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs uppercase tracking-widest text-slate-600">
        {eyebrow}
      </div>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}