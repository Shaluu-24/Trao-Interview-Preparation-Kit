/**
 * questionGenerator.js
 *
 * Generates deterministic interview questions from the
 * requirements extracted from a job description.
 *
 * This version does NOT require an LLM API key.
 *
 * Important:
 * - Questions are generated only for extracted requirements.
 * - No external requirements are invented.
 * - Every generated question has a stable ID.
 * - Difficulty is between 1 and 3.
 * - Each question keeps the requirement ID it covers.
 */

function normalizeRequirement(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function createQuestion({
  id,
  requirement,
  category,
  difficulty,
  question,
  answer,
}) {
  return {
    id,
    requirement_id: requirement.id,
    requirement: requirement.text,
    category,
    difficulty,
    question,
    answer,
    covered: false,
  };
}

function generateTechnicalQuestion(requirement, index) {
  const skill = normalizeRequirement(requirement.text);

  // -----------------------------
  // Java
  // -----------------------------

  if (skill === "java") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Explain the main OOP principles in Java and give a practical example of each.",
      answer:
        "The main OOP principles are encapsulation, inheritance, polymorphism, and abstraction.",
    };
  }

  // -----------------------------
  // Spring Boot
  // -----------------------------

  if (skill === "spring boot") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How does dependency injection work in Spring Boot, and why is it useful?",
      answer:
        "Spring manages objects as beans and injects their dependencies, reducing tight coupling and improving testability.",
    };
  }

  // -----------------------------
  // React.js
  // -----------------------------

  if (skill === "react.js") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is the difference between props and state in React.js?",
      answer:
        "Props are inputs passed from a parent component, while state is data managed by the component itself.",
    };
  }

  // -----------------------------
  // REST APIs
  // -----------------------------

  if (
    skill === "rest api" ||
    skill === "rest apis" ||
    skill === "rest"
  ) {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What makes an API RESTful, and which HTTP methods are commonly used?",
      answer:
        "REST uses resource-oriented URLs and HTTP semantics. GET, POST, PUT/PATCH and DELETE are commonly used.",
    };
  }

  // -----------------------------
  // SQL
  // -----------------------------

  if (skill === "sql") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Explain SQL JOINs and when you would use INNER JOIN versus LEFT JOIN.",
      answer:
        "INNER JOIN returns matching rows from both tables. LEFT JOIN keeps every row from the left table.",
    };
  }

  // -----------------------------
  // MySQL
  // -----------------------------

  if (skill === "mysql") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How would you optimize a slow MySQL query?",
      answer:
        "Check the execution plan, add appropriate indexes, reduce unnecessary data, and optimize joins and filtering.",
    };
  }

  // -----------------------------
  // PostgreSQL
  // -----------------------------

  if (skill === "postgresql") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What are indexes in PostgreSQL and when should you use them?",
      answer:
        "Indexes speed up searches and filtering but add storage and write overhead, so they should target useful query patterns.",
    };
  }

  // -----------------------------
  // MongoDB
  // -----------------------------

  if (skill === "mongodb") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How is MongoDB different from a relational SQL database?",
      answer:
        "MongoDB stores document-oriented data, while relational databases organize structured data into tables and relationships.",
    };
  }

  // -----------------------------
  // JavaScript
  // -----------------------------

  if (skill === "javascript") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Explain the difference between var, let, and const in JavaScript.",
      answer:
        "let and const are block-scoped; var is function-scoped. const prevents reassignment of the variable binding.",
    };
  }

  // -----------------------------
  // TypeScript
  // -----------------------------

  if (skill === "typescript") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What advantages does TypeScript provide over plain JavaScript?",
      answer:
        "TypeScript adds static typing, better tooling, interfaces, and compile-time checks for JavaScript applications.",
    };
  }

  // -----------------------------
  // Python
  // -----------------------------

  if (skill === "python") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What are Python lists, tuples, and dictionaries, and when would you use each?",
      answer:
        "Lists are mutable ordered collections, tuples are immutable ordered collections, and dictionaries store key-value pairs.",
    };
  }

  // -----------------------------
  // Node.js
  // -----------------------------

  if (skill === "node.js") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How does Node.js handle multiple I/O operations efficiently?",
      answer:
        "Node.js uses an event-driven architecture and asynchronous I/O so operations do not block the main execution flow.",
    };
  }

  // -----------------------------
  // Express.js
  // -----------------------------

  if (skill === "express.js") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is middleware in Express.js?",
      answer:
        "Middleware functions run during request processing and can modify requests, responses, handle authentication, or errors.",
    };
  }

  // -----------------------------
  // Git
  // -----------------------------

  if (skill === "git") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is the difference between Git merge and Git rebase?",
      answer:
        "Merge combines histories with a merge commit when needed, while rebase moves commits onto a new base.",
    };
  }

  // -----------------------------
  // GitHub
  // -----------------------------

  if (skill === "github") {
    return {
      category: "technical",
      difficulty: 1,
      question:
        "How do you use GitHub in a software development workflow?",
      answer:
        "GitHub can host repositories, pull requests, code reviews, issues, and collaboration workflows.",
    };
  }

  // -----------------------------
  // AWS
  // -----------------------------

  if (skill === "aws") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Which AWS services could you use to deploy a full-stack web application?",
      answer:
        "Possible services include EC2, ECS, Lambda, S3, RDS, CloudFront, and other services depending on the architecture.",
    };
  }

  // -----------------------------
  // Azure
  // -----------------------------

  if (skill === "azure") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What Azure services could be used to host a web application?",
      answer:
        "Azure App Service, Azure Functions, Azure Storage, and Azure databases are common options.",
    };
  }

  // -----------------------------
  // Docker
  // -----------------------------

  if (skill === "docker") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What problem does Docker solve in application deployment?",
      answer:
        "Docker packages applications and dependencies into portable containers, reducing environment differences between systems.",
    };
  }

  // -----------------------------
  // Linux
  // -----------------------------

  if (skill === "linux") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Which Linux commands would you use to inspect running processes and network ports?",
      answer:
        "Common commands include ps, top, lsof, ss, netstat, and related process or networking tools.",
    };
  }

  // -----------------------------
  // HTML
  // -----------------------------

  if (skill === "html") {
    return {
      category: "technical",
      difficulty: 1,
      question:
        "What is semantic HTML and why is it useful?",
      answer:
        "Semantic HTML uses meaningful elements such as header, nav, main, article, and footer to improve structure and accessibility.",
    };
  }

  // -----------------------------
  // CSS
  // -----------------------------

  if (skill === "css") {
    return {
      category: "technical",
      difficulty: 1,
      question:
        "Explain the CSS box model.",
      answer:
        "The box model consists of content, padding, border, and margin.",
    };
  }

  // -----------------------------
  // Testing
  // -----------------------------

  if (skill === "testing") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "Why is automated testing important in software development?",
      answer:
        "Automated tests detect regressions early, improve confidence in changes, and make repeated verification faster.",
    };
  }

  // -----------------------------
  // Jest
  // -----------------------------

  if (skill === "jest") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How would you use Jest to test a JavaScript function?",
      answer:
        "Create a test case, call the function with controlled inputs, and use Jest assertions to verify the result.",
    };
  }

  // -----------------------------
  // JUnit
  // -----------------------------

  if (skill === "junit") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "How do you write a unit test using JUnit?",
      answer:
        "Create a test method, arrange the inputs, execute the code, and assert the expected result.",
    };
  }

  // -----------------------------
  // Machine Learning
  // -----------------------------

  if (skill === "machine learning") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is the difference between supervised and unsupervised learning?",
      answer:
        "Supervised learning uses labeled data, while unsupervised learning finds patterns in unlabeled data.",
    };
  }

  // -----------------------------
  // TensorFlow
  // -----------------------------

  if (skill === "tensorflow") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is TensorFlow used for in machine learning?",
      answer:
        "TensorFlow is a framework for building, training, evaluating, and deploying machine learning models.",
    };
  }

  // -----------------------------
  // PyTorch
  // -----------------------------

  if (skill === "pytorch") {
    return {
      category: "technical",
      difficulty: 2,
      question:
        "What is PyTorch commonly used for?",
      answer:
        "PyTorch is a machine learning framework widely used for developing and training neural networks.",
    };
  }

  // -----------------------------
  // Generic technical requirement
  // -----------------------------

  return {
    category: "technical",
    difficulty: 1,
    question:
      `What is ${requirement.text}, and how would you use it in a software project?`,
    answer:
      `${requirement.text} is a stated technical requirement for this role. Explain its purpose and give a relevant project example.`,
  };
}

function generateBehaviouralQuestion(requirement) {
  const skill = normalizeRequirement(requirement.text);

  // -----------------------------
  // Problem solving
  // -----------------------------

  if (
    skill === "problem solving" ||
    skill === "problem-solving"
  ) {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a difficult technical problem you solved and how you approached it.",
      answer:
        "Use the STAR method: explain the situation, your task, the actions you took, and the measurable result.",
    };
  }

  // -----------------------------
  // Communication
  // -----------------------------

  if (skill === "communication") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a time you explained a technical issue to a non-technical person.",
      answer:
        "Focus on simplifying the explanation, checking understanding, and communicating the impact clearly.",
    };
  }

  // -----------------------------
  // Teamwork
  // -----------------------------

  if (skill === "teamwork") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a time you worked with a team to complete a challenging project.",
      answer:
        "Describe your responsibility, collaboration, challenges, actions, and the final team result.",
    };
  }

  // -----------------------------
  // Collaboration
  // -----------------------------

  if (skill === "collaboration") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Describe a situation where collaboration helped you solve a problem.",
      answer:
        "Explain how you worked with others, shared information, resolved differences, and achieved the result.",
    };
  }

  // -----------------------------
  // Leadership
  // -----------------------------

  if (skill === "leadership") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a situation where you took ownership or leadership.",
      answer:
        "Explain the situation, what you owned, how you guided others, and the result.",
    };
  }

  // -----------------------------
  // Adaptability
  // -----------------------------

  if (skill === "adaptability") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a time you had to adapt quickly to a change.",
      answer:
        "Explain the change, how you adjusted your approach, and what you learned.",
    };
  }

  // -----------------------------
  // Time management
  // -----------------------------

  if (skill === "time management") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "How do you prioritize tasks when you have multiple deadlines?",
      answer:
        "Explain how you assess urgency, importance, dependencies, and available time.",
    };
  }

  // -----------------------------
  // Mentoring
  // -----------------------------

  if (skill === "mentoring") {
    return {
      category: "behavioral",
      difficulty: 2,
      question:
        "Tell me about a time you helped someone learn a technical concept.",
      answer:
        "Explain how you identified their needs, simplified the concept, and checked their understanding.",
    };
  }

  // -----------------------------
  // Generic behavioural
  // -----------------------------

  return {
    category: "behavioral",
    difficulty: 1,
    question:
      `Tell me about a situation where you demonstrated ${requirement.text}.`,
    answer:
      `Use a specific example and explain the situation, your actions, and the result.`,
  };
}

function generateDomainQuestion(requirement) {
  return {
    category: "domain",
    difficulty: 2,
    question:
      `How would you apply your knowledge of ${requirement.text} in a real project?`,
    answer:
      `Explain the relevant concept, describe a practical use case, and connect it to a project or business need.`,
  };
}

function generateQuestions(requirements) {
  if (!Array.isArray(requirements)) {
    return [];
  }

  const questions = [];

  requirements.forEach((requirement, index) => {
    if (
      !requirement ||
      typeof requirement !== "object" ||
      !requirement.id ||
      !requirement.text
    ) {
      return;
    }

    let generated;

    if (requirement.kind === "technical") {
      generated = generateTechnicalQuestion(
        requirement,
        index
      );
    } else if (requirement.kind === "behavioural") {
      generated = generateBehaviouralQuestion(
        requirement
      );
    } else {
      generated = generateDomainQuestion(requirement);
    }

    questions.push(
      createQuestion({
        id: `q${index + 1}`,
        requirement,
        category: generated.category,
        difficulty: Math.min(
          3,
          Math.max(1, generated.difficulty)
        ),
        question: generated.question,
        answer: generated.answer,
      })
    );
  });

  return questions;
}

function buildCoverage(requirements, questions) {
  const items = requirements.map((requirement) => {
    const matchingQuestionIds = questions
      .filter(
        (question) =>
          question.requirement_id === requirement.id
      )
      .map((question) => question.id);

    return {
      requirement_id: requirement.id,
      covered_by_question_ids: matchingQuestionIds,
      status:
        matchingQuestionIds.length > 0
          ? "covered"
          : "uncovered",
    };
  });

  const coveredRequirements = items.filter(
    (item) => item.status === "covered"
  ).length;

  return {
    total_requirements: requirements.length,
    covered_requirements: coveredRequirements,
    uncovered_requirements:
      requirements.length - coveredRequirements,
    items,
  };
}

module.exports = {
  generateQuestions,
  buildCoverage,
};