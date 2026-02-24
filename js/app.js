// Import vocabulary data
import { vocabularyData } from '../data/vocabulary-data.js';

// --- STATE & UTILS ---
let currentView = "dashboard";
let currentFlashcardIndex = 0;
let filteredFlashcards = [];
let masteredItems = new Set();
let compositionChart = null;
let progressChart = null;

function normalizeType(rawType) {
  const type = String(rawType || "").trim().toLowerCase();

  if (type === "vocabulary" || type === "vocab" || type === "word") {
    return "vocabulary";
  }

  if (
    type === "phrasalverb" ||
    type === "phrasal_verbs" ||
    type === "phrasal_verb" ||
    type === "phrasal verbs" ||
    type === "phrasal-verb"
  ) {
    return "phrasal_verbs";
  }

  if (
    type === "idiom" ||
    type === "idioms" ||
    type === "slang" ||
    type === "idioms_slang" ||
    type === "idiom_slang"
  ) {
    return "idioms_slang";
  }

  if (type === "others" || type === "other" || type === "formal") {
    return "others";
  }

  return "others";
}

function typeLabel(type) {
  switch (type) {
    case "vocabulary":
      return "Vocabulary";
    case "phrasal_verbs":
      return "Phrasal Verbs";
    case "idioms_slang":
      return "Idioms & Slang";
    case "others":
    default:
      return "Others";
  }
}

function setMobileMenuOpen(isOpen) {
  const menu = document.getElementById("mobile-menu");
  const toggle = document.getElementById("mobile-menu-toggle");
  if (!menu || !toggle) return;

  menu.classList.toggle("hidden", !isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
}

// --- NAVIGATION ---
function switchView(viewName) {
  // Hide all sections
  ["dashboard", "flashcards", "idioms", "quiz"].forEach((id) => {
    const section = document.getElementById(`view-${id}`);
    if (section) {
      section.classList.add("hidden");
    }
    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
      btn.classList.remove(
        "text-slate-900",
        "text-slate-500",
        "text-indigo-600",
        "bg-indigo-50",
        "active"
      );
      btn.classList.add("text-slate-500");
    }
  });

  // Show selected section
  const selectedSection = document.getElementById(`view-${viewName}`);
  if (selectedSection) {
    selectedSection.classList.remove("hidden");
  }
  
  const activeBtn = document.getElementById(`btn-${viewName}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-slate-900", "text-slate-500");
    activeBtn.classList.add("text-indigo-600", "bg-indigo-50", "active");
  }

  // Mobile menu active state
  document.querySelectorAll(".mobile-nav-btn").forEach((btn) => {
    const btnView = btn.getAttribute("data-view");
    btn.classList.remove(
      "text-slate-900",
      "text-slate-500",
      "text-indigo-600",
      "bg-indigo-50",
      "active"
    );
    btn.classList.add("text-slate-500");
    if (btnView === viewName) {
      btn.classList.remove("text-slate-900", "text-slate-500");
      btn.classList.add("text-indigo-600", "bg-indigo-50", "active");
    }
  });

  currentView = viewName;

  // Trigger specific view setups
  if (viewName === "dashboard") updateDashboard();
  if (viewName === "flashcards") setupFlashcards();
  if (viewName === "idioms") renderIdioms();
  if (viewName === "quiz") {
    // Delay startQuiz to ensure DOM is updated
    setTimeout(startQuiz, 10);
  }
}

// --- DASHBOARD LOGIC ---
function updateDashboard() {
  document.getElementById("total-count").innerText =
    vocabularyData.length;
  document.getElementById("mastered-count").innerText =
    masteredItems.size;

  // Prepare Data for Charts
  const typeCounts = vocabularyData.reduce((acc, item) => {
    const t = normalizeType(item.type);
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const masteryData = [
    masteredItems.size,
    vocabularyData.length - masteredItems.size,
  ];

  // Render Composition Chart
  const ctxComp = document
    .getElementById("compositionChart")
    ?.getContext("2d");

  if (!ctxComp) {
    console.error("Canvas element for composition chart not found");
    return;
  }

  if (compositionChart) compositionChart.destroy();
  compositionChart = new Chart(ctxComp, {
    type: "doughnut",
    data: {
      labels: ["Vocabulary", "Phrasal Verbs", "Idioms & Slang", "Others"],
      datasets: [
        {
          data: [
            typeCounts.vocabulary || 0,
            typeCounts.phrasal_verbs || 0,
            typeCounts.idioms_slang || 0,
            typeCounts.others || 0,
          ],
          backgroundColor: ["#4f46e5", "#f59e0b", "#ec4899", "#10b981"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });

  // Render Progress Chart
  const ctxProg = document
    .getElementById("progressChart")
    ?.getContext("2d");
    
  if (!ctxProg) {
    console.error("Canvas element for progress chart not found");
    return;
  }
  
  if (progressChart) progressChart.destroy();
  progressChart = new Chart(ctxProg, {
    type: "bar",
    data: {
      labels: ["Mastered", "Remaining"],
      datasets: [
        {
          label: "Words",
          data: masteryData,
          backgroundColor: ["#10b981", "#e2e8f0"],
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

// --- FLASHCARD LOGIC ---
function setupFlashcards() {
  filterFlashcards(); // Initial filter and load
}

function filterFlashcards() {
  const cat = document.getElementById("flashcard-category").value;
  if (cat === "all") {
    filteredFlashcards = [...vocabularyData];
  } else {
    filteredFlashcards = vocabularyData.filter(
      (item) => normalizeType(item.type) === cat
    );
  }
  // Shuffle
  filteredFlashcards.sort(() => Math.random() - 0.5);
  currentFlashcardIndex = 0;
  loadCard(0);
}

function renderEmptyFlashcardState() {
  const flashcardInner = document.getElementById("flashcard-inner");
  if (flashcardInner) {
    flashcardInner.classList.remove("flipped");
  }

  const cardCategory = document.getElementById("card-category");
  const cardFront = document.getElementById("card-front");
  const cardBack = document.getElementById("card-back");
  const cardCounter = document.getElementById("card-counter");

  if (cardCategory) cardCategory.innerText = "CATEGORY";
  if (cardFront) cardFront.innerText = "No items found";
  if (cardBack) cardBack.innerHTML = `<div class="definition">Try a different category.</div>`;
  if (cardCounter) cardCounter.innerText = "0 / 0";
}

function loadCard(index) {
  if (filteredFlashcards.length === 0) {
    renderEmptyFlashcardState();
    return;
  }
  const item = filteredFlashcards[index];

  // Reset Flip
  const flashcardInner = document.getElementById("flashcard-inner");
  if (flashcardInner) {
    flashcardInner.classList.remove("flipped");
  }

  // Update Content
  const cardCategory = document.getElementById("card-category");
  const cardFront = document.getElementById("card-front");
  const cardBack = document.getElementById("card-back");

  // Map the internal type to display-friendly names
  const displayCategory = typeLabel(normalizeType(item.type));

  if (cardCategory) cardCategory.innerText = displayCategory.toUpperCase();
  if (cardFront) cardFront.innerText = item.term;

  // Update back content with definition and example
  if (cardBack) {
    cardBack.innerHTML = `
      <div class="definition">${item.def}</div>
      <div class="example"><strong>Example:</strong> ${item.example}</div>
    `;
  }

  // Update Counter
  const cardCounter = document.getElementById("card-counter");
  if (cardCounter) cardCounter.innerText = `${index + 1} / ${filteredFlashcards.length}`;
}

function flipCard() {
  const flashcardInner = document.getElementById("flashcard-inner");
  if (flashcardInner) {
    flashcardInner.classList.toggle("flipped");
  }
}

function nextCard() {
  if (currentFlashcardIndex < filteredFlashcards.length - 1) {
    currentFlashcardIndex++;
    loadCard(currentFlashcardIndex);
  }
}

function prevCard() {
  if (currentFlashcardIndex > 0) {
    currentFlashcardIndex--;
    loadCard(currentFlashcardIndex);
  }
}

function markAsMastered() {
  const item = filteredFlashcards[currentFlashcardIndex];
  masteredItems.add(item.term);
  alert(`"${item.term}" marked as mastered!`);
  nextCard(); // Auto advance
}

// --- IDIOM WALL LOGIC ---
function renderIdioms() {
  const container = document.getElementById("idioms-grid");
  if (!container) return;

  container.innerHTML = "";

  // Separate Idioms and Slang from main data
  const idioms = vocabularyData.filter(
    (item) => normalizeType(item.type) === "idioms_slang"
  );

  if (idioms.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-6 rounded-lg border border-slate-100 text-slate-600">
        No idioms found in your data yet.
      </div>
    `;
    return;
  }

  idioms.forEach((item) => {
    const el = document.createElement("div");
    el.className =
      "idiom-card bg-white p-6 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group";
    el.innerHTML = `
      <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">${item.term}</h3>
      <p class="text-slate-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 idiom-definition">${item.def}</p>
      <p class="idiom-example text-slate-500 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">${item.example}</p>
      <div class="mt-2 text-xs text-slate-300 font-mono group-hover:hidden">Hover or tap to reveal</div>
    `;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.addEventListener("click", () => el.classList.toggle("revealed"));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.classList.toggle("revealed");
      }
    });
    container.appendChild(el);
  });

  filterIdioms();
}

function filterIdioms() {
  const query = document
    .getElementById("idiom-search")
    ?.value.toLowerCase();
    
  const cards = document.querySelectorAll(".idiom-card");
  if (!query) {
    cards.forEach((card) => card.classList.remove("hidden"));
    return;
  }
    
  cards.forEach((card) => {
    const text = card.innerText.toLowerCase();
    card.classList.toggle("hidden", !text.includes(query));
  });
}

// --- QUIZ LOGIC ---
let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;

function startQuiz() {
  // Generate 10 random questions from all categories
  const shuffled = [...vocabularyData].sort(() => 0.5 - Math.random());
  quizQuestions = shuffled.slice(0, 10);
  currentQuizIndex = 0;
  quizScore = 0;

  document.getElementById("quiz-results")?.classList.add("hidden");
  document.getElementById("quiz-container")?.classList.remove("hidden");
  loadQuestion();
}

function loadQuestion() {
  const q = quizQuestions[currentQuizIndex];
  document.getElementById("quiz-progress").innerText =
    `Question ${currentQuizIndex + 1} / 10`;
  document.getElementById("quiz-score").innerText = `Score: ${quizScore}`;
  document.getElementById("quiz-question").innerText =
    `What is the definition of "${q.term}"?`;

  document.getElementById("quiz-feedback")?.classList.add("hidden");
  document.getElementById("next-question-btn")?.classList.add("hidden");

  // Generate Options (1 Correct + 3 Distractors)
  const distractors = vocabularyData
    .filter((i) => i.term !== q.term)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map((i) => i.def);

  const options = [...distractors, q.def].sort(() => 0.5 - Math.random());

  const optionsContainer = document.getElementById("quiz-options");
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className =
      "quiz-option w-full text-left p-4 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition text-sm text-slate-700";
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(opt, q.def, btn);
    optionsContainer.appendChild(btn);
  });
}

function checkAnswer(selected, correct, btnElement) {
  // Disable all buttons
  const buttons = document.querySelectorAll("#quiz-options button");
  buttons.forEach((b) => (b.disabled = true));

  const feedback = document.getElementById("quiz-feedback");
  if (feedback) {
    feedback.classList.remove("hidden");
  }

  if (selected === correct) {
    quizScore++;
    btnElement.classList.add(
      "bg-emerald-100",
      "border-emerald-500",
      "text-emerald-900"
    );
    feedback.innerText = "Correct! Well done.";
    feedback.className =
      "mt-6 p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200";
  } else {
    btnElement.classList.add(
      "bg-red-50",
      "border-red-500",
      "text-red-900"
    );
    feedback.innerText = `Incorrect. The correct answer was: "${correct}"`;
    feedback.className =
      "mt-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200";
  }

  document.getElementById("next-question-btn")?.classList.remove("hidden");
}

function nextQuestion() {
  currentQuizIndex++;
  if (currentQuizIndex < quizQuestions.length) {
    loadQuestion();
  } else {
    showQuizResults();
  }
}

function showQuizResults() {
  document.getElementById("quiz-container")?.classList.add("hidden");
  document.getElementById("quiz-results")?.classList.remove("hidden");
  document.getElementById("final-score").innerText = `${quizScore} / 10`;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize and sync UI state
  switchView("dashboard");
  
  // Add click event listeners to all nav buttons
  const navButtons = document.querySelectorAll('.nav-btn[id^="btn-"]');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      const viewName = this.id.replace('btn-', '');
      switchView(viewName);
    });
  });
  
  // Add click event listeners to mobile nav buttons
  const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
  mobileNavButtons.forEach(button => {
    button.addEventListener('click', function() {
      const viewName = this.getAttribute('data-view');
      switchView(viewName);
      setMobileMenuOpen(false);
    });
  });

  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      const isExpanded = mobileMenuToggle.getAttribute("aria-expanded") === "true";
      setMobileMenuOpen(!isExpanded);
    });
  }

  // Close mobile menu on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMobileMenuOpen(false);
  });

  // Idiom search (module-safe, no inline handlers)
  const idiomSearch = document.getElementById("idiom-search");
  if (idiomSearch) {
    idiomSearch.addEventListener("input", filterIdioms);
  }
  
  // Add event listener for next question button
  const nextQuestionBtn = document.getElementById('next-question-btn');
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', nextQuestion);
  }
  
  // Add event listener for try again button
  const tryAgainBtn = document.getElementById('try-again-btn');
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', startQuiz);
  }
  
  // Add event listener for flashcard flip
  const flashcardContainer = document.querySelector('.flashcard-container');
  if (flashcardContainer) {
    flashcardContainer.addEventListener('click', function(e) {
      // Prevent triggering flip when clicking on buttons inside the flashcard area
      if (!e.target.closest('button')) {
        flipCard();
      }
    });
  }
  
  // Add event listeners for flashcard navigation buttons
  const prevCardBtn = document.getElementById('prev-card-btn');
  const nextCardBtn = document.getElementById('next-card-btn');
  const markMasteredBtn = document.getElementById('mark-mastered-btn');
  
  if (prevCardBtn) {
    prevCardBtn.addEventListener('click', prevCard);
  }
  
  if (nextCardBtn) {
    nextCardBtn.addEventListener('click', nextCard);
  }
  
  if (markMasteredBtn) {
    markMasteredBtn.addEventListener('click', markAsMastered);
  }
  
  // Add event listener for category filter
  const categoryFilter = document.getElementById('flashcard-category');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterFlashcards);
  }
});
