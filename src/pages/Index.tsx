import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookMarked,
  Check,
  FileText,
  Laptop,
  Layers,
  ListChecks,
  Moon,
  Smartphone,
  Sparkles,
  Sun,
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

const CONTACT_EMAIL = "mailto:osama200az@gmail.com";

const SOCIALS = {
  instagram: "https://www.instagram.com/getstudybuddyai/",
  linkedin: "https://www.linkedin.com/company/studdybuddyai",
  telegram: "https://t.me/studybuddyai",
};

const NAV_LINKS = [
  { href: "#playground", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#qbank", label: "QBank" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  {
    name: "Enter a topic",
    desc: "Type any medical topic — no PDF upload needed. StudyBuddy AI maps it to your curriculum automatically.",
  },
  {
    name: "Get your study sheet",
    desc: "A structured clinical sheet with overview, pathophysiology, diagnosis, and management — in seconds.",
  },
  {
    name: "Practice with the QBank",
    desc: "Single-best-answer vignettes for the topic you just studied. The engine tracks what you get wrong.",
  },
  {
    name: "Review and repeat",
    desc: "Spaced repetition surfaces weak spots. Inline Enhance deepens any concept. PubMed links verify the evidence.",
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
    icon: FileText,
    title: "AI Study Sheets",
    desc: "Topic name in — structured clinical sheet out. Covers overview, pathophysiology, diagnosis, and management.",
    tags: ["GPT-OSS 20B", "Instant"],
  },
  {
    icon: ListChecks,
    title: "Smart QBank",
    desc: "Single-best-answer clinical vignettes with full explanations. Adaptive — the engine tracks your weak spots.",
    tags: ["Adaptive", "SM-2"],
  },
  {
    icon: Layers,
    title: "Flashcard Decks",
    desc: "Generate decks from any topic or import your own. Spaced repetition surfaces cards when retention is lowest.",
    tags: ["Spaced rep", "Auto-gen"],
  },
  {
    icon: BookMarked,
    title: "PubMed Citations",
    desc: "Every study sheet links to real PubMed sources via NIH E-utilities. Evidence-grounded, not hallucinated.",
    tags: ["Pro", "NIH API"],
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    desc: "Session history, subject coverage, and accuracy trends. See exactly where your knowledge gaps are.",
    tags: ["Dashboard", "Heatmap"],
  },
  {
    icon: Sparkles,
    title: "Inline Enhance",
    desc: "Highlight any term in a study sheet to pull up a deep-dive sidebar — like AMBOSS, built in.",
    tags: ["Pro", "Streaming"],
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
    arch: "ECG · Heart failure · Arrhythmias",
    tags: ["ECG", "Heart failure", "Arrhythmias"],
  },
  {
    name: "Pharmacology",
    arch: "Mechanisms · Drug interactions · Toxicology",
    tags: ["Mechanisms", "Drug interactions"],
  },
  {
    name: "Pathology",
    arch: "Histology · Systemic · Neoplasia",
    tags: ["Histology", "Systemic"],
  },
  {
    name: "Surgery",
    arch: "Pre-op assessment · Post-op care · Trauma",
    tags: ["Pre-op", "Post-op", "Trauma"],
  },
  {
    name: "Microbiology",
    arch: "Bacteriology · Virology · Parasitology",
    tags: ["Bacteria", "Viruses", "Parasites"],
  },
  {
    name: "Anatomy",
    arch: "Gross anatomy · Neuroanatomy · Embryology",
    tags: ["Gross", "Neuroanatomy"],
  },
];

const FAQS = [
  {
    q: "What is StudyBuddy AI?",
    a: "StudyBuddy AI is an AI-powered study platform built for medical students. Enter any topic and get a structured clinical study sheet, practice questions, and flashcard decks — all in one place. Built by a final-year medical student in Gaza, priced for MENA.",
  },
  {
    q: "Is it aligned with USMLE?",
    a: "Yes. The QBank is written in USMLE Step 1 style — clinical vignette, single best answer, plausible distractors — and questions are tagged by subject and domain so you can target your practice sessions. Arab Board tagging is on the roadmap.",
  },
  {
    q: "How is this different from Anki or Amboss?",
    a: "StudyBuddy AI generates content from any topic you name — no pre-made decks to buy, no textbook to upload. The Inline Enhance feature works like AMBOSS but is built directly into your study sheets. And it's designed for MENA pricing, not US pricing.",
  },
  {
    q: "Is my data private?",
    a: "Your study sheets, decks, and session history sync to your account via Supabase. We don't sell your data or share it with third parties. PubMed citations pull from NIH's public API.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes — StudyBuddy AI is fully mobile-optimized. A native app is on the roadmap.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes the full AI study sheet generator and QBank access with no credit card required. Pro ($5/mo) unlocks unlimited usage, PubMed citations, the Inline Enhance sidebar, and the Claude Haiku model tier.",
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
            <span className="wordmark">StudyBuddy AI</span>
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
                <span className="pip">AI Study Sheets</span>
                <span>·</span>
                <span className="pip">Smart QBank</span>
                <span>·</span>
                <span className="pip">USMLE-aligned</span>
                <span>·</span>
                <span className="pip">Built by an MD</span>
                <span>·</span>
                <span className="pip">Free to start</span>
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
              <span className="statband-eyebrow">Built for medical students</span>
              <span className="statband-desc">
                One workflow: study, practice, review — across every subject.
              </span>
            </div>
            <p
              className="body-lg"
              style={{
                color: "var(--fg-on-inverse-muted)",
                maxWidth: "58ch",
                margin: "32px auto 40px",
                textAlign: "center",
              }}
            >
              Growing across MENA — medical students using StudyBuddy AI to study smarter,
              practice better, and walk into exams with confidence.
            </p>
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
              {visibleSubjects.map(({ name, arch, tags }) => (
                <Link className="model-cell" to="/qbank" key={name}>
                  <div className="heading-sm model-name">{name}</div>
                  <div className="model-arch">{arch}</div>
                  <div className="model-tags">
                    {tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="model-foot">
                    <span className="open">
                      Open
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
                  <span className="product-badge">$5/mo</span>
                </div>
                <h3>Unlimited everything</h3>
                <p className="pdesc">
                  Unlimited AI case generation, full QBank access, spaced repetition
                  analytics, PubMed citations, priority model tier (Claude Haiku), and new
                  subjects as they ship.
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
              <span className="body-sm">
                Institutional pricing available for medical schools and NGOs.
              </span>
              <a className="btn btn-outline" href={CONTACT_EMAIL}>
                Contact us
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
                <div className="num" style={{ fontSize: "var(--fs-display-md)" }}>
                  USMLE
                </div>
                <div className="lbl">Step 1 &amp; 2 style</div>
                <div className="sub">
                  Questions tagged by subject and domain out of the box
                </div>
              </div>
              <div className="research-stat">
                <div className="num" style={{ fontSize: "var(--fs-display-md)" }}>
                  Adaptive
                </div>
                <div className="lbl">Spaced repetition engine</div>
                <div className="sub">SM-2 algorithm surfaces your weak spots automatically</div>
              </div>
              <div className="research-stat">
                <div className="num" style={{ fontSize: "var(--fs-display-md)" }}>
                  Free tier
                </div>
                <div className="lbl">No credit card required</div>
                <div className="sub">
                  Start with the full sheet generator and QBank, no payment needed
                </div>
              </div>
              <div className="research-stat">
                <div className="num" style={{ fontSize: "var(--fs-display-md)" }}>
                  MENA-first
                </div>
                <div className="lbl">Built in Gaza</div>
                <div className="sub">Priced and designed for students in underserved markets</div>
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
              Growing across MENA.{" "}
              <span className="serif-italic">Built in the open.</span>
            </h2>
            <p className="body-lg contribute-desc">
              StudyBuddy AI started in Gaza and is growing across the Arab world. If you're
              a medical student who wants better tools — join the early access list or
              follow the build on Instagram.
            </p>
            <div className="contribute-ctas">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate("/dashboard?start=sheet")}
              >
                Get early access
                <ArrowRight className="icon" size={18} strokeWidth={1.6} />
              </button>
              <a
                className="btn btn-outline btn-lg"
                href={SOCIALS.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on Instagram
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
                <span className="wordmark">StudyBuddy AI</span>
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
                  <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href={CONTACT_EMAIL}>Email us</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-foot">
            <span>© {new Date().getFullYear()} StudyBuddy AI</span>
            <span>Built by Osama Shihada · Gaza</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
