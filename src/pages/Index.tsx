import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  Laptop,
  ListChecks,
  MessageCircle,
  Moon,
  Smartphone,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import "@/styles/openmed-tokens.css";
import "@/styles/openmed-components.css";

const APP_STORAGE_KEYS = [
  "sb_welcomed",
  "sb_first_sheet_seen",
  "sb_first_deck_seen",
  "sb_sheet_hint_dismissed",
  "studybuddy_decks_v1",
  "studybuddy_history",
];

const hasUsedAppBefore = () =>
  APP_STORAGE_KEYS.some((key) => localStorage.getItem(key) !== null);

const CONTACT_EMAIL = "mailto:Osama200az@gmail.com";

const NAV_LINKS = [
  { href: "#playground", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#qbank", label: "QBank" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  {
    name: "Pick your topic",
    desc: "Type any subject — we map it to the concepts that actually get examined",
  },
  {
    name: "Get a study sheet",
    desc: "Structured notes with memory hooks, exam traps, and PubMed citations",
  },
  {
    name: "Drill the QBank",
    desc: "Adaptive MCQs that track which domains you keep getting wrong",
  },
  {
    name: "Review with AI",
    desc: "Instant explanations tied to evidence, plus flashcards on spaced repetition",
  },
];

const RUNTIMES = [
  {
    icon: Laptop,
    eyebrow: "Web app",
    title: "Full feature set in your browser",
    desc: "No install, no setup. Open a tab and start generating.",
    link: { label: "Open StudyBuddy →", to: "/dashboard" },
  },
  {
    icon: Smartphone,
    eyebrow: "Mobile-ready",
    title: "Study between lectures",
    desc: "Optimized for the ten minutes you get on the go.",
    link: null,
  },
  {
    icon: Users,
    eyebrow: "Study groups",
    title: "Compete with classmates",
    desc: "Share decks and climb the leaderboard together.",
    link: null,
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI study sheets",
    desc: "Type a topic, get exam-focused notes with memory hooks and high-yield traps — not a wall of text.",
    tags: ["Structured", "Clinical"],
  },
  {
    icon: ListChecks,
    title: "Smart QBank",
    desc: "USMLE-style MCQs with domain filters and session resume. Your weak spots surface on their own.",
    tags: ["Adaptive", "Spaced rep"],
  },
  {
    icon: BookOpen,
    title: "Curriculum roadmap",
    desc: "A structured spine through each system, so you always know what to study next.",
    tags: ["Guided", "Sequenced"],
  },
  {
    icon: BarChart3,
    title: "Progress tracking",
    desc: "Every session is scored and stored. See accuracy by domain across your whole history.",
    tags: ["Analytics", "Weak spots"],
  },
  {
    icon: MessageCircle,
    title: "AI explanations",
    desc: "Ask why an answer is right. Explanations cite peer-reviewed literature from PubMed.",
    tags: ["Evidence-based", "Instant"],
  },
  {
    icon: Trophy,
    title: "Flashcard decks",
    desc: "Auto-generated from any sheet, scheduled with SM-2 spaced repetition and an exam mode.",
    tags: ["Auto-built", "Exam mode"],
  },
];

const SUBJECT_FILTERS = [
  "All",
  "Cardiology",
  "Pharmacology",
  "Pathology",
  "Surgery",
  "Microbiology",
];

const SUBJECTS = [
  {
    name: "Cardiology",
    count: "320 questions",
    tags: ["ECG", "Heart failure", "Arrhythmias"],
    answered: "2.1K",
    featured: true,
  },
  {
    name: "Pharmacology",
    count: "280 questions",
    tags: ["Mechanisms", "Drug interactions"],
    answered: "1.8K",
  },
  {
    name: "Pathology",
    count: "240 questions",
    tags: ["Histology", "Systemic"],
    answered: "1.4K",
  },
  {
    name: "Surgery",
    count: "190 questions",
    tags: ["Pre-op", "Post-op", "Trauma"],
    answered: "890",
  },
  {
    name: "Microbiology",
    count: "210 questions",
    tags: ["Bacteria", "Viruses", "Parasites"],
    answered: "1.1K",
  },
  {
    name: "Anatomy",
    count: "160 questions",
    tags: ["Gross", "Neuroanatomy"],
    answered: "720",
  },
];

const FAQS = [
  {
    q: "What is StudyBuddy AI?",
    a: "An AI-powered study platform for medical students. You type a topic and get a structured study sheet, a flashcard deck on spaced repetition, and USMLE-style practice questions — each generation backed by PubMed-cited literature rather than an unsourced summary.",
  },
  {
    q: "Is it aligned with USMLE?",
    a: "Yes. Questions are written in USMLE Step 1 style — clinical vignette, single best answer, plausible distractors — and grounded in standard review material. Sheets and flashcards are tuned to what gets examined, not to what is merely true.",
  },
  {
    q: "How is this different from Anki or Amboss?",
    a: "Anki gives you scheduling but you write every card yourself. Amboss gives you a fixed library you cannot change. StudyBuddy generates the sheet, the deck, and the questions from whatever topic you are actually studying this week, then schedules the review for you.",
  },
  {
    q: "Is my data private?",
    a: "Your study history and generated content are tied to your own account and are not shared with other users or sold. You can use the app anonymously — no email required — and your work is preserved if you later create an account.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. The web app is fully responsive, so sheets, flashcards, and QBank sessions all work in a mobile browser. A QBank session that gets interrupted is saved and can be resumed later.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes the study-sheet generator, flashcards, and QBank with a daily generation limit. Pro lifts the limits and unlocks the premium model.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  // Same seeding rule as the in-app ThemeToggle: stored choice wins, else OS preference.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasUsedAppBefore()) {
      navigate("/dashboard", { replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  // Anchor links need smooth scrolling, but only while this page is mounted.
  useEffect(() => {
    document.documentElement.classList.add("openmed-page");
    return () => document.documentElement.classList.remove("openmed-page");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (!ready) return;
    const sections = rootRef.current?.querySelectorAll("[data-screen]");
    if (!sections?.length) return;

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ready]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!ready) return null;

  const visibleSubjects =
    filter === "All" ? SUBJECTS : SUBJECTS.filter((s) => s.name === filter);

  return (
    <div className="openmed" ref={rootRef}>
      <header className={menuOpen ? "nav menu-open" : "nav"}>
        <div className="container nav-inner">
          <Link to="/" className="logo" aria-label="StudyBuddy home">
            <span className="wordmark">StudyBuddy</span>
            <span className="version-tag">Beta</span>
          </Link>

          <nav className="nav-menu" id="primaryNav" aria-label="Primary">
            <ul className="nav-links">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} onClick={() => setMenuOpen(false)}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard?start=sheet")}
            >
              <span className="btn-label">Get early access</span>
              <ArrowRight className="icon" size={16} strokeWidth={1.6} />
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title="Toggle theme"
            >
              {isDark ? (
                <Sun size={16} strokeWidth={1.6} />
              ) : (
                <Moon size={16} strokeWidth={1.6} />
              )}
            </button>
            <button
              className="nav-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="primaryNav"
            >
              <span className="nav-toggle-bar" aria-hidden="true" />
              <span className="nav-toggle-bar" aria-hidden="true" />
              <span className="nav-toggle-bar" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section id="home" className="hero bg-grid" data-screen>
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">StudyBuddy AI · Built for Medical Students</div>
              <h1 className="display-xl hero-title">
                Study smarter. Score higher.{" "}
                <span className="serif-italic">Pass.</span>
              </h1>
              <p className="body-lg hero-desc">
                StudyBuddy turns your curriculum into AI-powered sheets, questions, and
                explanations — so{" "}
                <span
                  style={{
                    background: "var(--highlight)",
                    color: "#0E1116",
                    padding: "0 .2em",
                    borderRadius: "3px",
                  }}
                >
                  every study hour compounds
                </span>
                . Built by a medical student, for medical students in MENA and beyond.
              </p>

              <div className="hero-ctas">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate("/dashboard?start=sheet")}
                >
                  Start for free
                  <ArrowRight className="icon" size={18} strokeWidth={1.6} />
                </button>
                <a className="btn btn-outline btn-lg" href="#playground">
                  See how it works
                </a>
              </div>

              <div className="hero-meta">
                <span className="pip">AI study sheets</span>
                <span>·</span>
                <span className="pip">Smart QBank</span>
                <span>·</span>
                <span className="pip">USMLE-focused</span>
                <span>·</span>
                <span className="pip">PubMed-cited</span>
              </div>
            </div>

            <div>
              <div className="phi-card">
                <div className="phi-head">
                  <div className="phi-head-left">
                    <span>question · cardiology</span>
                  </div>
                  <span className="phi-count">Q 14 / 50</span>
                </div>
                <pre className="phi-body">
                  {`A 58-year-old man presents with
crushing chest pain radiating to
his left arm for 40 minutes.

ECG shows ST elevation in leads
II, III, and aVF.

`}
                  <span className="phi-token revealed" data-k="DATE">
                    Most likely diagnosis?
                  </span>
                  {`

A. NSTEMI
B. `}
                  <span className="phi-token revealed" data-k="NAME">
                    Inferior STEMI
                  </span>
                  {`
C. Unstable angina
D. Pericarditis`}
                </pre>
                <div className="phi-foot">
                  <span>
                    Cardiology · <span className="lang-val">USMLE Step 1</span>
                  </span>
                  <div className="phi-foot-right">
                    <div className="phi-foot-dot" />
                    <span>AI explanation ready</span>
                  </div>
                </div>
              </div>
              <div className="hero-caption">
                <span>Live QBank question · adaptive mode</span>
                <span className="play">▶ try it</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Stat band ---------- */}
        <section className="statband" aria-label="Traction stats">
          <div className="container">
            <div className="statband-head">
              <span className="statband-eyebrow">Traction</span>
              <span className="statband-desc">
                Growing across MENA, one study session at a time.
              </span>
              <span className="statband-meta">Updated July 2026</span>
            </div>
            <div className="statband-grid">
              <div className="statband-cell">
                <div className="statband-num">2,400+</div>
                <div className="statband-label">Active students</div>
              </div>
              <div className="statband-cell">
                <div className="statband-num">18K+</div>
                <div className="statband-label">Questions answered</div>
              </div>
              <div className="statband-cell">
                <div className="statband-num">94%</div>
                <div className="statband-label">Reported improvement</div>
              </div>
              <div className="statband-cell">
                <div className="statband-num">&lt;5min</div>
                <div className="statband-label">To first study sheet</div>
              </div>
            </div>
            <div className="statband-grid statband-grid--secondary">
              <div className="statband-cell">
                <div className="statband-num statband-num--sm">12</div>
                <div className="statband-label">Subjects covered</div>
              </div>
              <div className="statband-cell">
                <div className="statband-num statband-num--sm">USMLE</div>
                <div className="statband-label">Exam track, with more on the way</div>
              </div>
            </div>
            <div className="statband-foot">
              <span className="statband-meta">Every subject, one workflow</span>
              <span className="statband-pills">
                {["Medicine", "Surgery", "Pharmacology", "Pathology", "Microbiology", "Anatomy"].map(
                  (pill) => (
                    <span className="statband-pill" key={pill}>
                      {pill}
                    </span>
                  ),
                )}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="playground" data-screen>
          <div className="container">
            <div className="playground-grid">
              <div className="playground-lead">
                <div className="eyebrow">How it works</div>
                <h2 className="display-lg">
                  Four steps to <span className="serif-italic">mastery</span>.
                </h2>
                <p className="body-lg">
                  No prompting, no setup. The same loop every time: study, test, review,
                  repeat.
                </p>
                <ul className="playground-list">
                  {STEPS.map(({ name, desc }) => (
                    <li key={name}>
                      <span className="playground-check">
                        <Check size={16} strokeWidth={1.6} />
                      </span>
                      <div>
                        <code className="code-inline">{name}</code>
                        <div className="body-sm" style={{ marginTop: 4 }}>
                          {desc}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="btn btn-primary" onClick={() => navigate("/qbank")}>
                  Explore the QBank
                  <ArrowUpRight className="icon" size={16} strokeWidth={1.6} />
                </button>
              </div>

              <div className="code-panel">
                <div className="code-head">
                  <div className="code-dots">
                    <span className="code-dot red" />
                    <span className="code-dot yellow" />
                    <span className="code-dot green" />
                  </div>
                  <span className="code-title">studybuddy · session</span>
                  <span className="code-copy">50 questions</span>
                </div>
                <div className="code-install">
                  <span className="code-install-prompt">›</span>
                  <code className="code-install-cmd">topic: acute coronary syndromes</code>
                </div>
                <div className="code-tabs">
                  <button className="code-tab active" type="button">
                    question
                  </button>
                  <button className="code-tab" type="button">
                    explanation
                  </button>
                  <button className="code-tab" type="button">
                    flashcards
                  </button>
                </div>
                <pre className="code-body">
                  <span className="cm">{`# Q14 · Cardiology · Step 1\n`}</span>
                  {`A 58-year-old man, crushing chest pain,\nST elevation in II, III, aVF.\n\n`}
                  <span className="kw">{`Answer`}</span>
                  {`  B. Inferior STEMI\n`}
                  <span className="kw">{`Vessel`}</span>
                  {`  right coronary artery `}
                  <span className="num">{`(80%)`}</span>
                  {`\n\n`}
                  <span className="cm">{`# Why not the others\n`}</span>
                  {`A. NSTEMI       `}
                  <span className="str">{`no ST elevation`}</span>
                  {`\nC. Angina       `}
                  <span className="str">{`resolves at rest`}</span>
                  {`\nD. Pericarditis `}
                  <span className="str">{`diffuse elevation`}</span>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Runtime trio ---------- */}
        <section id="anywhere" data-screen>
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Built to fit your study life</div>
              <h2 className="display-lg" style={{ maxWidth: "22ch" }}>
                The same experience, everywhere you study.
              </h2>
              <p className="body-lg" style={{ maxWidth: "62ch", marginTop: 16 }}>
                Between lectures, on the ward, or at 2am the night before an exam — your
                sheets, decks, and question history follow you.
              </p>
            </div>

            <div className="runtime-grid">
              {RUNTIMES.map(({ icon: Icon, eyebrow, title, desc, link }) => (
                <div className="runtime-cell" key={eyebrow}>
                  <div className="cell-icon">
                    <Icon size={22} strokeWidth={1.6} />
                  </div>
                  <div className="eyebrow muted">{eyebrow}</div>
                  <h3 className="heading-md">{title}</h3>
                  <p className="body-sm">{desc}</p>
                  {link ? (
                    <Link className="link-arrow" to={link.to}>
                      {link.label}
                    </Link>
                  ) : (
                    <span className="body-sm" style={{ color: "var(--fg-subtle)" }}>
                      Coming soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" data-screen>
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Core features</div>
              <h2 className="display-lg" style={{ maxWidth: "24ch" }}>
                Clinical AI for medical education, built for{" "}
                <span className="serif-italic">MENA</span>.
              </h2>
              <p className="body-lg" style={{ maxWidth: "62ch", marginTop: 16 }}>
                Every feature exists because a student lost hours to the problem it solves.
              </p>
            </div>

            <div className="deid-grid">
              {FEATURES.map(({ icon: Icon, title, desc, tags }) => (
                <div className="deid-cell" key={title}>
                  <div className="deid-icon">
                    <Icon size={16} strokeWidth={1.6} />
                  </div>
                  <h3 className="heading-sm">{title}</h3>
                  <p className="body-sm">{desc}</p>
                  <div className="tag-row">
                    {tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- QBank ---------- */}
        <section id="qbank" className="bg-panel-section" data-screen>
          <div className="container">
            <div className="section-head">
              <div className="tail">
                <div>
                  <div className="eyebrow">QBank</div>
                  <h2 className="display-lg" style={{ maxWidth: "18ch" }}>
                    High-yield questions, by <span className="serif-italic">subject</span>.
                  </h2>
                  <p className="body-lg" style={{ maxWidth: "58ch", marginTop: 16 }}>
                    USMLE-style vignettes with domain filters, session resume, and an
                    explanation for every distractor.
                  </p>
                </div>
                <button className="btn btn-outline" onClick={() => navigate("/qbank")}>
                  Open the QBank
                  <ArrowUpRight className="icon" size={16} strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div className="chips">
              {SUBJECT_FILTERS.map((name) => (
                <button
                  key={name}
                  className={filter === name ? "chip active" : "chip"}
                  onClick={() => setFilter(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="models-grid">
              {visibleSubjects.map(({ name, count, tags, answered, featured }) => (
                <Link className="model-cell" to="/qbank" key={name}>
                  {featured && <span className="model-featured">New</span>}
                  <div className="heading-sm model-name">{name}</div>
                  <div className="model-arch">{count}</div>
                  <div className="model-tags">
                    {tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="model-foot">
                    <span className="dl">
                      <strong>{answered}</strong> answered
                    </span>
                    <span className="open">
                      Start
                      <ArrowUpRight className="icon" size={12} strokeWidth={1.6} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Pricing ---------- */}
        <section id="pricing" data-screen>
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Pricing</div>
              <h2 className="display-lg" style={{ maxWidth: "20ch" }}>
                Free at the core. <span className="serif-italic">Real value.</span>
              </h2>
              <p className="body-lg" style={{ maxWidth: "66ch", marginTop: 16 }}>
                Start with everything you need to study. Upgrade only when the limits
                actually start to bite.
              </p>
            </div>

            <div className="product-duo">
              <div className="product-card">
                <div className="product-card-top">
                  <div className="product-wordmark">Free</div>
                  <span className="product-badge">Always free</span>
                </div>
                <h3>Everything to get started</h3>
                <p className="pdesc">
                  AI study sheets, flashcard decks with spaced repetition, QBank sessions,
                  and progress tracking. No credit card, no account required to begin.
                </p>
                <div className="product-built">
                  Includes a <b>premium AI</b> generation on your first sheet.
                </div>
                <button
                  className="product-cta"
                  onClick={() => navigate("/dashboard?start=sheet")}
                >
                  Start for free
                  <ArrowRight size={16} strokeWidth={1.6} />
                </button>
              </div>

              <div className="product-card dark">
                <div className="product-card-top">
                  <div className="product-wordmark">Pro</div>
                  <span className="product-badge">Contact for pricing</span>
                </div>
                <h3>Unlimited everything</h3>
                <p className="pdesc">
                  Unlimited sheets and questions, the premium Claude model on every
                  generation, full analytics, and new subjects first.
                </p>
                <div className="product-built">
                  Powered by <b>Claude Haiku 4.5</b> on every generation.
                </div>
                <a className="product-cta" href={CONTACT_EMAIL}>
                  Get in touch
                  <ArrowUpRight size={16} strokeWidth={1.6} />
                </a>
              </div>
            </div>

            <div className="deploy-strip">
              <div>
                <div className="eyebrow muted" style={{ marginBottom: 6 }}>
                  Institutions
                </div>
                <p className="body-sm" style={{ maxWidth: "62ch" }}>
                  Teaching a whole cohort? Medical schools and study groups can get
                  StudyBuddy for their students.
                </p>
              </div>
              <a className="btn btn-outline" href={CONTACT_EMAIL}>
                Contact for institution pricing
                <ArrowUpRight className="icon" size={16} strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </section>

        {/* ---------- Story ---------- */}
        <section id="story" className="research" data-screen>
          <div className="container research-grid">
            <div>
              <div className="research-eyebrow">Built on evidence · since 2025</div>
              <h2 className="display-lg">
                Started as a student problem. Grew into a{" "}
                <span className="serif-italic">platform</span>.
              </h2>
              <p className="body-lg">
                Every feature in StudyBuddy came from a real pain point — hours lost to
                passive reading, questions with no feedback, a curriculum with no
                structure. The problem got mapped before anything got built.
              </p>
              <div className="research-ctas">
                <button
                  className="research-btn-solid"
                  onClick={() => navigate("/dashboard?start=sheet")}
                >
                  Start for free
                  <ArrowRight size={14} strokeWidth={1.6} />
                </button>
                <a className="research-btn-outline" href="#faq">
                  Read the FAQ
                  <ArrowUpRight size={14} strokeWidth={1.6} />
                </a>
              </div>
            </div>
            <div className="research-stats">
              <div className="research-stat">
                <div className="num">
                  94<span className="suf">%</span>
                </div>
                <div className="lbl">Better retention</div>
                <div className="sub">reported, vs passive reading</div>
              </div>
              <div className="research-stat">
                <div className="num">
                  3<span className="suf">×</span>
                </div>
                <div className="lbl">More practice volume</div>
                <div className="sub">per study hour</div>
              </div>
              <div className="research-stat">
                <div className="num">USMLE</div>
                <div className="lbl">Exam track</div>
                <div className="sub">built-in question tagging by domain</div>
              </div>
              <div className="research-stat">
                <div className="num">Gaza</div>
                <div className="lbl">Origin story</div>
                <div className="sub">built in a conflict zone, shipped anyway</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" data-screen>
          <div className="container faq-grid">
            <div className="faq-lead">
              <div className="eyebrow">FAQ</div>
              <h2 className="display-lg">
                Questions from students, faculty, and the{" "}
                <span className="serif-italic">curious</span>.
              </h2>
              <p className="body-lg">
                If yours isn't here, email us — it reaches the person who builds the thing.
              </p>
            </div>
            <div className="faq-list">
              {FAQS.map(({ q, a }, i) => (
                <div className={openFaq === i ? "faq-item open" : "faq-item"} key={q}>
                  <button
                    className="faq-row"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <div className="heading-sm">{q}</div>
                    <div className="faq-plus" aria-hidden="true">
                      +
                    </div>
                  </button>
                  <div className="faq-body">
                    <p>{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Community CTA ---------- */}
        <section id="community" className="contribute" data-screen>
          <div className="container">
            <div className="eyebrow">Open invitation</div>
            <h2 className="display-lg contribute-title">
              2,400 students and counting.{" "}
              <span className="serif-italic">Built in the open.</span>
            </h2>
            <p className="body-lg contribute-desc">
              StudyBuddy started in Gaza and grew across MENA. If you're a medical student
              who wants better tools, start studying — or tell us what's missing.
            </p>
            <div className="contribute-ctas">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate("/dashboard?start=sheet")}
              >
                Get early access
                <ArrowRight className="icon" size={18} strokeWidth={1.6} />
              </button>
              <a className="btn btn-outline btn-lg" href={CONTACT_EMAIL}>
                Tell us what's missing
                <ArrowUpRight className="icon" size={18} strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-brand">
                <span className="wordmark">StudyBuddy</span>
              </div>
              <p className="body-sm" style={{ maxWidth: "38ch" }}>
                AI-powered study tools for medical students in MENA and beyond.
              </p>
            </div>

            <div className="footer-col">
              <div className="footer-col-head">Product</div>
              <ul>
                <li>
                  <Link to="/qbank">QBank</Link>
                </li>
                <li>
                  <Link to="/sheets">Study sheets</Link>
                </li>
                <li>
                  <Link to="/flashcards">Flashcards</Link>
                </li>
                <li>
                  <Link to="/roadmap">Roadmap</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col-head">Resources</div>
              <ul>
                <li>
                  <a href="#playground">How it works</a>
                </li>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col-head">Connect</div>
              <ul>
                <li>
                  <a href={CONTACT_EMAIL}>Email us</a>
                </li>
                <li>
                  <a href="https://wa.me/972592823030" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-foot">
            <span>© {new Date().getFullYear()} StudyBuddy AI · For educational use only</span>
            <span>Built by Osama Shihada · Gaza</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
