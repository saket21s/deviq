import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
import emailjs from "emailjs-com";
import "./App.css";

/* ══════════════════════════════════════════
   ICONS
══════════════════════════════════════════ */
const IconGithub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.13v3.16c0 .3.2.66.79.55C20.22 21.41 23.5 17.1 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
  </svg>
);
const IconLinkedin = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/>
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M7 17 17 7M7 7h10v10"/>
  </svg>
);
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconCode = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconExternalLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */
const TYPED_STRINGS = [
  "Front-End Developer",
  "Java Enthusiast",
  "MCA Student",
  "React Developer",
  "Problem Solver",
];

const SKILLS = [
  { name: "React",       cat: "frontend", level: 85 },
  { name: "JavaScript",  cat: "frontend", level: 80 },
  { name: "HTML",        cat: "frontend", level: 95 },
  { name: "CSS",         cat: "frontend", level: 90 },
  { name: "Java",        cat: "backend",  level: 80 },
  { name: "Python",      cat: "backend",  level: 70 },
  { name: "SQL",         cat: "backend",  level: 75 },
  { name: "C++",         cat: "backend",  level: 65 },
  { name: "C",           cat: "backend",  level: 65 },
];

const PROJECTS = [
  { name:"Chess Game",       desc:"Fully playable browser chess with move validation and AI opponent logic.", link:"https://saketkhundia.github.io/chess-game",                          tag:"Game",        color:"#0e55ff", live:true, image:"/img/chess game.png" },
  { name:"Calculator App",   desc:"Clean, functional calculator with expression parsing and history.",        link:"https://advancedscientificcalculator.vercel.app/",                     tag:"Utility",     color:"#00b67a", live:true, image:"/img/Calculator.png" },
  { name:"quoteverse", desc:"Dynamic quote fetcher built in React with category filters and sharing.",  link:"https://quoteverse-one.vercel.app/",      tag:"React",       color:"#ff5c3e", live:true, image:"/img/quoteverse.png" },
  { name:"Solaris To-Do App",        desc:"Task management with local persistence, priority tags, and animations.",   link:"https://solaristodo.netlify.app/",                                    tag:"Productivity", color:"#8b5cf6", live:true, image:"/img/Solris.png" },
  { name:"DevIQ",            desc:"DevIQ unifies your GitHub, LeetCode, and Codeforces stats into a single score — with AI insights, contribution tracking, and head-to-head comparisons",  link:"https://deviq.online/",                                    tag:"Tool",          color:"#06b6d4", live:true, image:"/img/Deviq.png" },
];

const CERTS = [
  { title:"Java Programming",        issuer:"Coursera",       year:"2023", color:"#0e55ff" },
  { title:"React — The Full Guide",  issuer:"Udemy",          year:"2024", color:"#00b67a" },
  { title:"Python for Everybody",    issuer:"Coursera",       year:"2023", color:"#ff5c3e" },
  { title:"SQL Basics",              issuer:"HackerRank",     year:"2022", color:"#8b5cf6" },
];

/* ══════════════════════════════════════════
   SECTION TITLES MAP
══════════════════════════════════════════ */
const SECTION_TITLES = {
  home:      "Home | SaketKumar",
  about:     "About | SaketKumar",
  skills:    "Skills | SaketKumar",
  education: "Education | SaketKumar",
  projects:  "Projects | SaketKumar",
  certs:     "Certifications | SaketKumar",
  contact:   "Contact | SaketKumar",
};

/* ══════════════════════════════════════════
   HOOKS & COMPONENTS
══════════════════════════════════════════ */

// Typewriter
function useTyped(strings, speed = 80, pause = 1800) {
  const [display, setDisplay]   = useState("");
  const [idx, setIdx]           = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = strings[idx % strings.length];
    let t;
    if (!deleting && display === current)       t = setTimeout(() => setDeleting(true), pause);
    else if (deleting && display === "")        { setDeleting(false); setIdx(i => i + 1); return; }
    else t = setTimeout(() => setDisplay(deleting ? current.slice(0, display.length - 1) : current.slice(0, display.length + 1)), deleting ? speed / 2 : speed);
    return () => clearTimeout(t);
  }, [display, deleting, idx, strings, speed, pause]);
  return display;
}

// Animated counter
function Counter({ to, suffix = "+" }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let n = 0;
        const step = () => { n += Math.ceil(to / 50); if (n >= to) { setVal(to); return; } setVal(n); requestAnimationFrame(step); };
        requestAnimationFrame(step); obs.disconnect();
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// Ripple button
function RippleBtn({ children, className, onClick, type, ...props }) {
  const ref = useRef();
  const handle = e => {
    const r = ref.current.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.left = (e.clientX - r.left) + "px";
    s.style.top  = (e.clientY - r.top)  + "px";
    ref.current.appendChild(s);
    setTimeout(() => s.remove(), 700);
    if (onClick) onClick(e);
  };
  return <button ref={ref} className={className} onClick={handle} type={type} {...props}>{children}</button>;
}

// Particle canvas
function Particles() {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let W = cv.width = window.innerWidth, H = cv.height = window.innerHeight, raf;
    const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
    const dots = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      o: Math.random() * 0.35 + 0.08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const c = isDark() ? "180,180,255" : "14,85,255";
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c},${d.o})`; ctx.fill();
      });
      for (let i = 0; i < dots.length; i++)
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${c},${0.06*(1-dist/130)})`; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} className="particles-canvas" />;
}

// Skill bar
function SkillBar({ name, level, cat, delay }) {
  const ref = useRef();
  const [go, setGo] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); obs.disconnect(); } });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <motion.div ref={ref} className={`skill-bar-row cat-${cat}`}
      initial={{ opacity:0, x:-20 }} whileInView={{ opacity:1, x:0 }}
      viewport={{ once:true }} transition={{ duration:0.5, delay }}>
      <div className="sb-header">
        <span className="sb-name">{name}</span>
        <span className="sb-pct">{level}%</span>
      </div>
      <div className="sb-track">
        <div className="sb-fill" style={{ width: go ? `${level}%` : "0%", transitionDelay: `${delay}s` }} />
      </div>
    </motion.div>
  );
}

// ── TOAST SYSTEM ──
function ToastContainer({ toasts, remove }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className={`toast toast-${t.type}`}
            initial={{ opacity:0, y:40, scale:0.92 }}
            animate={{ opacity:1, y:0,  scale:1 }}
            exit={{    opacity:0, y:20, scale:0.88 }}
            transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}>
            <span className="toast-icon">
              {t.type === "success" && <IconCheck />}
              {t.type === "error"   && <IconX />}
              {t.type === "info"    && <IconInfo />}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => remove(t.id)}><IconX /></button>
            <div className="toast-bar" style={{ animationDuration: `${t.duration}ms` }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type, duration }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration + 400);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ── PAGE LOADER ──
function PageLoader({ done }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div className="page-loader"
          initial={{ opacity:1 }}
          exit={{ opacity:0, transition:{ duration:0.5, ease:[0.22,1,0.36,1] } }}>
          <motion.div className="loader-logo"
            initial={{ opacity:0, scale:0.8 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}>
            SK<em>.</em>
          </motion.div>
          <motion.div className="loader-bar-wrap"
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}>
            <motion.div className="loader-bar"
              initial={{ scaleX:0 }} animate={{ scaleX:1 }}
              transition={{ duration:1.1, ease:[0.22,1,0.36,1], delay:0.2 }} />
          </motion.div>
          <motion.p className="loader-text"
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>
            Loading portfolio…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── MAGNETIC BUTTON wrapper ──
function MagneticBtn({ children, className, href, onClick, type, target, rel }) {
  const ref  = useRef();
  const anim = useRef({ x:0, y:0 });
  const raf  = useRef();

  const onMove = e => {
    const el   = ref.current;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) * 0.35;
    const dy   = (e.clientY - cy) * 0.35;
    anim.current = { x: dx, y: dy };
    el.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const onLeave = () => {
    const el = ref.current;
    el.style.transition = "transform 0.5s cubic-bezier(0.22,1,0.36,1)";
    el.style.transform  = "translate(0,0)";
    setTimeout(() => { if (el) el.style.transition = ""; }, 500);
  };

  const props = { ref, className, onMouseMove:onMove, onMouseLeave:onLeave };

  if (href) return <a {...props} href={href} target={target} rel={rel}>{children}</a>;
  return <button {...props} onClick={onClick} type={type}>{children}</button>;
}

/* ══════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════ */
export default function App() {
  const [loaded,         setLoaded]         = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [activeSection,  setActiveSection]  = useState("home");
  const [activeSkillCat, setActiveSkillCat] = useState("all");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const { toasts, add: addToast, remove: removeToast } = useToast();

  // ── DYNAMIC PAGE TITLE based on active section ──
  useEffect(() => {
    document.title = SECTION_TITLES[activeSection] || "SaketKumar";
  }, [activeSection]);

  const formRef   = useRef();
  const cursorRef = useRef();
  const ringRef   = useRef();
  const rafRef    = useRef();
  const mousePos  = useRef({ x:0, y:0 });
  const ringPos   = useRef({ x:0, y:0 });
  const typed = useTyped(TYPED_STRINGS);

  // Scroll progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness:200, damping:30 });

  // Page loader — show for 1.8s
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // GPU cursor
  useEffect(() => {
    const onMove = e => {
      mousePos.current = { x:e.clientX, y:e.clientY };
      if (cursorRef.current) cursorRef.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    const loop = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.22;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.22;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ringPos.current.x}px,${ringPos.current.y}px)`;
      rafRef.current = requestAnimationFrame(loop);
    };
    document.addEventListener("mousemove", onMove);
    rafRef.current = requestAnimationFrame(loop);
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  const expandRing = () => {
    if (!ringRef.current) return;
    ringRef.current.style.width="56px"; ringRef.current.style.height="56px";
    ringRef.current.style.top="-28px";  ringRef.current.style.left="-28px";
    ringRef.current.style.borderColor="rgba(14,85,255,0.6)";
  };
  const shrinkRing = () => {
    if (!ringRef.current) return;
    ringRef.current.style.width="36px"; ringRef.current.style.height="36px";
    ringRef.current.style.top="-18px";  ringRef.current.style.left="-18px";
    ringRef.current.style.borderColor="rgba(14,85,255,0.3)";
  };
  const ih = { onMouseEnter:expandRing, onMouseLeave:shrinkRing };

  // Scroll spy
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { threshold:0.4 }
    );
    document.querySelectorAll("section[id]").forEach(s => obs.observe(s));
    return () => { window.removeEventListener("resize", onResize); obs.disconnect(); };
  }, []);

  useEffect(() => {
    const nav = document.querySelector(".navbar");
    const fn  = () => nav?.classList.toggle("scrolled", window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Hero 3D parallax - using framer-motion
  const { scrollY } = useScroll();
  const heroRotateX = useTransform(scrollY, [0, window.innerHeight], [0, 20]);
  const heroScale = useTransform(scrollY, [0, window.innerHeight], [1, 0.85]);
  const picY = useTransform(scrollY, [0, window.innerHeight], [0, 60]);
  const textY = useTransform(scrollY, [0, window.innerHeight], [0, 30]);

  useEffect(() => {
    const btn = document.getElementById("scrollTopBtn");
    const fn  = () => { if (btn) btn.style.display = window.scrollY > 500 ? "flex" : "none"; };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Email submit
  const sendEmail = e => {
    e.preventDefault();
    addToast({ message:"Sending your message…", type:"info", duration:2500 });
    emailjs.sendForm("service_50dvft5","template_v1ylskp",formRef.current,"gbiJWOPT8mAsiS4VL")
      .then(() => {
        formRef.current.reset();
        addToast({ message:"Message sent! I'll get back to you soon.", type:"success", duration:5000 });
      })
      .catch(() => addToast({ message:"Failed to send. Please try again.", type:"error", duration:5000 }));
  };

  // Resume download
  const downloadCV = async () => {
    try {
      const response = await fetch("/resume.pdf");
      if (!response.ok) {
        addToast({ message:"Resume not found. Please add resume.pdf to the public folder.", type:"error", duration:5000 });
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Saket_Kumar_Resume.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast({ message:"Resume downloaded successfully!", type:"success", duration:3000 });
    } catch (error) {
      addToast({ message:"Failed to download resume. Try again.", type:"error", duration:5000 });
    }
  };

  const filteredSkills = activeSkillCat === "all" ? SKILLS : SKILLS.filter(s => s.cat === activeSkillCat);
  const NAV = ["home","about","skills","education","projects","certs","contact"];
  const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.08 } } };
  const fadeUp  = { hidden:{ opacity:0, y:28 }, show:{ opacity:1, y:0, transition:{ duration:0.6, ease:[0.22,1,0.36,1] } } };

  return (
    <>
      {/* ── PAGE LOADER ── */}
      <PageLoader done={loaded} />

      <div className="app">
        {/* Scroll progress */}
        <motion.div className="scroll-progress" style={{ scaleX }} />

        {/* Particles */}
        <Particles />

        {/* Cursor */}
        <div className="cursor"      ref={cursorRef} />
        <div className="cursor-ring" ref={ringRef}   />

        {/* Toasts */}
        <ToastContainer toasts={toasts} remove={removeToast} />

        {/* ── NAVBAR ── */}
        <nav className="navbar">
          <span className="logo">SK<em>.</em></span>
          <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
            {NAV.map(id => (
              <li key={id}>
                <a href={`#${id}`} className={activeSection === id ? "active" : ""}
                  onClick={() => setMenuOpen(false)} {...ih}>
                  {id[0].toUpperCase() + id.slice(1)}
                </a>
              </li>
            ))}
          </ul>
          <div className="navbar-right">
            <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="Toggle theme" {...ih}>
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span className="toggle-icon">{dark ? <IconSun /> : <IconMoon />}</span>
            </button>
            <div className={`hamburger ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
              <span/><span/><span/>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section id="home" className="hero">
          <div className="blob blob-1"/><div className="blob blob-2"/><div className="blob blob-3"/>
          <motion.div className="hero-inner"
            style={{
              rotateX: heroRotateX,
              scale: heroScale,
            }}>
            <motion.div className="hero-pic-wrap"
              initial={{ opacity:0, scale:0.82 }} animate={{ opacity:1, scale:1 }}
              transition={{ duration:1.1, ease:[0.22,1,0.36,1] }}
              style={{
                y: picY,
              }}>
              <img src="https://raw.githubusercontent.com/saketkhundia/Saketkhundia.site/main/public/photo.jpg"
                alt="Saket Kumar" className="profile-pic" />
              <div className="pic-ring" />
              <div className="pic-ring pic-ring-2" />
            </motion.div>

            <motion.div className="hero-text"
              style={{
                y: textY,
              }}>
              <motion.p className="hero-eyebrow"
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.25, duration:0.7 }}>
                Available for opportunities
              </motion.p>
              <motion.h1 initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.38, duration:0.8, ease:[0.22,1,0.36,1] }}>
                Saket <br/><em>Kumar</em>
              </motion.h1>
              <motion.p className="hero-typed"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                transition={{ delay:0.55, duration:0.7 }}>
                <span className="typed-text">{typed}</span>
                <span className="typed-cursor">|</span>
              </motion.p>
              <motion.div className="hero-ctas"
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.7, duration:0.7 }}>
                <MagneticBtn href="#projects" className="btn-primary" {...ih}>
                  <IconCode /> View Projects
                </MagneticBtn>
                <MagneticBtn onClick={downloadCV} className="btn-cv" {...ih}>
                  <span className="btn-inner"><IconDownload /> Download CV</span>
                </MagneticBtn>
                <MagneticBtn href="#contact" className="btn-ghost" {...ih}>
                  Contact Me
                </MagneticBtn>
              </motion.div>
              <motion.div className="hero-socials"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                transition={{ delay:0.9, duration:0.7 }}>
                <a href="https://github.com/saketkhundia" target="_blank" rel="noreferrer" className="social-pill" {...ih}><IconGithub /> GitHub</a>
                <a href="https://www.linkedin.com/in/saketkhundia" target="_blank" rel="noreferrer" className="social-pill" {...ih}><IconLinkedin /> LinkedIn</a>
                <a href="mailto:saketkhundia21@gmail.com" className="social-pill" {...ih}><IconMail /> Email</a>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="hero-stats"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:1.05, duration:0.7 }}>
            {[
              { n:5,  suffix:"+",  label:"Projects Built" },
              { n:9,  suffix:"+",  label:"Technologies"   },
              { n:8,  suffix:".1", label:"BCA CGPA"       },
            ].map(({ n, suffix, label }) => (
              <div className="stat" key={label}>
                <strong><Counter to={n} suffix={suffix} /></strong>
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── ABOUT ── */}
        <section id="about" className="section">
          <div className="section-label">Who I Am</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>About Me</motion.h2>
          <div className="about-grid">
            <div>
              <motion.p className="section-body"
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ duration:0.7, delay:0.1 }}>
                I'm Saket Kumar — a passionate developer currently pursuing my <strong>MCA (2024–26)</strong> from
                Guru Jambheshwar University of Science and Technology. I completed my <strong>BCA (2021–24)</strong> from
                MDU Rohtak with an impressive <strong>8.1 CGPA</strong>. I love crafting clean, performant web experiences
                and am always chasing the intersection of great design and solid engineering.
              </motion.p>
              <motion.div className="learning-badge"
                initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ duration:0.6, delay:0.3 }}>
                <span className="lb-dot" />
                <span className="lb-label">Currently Learning</span>
                <span className="lb-items">Node.js · TypeScript · Next.js</span>
              </motion.div>
            </div>
            <motion.div className="about-cards"
              initial={{ opacity:0, x:20 }} whileInView={{ opacity:1, x:0 }}
              viewport={{ once:true }} transition={{ duration:0.7, delay:0.2 }}>
              {[
                { icon:"🎓", label:"Education",  value:"MCA @ GJUST"  },
                { icon:"💼", label:"Experience", value:"Fresher"       },
                { icon:"📍", label:"Location",   value:"India"         },
                { icon:"🌐", label:"Languages",  value:"Hindi, English"},
              ].map(c => (
                <div className="about-card" key={c.label} {...ih}>
                  <span className="ac-icon">{c.icon}</span>
                  <div><em>{c.label}</em><strong>{c.value}</strong></div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── SKILLS ── */}
        <section id="skills" className="section">
          <div className="section-label">What I Know</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>Skills</motion.h2>
          <div className="skill-filter">
            {["all","frontend","backend"].map(c => (
              <button key={c} className={`filter-btn ${activeSkillCat===c?"active":""}`}
                onClick={() => setActiveSkillCat(c)} {...ih}>
                {c[0].toUpperCase()+c.slice(1)}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeSkillCat} className="skills-bars"
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-10 }} transition={{ duration:0.35 }}>
              {filteredSkills.map((s,i) => <SkillBar key={s.name} {...s} delay={i*0.07} />)}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── EDUCATION ── */}
        <section id="education" className="section">
          <div className="section-label">My Journey</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>Education</motion.h2>
          <div className="timeline">
            {[
              { year:"2024 – 26", deg:"Master of Computer Applications",  school:"Guru Jambheshwar University of S&T", grade:"Pursuing" },
              { year:"2021 – 24", deg:"Bachelor of Computer Applications", school:"MDU Rohtak",                        grade:"8.1 CGPA" },
              { year:"Earlier",   deg:"Schooling",                          school:"Village School & Town High School", grade:""         },
            ].map((item,i) => (
              <motion.div key={i} className="timeline-item"
                initial={{ opacity:0, x:-24 }} whileInView={{ opacity:1, x:0 }}
                viewport={{ once:true }} transition={{ duration:0.6, delay:i*0.12 }} {...ih}>
                <div className="tl-dot" />
                <div className="tl-content">
                  <span className="tl-year">{item.year}</span>
                  <h3 className="tl-deg">{item.deg}</h3>
                  <p className="tl-school">{item.school}</p>
                  {item.grade && <span className="tl-grade">{item.grade}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PROJECTS ── */}
        <section id="projects" className="section">
          <div className="section-label">What I've Built</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>Projects</motion.h2>
          <motion.div className="projects-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}>
            {PROJECTS.map((proj,i) => (
              <motion.a key={i} variants={fadeUp}
                href={proj.link} target="_blank" rel="noreferrer"
                className="project-card" style={{ "--proj-color": proj.color }}
                onMouseEnter={expandRing} onMouseLeave={shrinkRing}>
                <div className="proj-image-wrapper">
                  <img src={proj.image} alt={proj.name} className="proj-image" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div className="proj-bar" />
                {proj.live && <div className="proj-live"><span className="proj-live-dot" /></div>}
                <div className="proj-tag">{proj.tag}</div>
                <h3 className="proj-name">{proj.name}</h3>
                <p className="proj-desc">{proj.desc}</p>
                <div className="proj-footer">
                  <span className="proj-link">View Project <IconArrow /></span>
                  <span className="proj-ext"><IconExternalLink /></span>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </section>

        {/* ── CERTIFICATIONS ── */}
        <section id="certs" className="section">
          <div className="section-label">Credentials</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>Certifications</motion.h2>
          <motion.div className="certs-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}>
            {CERTS.map((cert,i) => (
              <motion.div key={i} variants={fadeUp} className="cert-card"
                style={{ "--cert-color": cert.color }} {...ih}>
                <div className="cert-icon"><IconStar /></div>
                <div className="cert-body">
                  <h3 className="cert-title">{cert.title}</h3>
                  <p className="cert-meta">{cert.issuer} · {cert.year}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" className="section">
          <div className="section-label">Get In Touch</div>
          <motion.h2 className="section-title"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}>Contact Me</motion.h2>
          <div className="contact-grid">
            <div className="contact-info">
              <p className="contact-intro">Have an opportunity or just want to say hi? My inbox is always open.</p>
              <div className="contact-items">
                {[
                  { icon:<IconMail />,     label:"Email",    val:"saketkhundia21@gmail.com",     href:"mailto:saketkhundia21@gmail.com" },
                  // { icon:<IconPhone />,    label:"Phone",    val:"+91 8053457330",                 href:null },
                  { icon:<IconGithub />,   label:"GitHub",   val:"github.com/saketkhundia",        href:"https://github.com/saketkhundia" },
                  { icon:<IconLinkedin />, label:"LinkedIn", val:"linkedin.com/in/saketkhundia",   href:"https://www.linkedin.com/in/saketkhundia" },
                ].map(({ icon, label, val, href }) => {
                  const inner = <><span className="ci-icon">{icon}</span><span className="ci-text"><em>{label}</em>{val}</span></>;
                  return href
                    ? <a key={label} href={href} target={href.startsWith("http")?"_blank":undefined} rel="noreferrer" className="contact-item" {...ih}>{inner}</a>
                    : <div key={label} className="contact-item">{inner}</div>;
                })}
              </div>
            </div>
            <form ref={formRef} onSubmit={sendEmail} className="contact-form">
              <div className="form-row">
                <div className="form-field"><label>Name</label><input type="text" name="user_name" placeholder="Your name" required /></div>
                <div className="form-field"><label>Email</label><input type="email" name="user_email" placeholder="your@email.com" required /></div>
              </div>
              <div className="form-field"><label>Message</label><textarea name="message" rows="5" placeholder="Tell me what's on your mind…" required /></div>
              <RippleBtn type="submit" className="btn-primary" {...ih}>
                <span>Send Message</span>
              </RippleBtn>
            </form>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <span className="footer-logo">SK<em>.</em></span>
          <p>© 2025 Saket Kumar — Designed &amp; Built with care</p>
          <div className="footer-socials">
            <a href="https://github.com/saketkhundia"          target="_blank" rel="noreferrer" {...ih}><IconGithub /></a>
            <a href="https://www.linkedin.com/in/saketkhundia" target="_blank" rel="noreferrer" {...ih}><IconLinkedin /></a>
            <a href="mailto:saketkhundia21@gmail.com"          {...ih}><IconMail /></a>
          </div>
        </footer>

        <button id="scrollTopBtn"
          onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
          aria-label="Back to top">
          <IconChevron />
        </button>
      </div>
    </>
  );
}