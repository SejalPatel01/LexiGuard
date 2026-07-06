'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { 
  Scale, 
  Shield, 
  Sparkles, 
  Menu, 
  X, 
  Clock, 
  FileText, 
  CheckCircle, 
  Moon, 
  Sun, 
  Activity, 
  FileCheck, 
  Lock, 
  Languages, 
  ArrowRight, 
  ShieldAlert,
  HelpCircle,
  Sparkle,
  Search,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  onStartAnalysis: () => void;
}

export function LandingPage({ onStartAnalysis }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const [rippleStyle, setRippleStyle] = useState<React.CSSProperties>({});
  const [isRippling, setIsRippling] = useState(false);

  // 1. Scroll Spy using IntersectionObserver
  useEffect(() => {
    const sections = ['home', 'features', 'how-it-works', 'security', 'about'];
    const observerOptions = {
      root: null,
      rootMargin: '-35% 0px -40% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // 2. Scroll Reveal Animation Observer
  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', 'translate-y-5');
            entry.target.classList.add('opacity-100', 'translate-y-0');
          }
        });
      },
      { threshold: 0.05 }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => revealObserver.observe(el));

    return () => revealObserver.disconnect();
  }, []);

  // 3. Auto-cycle case workflow steps (2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 7);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleScrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Button compression and ripple click handler
  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    setRippleStyle({
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}px`,
      top: `${y}px`,
    });
    setIsRippling(true);

    setTimeout(() => {
      setIsRippling(false);
      onStartAnalysis();
    }, 300);
  };

  const workflowSteps = [
    { number: "1", title: "Describe Your Legal Issue", desc: "Type your situation in plain language or use voice intake.", icon: Sparkles },
    { number: "2", title: "Upload Documents", desc: "Securely upload agreements, receipts, or chat screenshots.", icon: PaperclipIcon },
    { number: "3", title: "AI Legal Analysis", desc: "Specialized agents dissect the facts and identify categories.", icon: Scale },
    { number: "4", title: "Case Strength Evaluation", desc: "Get an objective case strength rating and risk breakdown.", icon: Activity },
    { number: "5", title: "Legal Draft Generation", desc: "Generate professional legal demand notices and complaints.", icon: FileCheck },
    { number: "6", title: "Personalized Action Plan", desc: "Receive a step-by-step resolution timeline and checklist.", icon: Clock },
    { number: "7", title: "Ready to Proceed", desc: "You now have the guidance, evidence checklist, legal drafts, and action plan needed to confidently continue your legal journey.", icon: CheckCircle },
  ];

  const features = [
    { title: "AI Legal Analysis", desc: "Analyze legal situations using specialized AI agents.", icon: Scale, color: "from-purple-600 to-indigo-600" },
    { title: "Document Intelligence", desc: "Extract clauses, obligations, deadlines, and liabilities.", icon: FileText, color: "from-[#6366F1] to-purple-600" },
    { title: "Evidence Detection", desc: "Automatically identify matching and missing evidence.", icon: FileCheck, color: "from-purple-600 to-indigo-600" },
    { title: "Timeline Generator", desc: "Generate legal timelines and next steps.", icon: Clock, color: "from-[#6366F1] to-purple-600" },
    { title: "Draft Generator", desc: "Generate notices, complaints, and legal drafts.", icon: FileText, color: "from-purple-600 to-indigo-600" },
    { title: "Secure by Design", desc: "Prompt Injection Protection, Jailbreak Detection, PII Masking, and Output Validation.", icon: ShieldAlert, color: "from-purple-600 to-indigo-600" },
    { title: "Multi-language", desc: "Full support for English, Hindi (हिंदी), and Gujarati (ગુજરાતી).", icon: Languages, color: "from-purple-600 to-indigo-600" },
    { title: "Simple & Accessible", desc: "No legal expertise required. Designed for everyone.", icon: HelpCircle, color: "from-[#6366F1] to-purple-500" },
  ];

  const securityFeatures = [
    { title: "Prompt Injection Protection", desc: "Prevents alignment overrides or context hijacking.", icon: Shield },
    { title: "Jailbreak Detection", desc: "Safeguards against malicious behavioral exploits.", icon: ShieldAlert },
    { title: "Output Validation", desc: "Intercepts and blocks unintended data exposures.", icon: FileCheck },
    { title: "PII Masking", desc: "Automatically redacts Aadhaar, PAN, emails, and cards.", icon: Lock },
    { title: "File Validation", desc: "Enforces strict limits on upload sizes and mime types.", icon: FileText },
    { title: "Document Sanitization", desc: "Cleans text content before parsing to protect downstream LLMs.", icon: Sparkles },
    { title: "Security Event Logging", desc: "Audits threat occurrences to preserve case integrity.", icon: Activity },
    { title: "Abuse Protection", desc: "Detects spam and enforces client rate limits.", icon: Lock },
  ];

  return (
    <div className={cn(
      "w-full min-h-screen transition-colors duration-300 relative selection:bg-purple-500/20",
      theme === 'dark' ? "bg-[#080B11] text-slate-100" : "bg-[#FAF9FB] text-slate-900"
    )}>
      
      {/* Background Ambient Glows (Purple + Soft Indigo theme) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[60%] left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Sticky Navigation Bar */}
      <nav className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300",
        theme === 'dark' ? "border-indigo-950/80 bg-[#080B11]/80" : "border-slate-200/80 bg-[#FAF9FB]/80"
      )}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => handleScrollTo("home")}>
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-orange-500 text-white shadow-md shadow-purple-500/10 group-hover:scale-105 transition-transform duration-200">
              <Scale className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">LexiGuard</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider -mt-0.5">AI Legal Assistant</span>
            </div>
          </div>

          {/* Center Scroll Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {[
              { id: 'home', label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'how-it-works', label: 'How It Works' },
              { id: 'security', label: 'Security' },
              { id: 'about', label: 'About' }
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => handleScrollTo(item.id)} 
                  className={cn(
                    "relative py-1.5 transition-all duration-300",
                    isActive ? "text-purple-600 dark:text-purple-400 font-bold" : "text-muted-foreground hover:text-purple-600 dark:hover:text-slate-100"
                  )}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full animate-fade-in" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-full border transition-all duration-200 hover:bg-muted/80 hover:scale-105 active:scale-95",
                theme === 'dark' ? "border-zinc-800 text-amber-400" : "border-slate-200 text-slate-600"
              )}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button 
              onClick={handleCtaClick}
              className="relative overflow-hidden flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-5 py-2.5 text-sm font-semibold transition-all shadow-lg hover:shadow-purple-500/10 active:scale-[0.97]"
            >
              {isRippling && (
                <span className="absolute bg-white/20 rounded-full animate-ripple pointer-events-none" style={rippleStyle} />
              )}
              <Scale className="size-4" />
              <span>Start Legal Analysis</span>
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full border border-border text-foreground hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-border text-foreground hover:bg-muted"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className={cn(
            "md:hidden w-full border-b border-border/80 px-6 py-4 flex flex-col gap-4 text-sm font-semibold bg-background",
            theme === 'dark' ? "bg-[#080B11]" : "bg-[#FAF9FB]"
          )}>
            <button onClick={() => handleScrollTo("home")} className="text-left py-2 border-b border-border/50 hover:text-purple-600">Home</button>
            <button onClick={() => handleScrollTo("features")} className="text-left py-2 border-b border-border/50 hover:text-purple-600">Features</button>
            <button onClick={() => handleScrollTo("how-it-works")} className="text-left py-2 border-b border-border/50 hover:text-purple-600">How It Works</button>
            <button onClick={() => handleScrollTo("security")} className="text-left py-2 border-b border-border/50 hover:text-purple-600">Security</button>
            <button onClick={() => handleScrollTo("about")} className="text-left py-2 border-b border-border/50 hover:text-purple-600">About</button>
            <button 
              onClick={handleCtaClick}
              className="relative overflow-hidden flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full py-2.5 mt-2 font-bold shadow-md active:scale-95"
            >
              {isRippling && (
                <span className="absolute bg-white/20 rounded-full animate-ripple pointer-events-none" style={rippleStyle} />
              )}
              <Scale className="size-4" />
              <span>Start Legal Analysis</span>
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:py-24 grid md:grid-cols-12 gap-16 items-center scroll-reveal opacity-0 translate-y-5 transition-all duration-700 ease-out scroll-mt-20">
        {/* Left Info Column */}
        <div className="md:col-span-7 flex flex-col space-y-6">
          {/* Highlight Badge */}
          <div className={cn(
            "self-start flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md",
            theme === 'dark' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-500/10 border-amber-500/20 text-amber-600"
          )}>
            <Sparkle className="size-3.5 fill-amber-400 animate-pulse text-amber-500" />
            <span>Multi-Agent Legal Copilot</span>
          </div>

          {/* Heading with Orange Highlight Words */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-slate-900 dark:text-slate-100">
            AI-Powered <br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Legal Clarity.
            </span> <br />
            Anytime.
          </h1>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            LexiGuard is your intelligent legal companion that helps you understand disputes, analyze evidence, generate legal drafts, and confidently prepare your next legal step using AI.
          </p>

          <div className="flex flex-wrap items-center gap-y-3 gap-x-5 text-xs font-bold text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-4 text-purple-600 dark:text-purple-400" />
              Multi-Agent Intelligence
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-4 text-purple-600 dark:text-purple-400" />
              Privacy First
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-4 text-purple-600 dark:text-purple-400" />
              Secure by Design
            </span>
          </div>

          <div className="flex items-center gap-4 pt-2">
            {/* Primary CTA button with Royal Purple gradient and subtle purple hover shadow */}
            <button 
              onClick={handleCtaClick}
              className="relative overflow-hidden flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-8 py-3.5 text-base font-bold transition-all shadow-xl hover:shadow-purple-500/20 active:scale-[0.98]"
            >
              {isRippling && (
                <span className="absolute bg-white/20 rounded-full animate-ripple pointer-events-none" style={rippleStyle} />
              )}
              <Scale className="size-5" />
              <span>Start Legal Analysis</span>
            </button>
            {/* Secondary button with white bg and Soft Indigo borders */}
            <button 
              onClick={() => handleScrollTo("features")}
              className="flex items-center gap-1.5 text-sm font-extrabold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-950/80 hover:border-purple-600 dark:hover:border-purple-500 hover:bg-purple-50/10 rounded-full px-6 py-3 transition-all duration-300 group"
            >
              <span>Learn More</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Right Illustration Column */}
        <div className="md:col-span-5 relative flex justify-center">
          <div className="relative w-full max-w-[460px] aspect-square rounded-[2rem] overflow-visible flex items-center justify-center transform hover:scale-[1.03] transition-transform duration-500">
            {/* Ambient Backlight Glow (Purple + Indigo) */}
            <div className="absolute inset-4 rounded-[2rem] bg-purple-500/10 blur-3xl pointer-events-none" />
            
            {/* The generated 3D illustration */}
            <img 
              src="/legal_hero_illustration.png" 
              alt="LexiGuard Legal Engine" 
              className="object-contain w-full h-full drop-shadow-[0_20px_40px_rgba(99,102,241,0.2)] rounded-3xl"
            />
            
            {/* Intentionally Placed Floating Legal Icons (Only Purple / Navy / Gray) */}
            <div className="absolute top-[5%] left-[5%] size-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 backdrop-blur-sm animate-bounce shadow-md">
              <Scale className="size-5.5" />
            </div>
            <div className="absolute top-[40%] -right-3 size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 backdrop-blur-sm animate-pulse shadow-md">
              <Lock className="size-4.5" />
            </div>
            <div className="absolute -bottom-2 left-[20%] size-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 backdrop-blur-sm animate-bounce shadow-md" style={{ animationDelay: '1s' }}>
              <Shield className="size-5.5" />
            </div>
            <div className="absolute top-[15%] -right-4 size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 backdrop-blur-sm animate-pulse shadow-md" style={{ animationDelay: '0.5s' }}>
              <FileText className="size-4.5" />
            </div>
            <div className="absolute bottom-[20%] -left-4 size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 backdrop-blur-sm animate-pulse shadow-md" style={{ animationDelay: '1.5s' }}>
              <Search className="size-4.5" />
            </div>
            <div className="absolute -bottom-4 right-[15%] size-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 backdrop-blur-sm animate-bounce shadow-md" style={{ animationDelay: '0.8s' }}>
              <Building className="size-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60 scroll-reveal opacity-0 translate-y-5 transition-all duration-700 ease-out scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-sans">Why Choose LexiGuard?</h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            LexiGuard provides accessible, robust, and secure tools to guide individuals and small businesses through complex disputes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className={cn(
                  "p-7 rounded-2xl border transition-all duration-300 flex flex-col space-y-4 bg-card group hover:-translate-y-1.5 hover:shadow-lg",
                  theme === 'dark' 
                    ? "border-zinc-800/80 hover:border-purple-500/20 hover:shadow-purple-500/5" 
                    : "border-slate-200/80 hover:border-purple-500/10 hover:shadow-purple-500/4"
                )}
              >
                <div className={cn(
                  "size-10 rounded-xl bg-gradient-to-tr text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300",
                  feat.color
                )}>
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight group-hover:text-purple-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60 scroll-reveal opacity-0 translate-y-5 transition-all duration-700 ease-out scroll-mt-20 relative">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Intelligent Case Workflow</h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            LexiGuard orchestrates specialized agents to deliver structured evaluations, actionable tasks, and customized documents.
          </p>
        </div>

        {/* Workflow Track - Desktop (Horizontal) */}
        <div className="hidden lg:block py-6">
          <div className="grid grid-cols-7 gap-4 relative">
            {/* Connecting line follows Purple -> Soft Indigo gradients, aligned below the icons at top-[55px] */}
            <div className="absolute top-[55px] left-0 right-0 h-0.5 bg-border -translate-y-1/2 pointer-events-none" />
            <div 
              className="absolute top-[55px] left-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-500 -translate-y-1/2 transition-all duration-1000 ease-in-out pointer-events-none shadow-sm shadow-purple-500/25"
              style={{ width: `${(activeStep / 6) * 100}%` }}
            />

            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div 
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className="flex flex-col items-center text-center cursor-pointer group"
                >
                  {/* Step Bubble uses Purple -> Soft Indigo gradients */}
                  <div className={cn(
                    "size-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 z-10",
                    isCurrent 
                      ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-transparent scale-110 shadow-lg shadow-purple-500/30" 
                      : isActive
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/30 shadow-sm" 
                        : theme === 'dark' 
                          ? "bg-[#080B11] border-zinc-800 text-zinc-500" 
                          : "bg-white border-slate-200 text-slate-400"
                  )}>
                    <Icon className={cn("size-4.5", isCurrent && "animate-pulse text-white")} />
                  </div>

                  <span className={cn(
                    "text-[10px] font-extrabold mt-3 tracking-widest uppercase transition-colors duration-300",
                    isActive ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground/60"
                  )}>
                    Step {step.number}
                  </span>

                  <h4 className={cn(
                    "text-xs font-bold mt-1 max-w-[130px] line-clamp-2 transition-colors duration-300",
                    isCurrent ? "text-foreground font-black" : "text-muted-foreground hover:text-foreground"
                  )}>
                    {step.title}
                  </h4>
                </div>
              );
            })}
          </div>

          {/* Dynamic Active Step Details Card */}
          <div className={cn(
            "mt-12 p-7 rounded-2xl border backdrop-blur-md w-full max-w-xl mx-auto text-center transition-all duration-300 shadow-xl h-[175px] flex flex-col justify-center items-center space-y-2.5",
            theme === 'dark' ? "bg-indigo-950/20 border-zinc-800/80 shadow-indigo-950/10" : "bg-white/40 border-slate-200/80 shadow-slate-100"
          )}>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-purple-50/10 text-purple-600 border border-purple-500/20 uppercase tracking-widest shrink-0">
              Active Pipeline Stage
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">{workflowSteps[activeStep].title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">{workflowSteps[activeStep].desc}</p>
          </div>
        </div>

        {/* Workflow List - Mobile (Vertical) */}
        <div className="lg:hidden flex flex-col space-y-6">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = idx === activeStep;

            return (
              <div 
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={cn(
                  "p-5 rounded-xl border flex gap-4 items-start cursor-pointer transition-all duration-300",
                  isCurrent 
                    ? "bg-purple-500/5 border-purple-500/30 shadow-md" 
                    : "border-border/60 hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "size-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs border transition-colors",
                  isCurrent 
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-transparent" 
                    : "bg-muted text-muted-foreground border-border/80"
                )}>
                  <Icon className="size-4.5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600">Step {step.number}</span>
                    {isCurrent && <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />}
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Section (Enterprise-grade white/navy borders, purple icons) */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60 scroll-reveal opacity-0 translate-y-5 transition-all duration-700 ease-out scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md",
            theme === 'dark' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-purple-50 border-purple-100 text-purple-700"
          )}>
            <Shield className="size-3.5 text-purple-600 dark:text-purple-400" />
            <span>Enterprise-grade AI Security</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Protected Workflows</h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            LexiGuard routes every query through a dual-stage Security Gateway and masks PII outputs automatically.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {securityFeatures.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div 
                key={idx}
                className={cn(
                  "p-6 rounded-xl border flex flex-col space-y-3.5 shadow-sm hover:shadow-md transition-all duration-300",
                  theme === 'dark' 
                    ? "bg-indigo-950/20 border-indigo-950/60 hover:border-purple-500/20" 
                    : "bg-white border-indigo-100/60 hover:border-purple-500/10"
                )}
              >
                <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Icon className="size-4.5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">{sec.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-normal">{sec.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground italic flex items-center justify-center gap-1.5">
            <Lock className="size-3.5 text-purple-600 dark:text-purple-400" />
            Your legal data never leaves the protected workflow unnecessarily.
          </p>
        </div>
      </section>

      {/* Merged About & Final CTA Section (Navy headings, Purple accents, neutral backgrounds) */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60 scroll-reveal opacity-0 translate-y-5 transition-all duration-700 ease-out scroll-mt-20 flex flex-col justify-center min-h-[90vh] bg-gradient-to-b from-transparent to-purple-500/[0.01]">
        <div className="grid md:grid-cols-12 gap-12 items-center w-full mb-16">
          {/* Left Column: About, Mission, Tech badges */}
          <div className="md:col-span-7 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">About LexiGuard</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                LexiGuard is an AI-powered legal assistant built to simplify legal guidance for everyone. It combines a secure multi-agent architecture, intelligent document understanding, automated evidence analysis, and legal draft generation into one unified platform.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">Technology Stack</h4>
              <div className="flex flex-wrap gap-2">
                {["Google Gemini", "Google ADK", "MCP", "Next.js", "TypeScript"].map((tech, idx) => (
                  <span 
                    key={idx}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold border hover:scale-105 transition-transform duration-200 cursor-default",
                      theme === 'dark' ? "bg-zinc-800/40 border-zinc-700 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                    )}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Beautiful animated feature card "Empowering Accessible Justice" */}
          <div className="md:col-span-5 flex justify-center">
            <div className={cn(
              "w-full max-w-[340px] p-8 rounded-[2rem] border text-center space-y-4 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1",
              theme === 'dark' ? "border-indigo-950/60 bg-indigo-950/20" : "border-indigo-100/50 bg-white shadow-sm"
            )}>
              <div className="size-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mx-auto group-hover:scale-110 transition-transform duration-300">
                <Scale className="size-7" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-200">Empowering Accessible Justice</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combining modern AI capabilities with security controls to demystify complex agreements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Final CTA Block */}
        <div className="w-full text-center space-y-7 pt-8 border-t border-border/30">
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Ready to Get Legal Guidance?
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Start analyzing your legal issue with AI-powered legal assistance in seconds.
            </p>
          </div>
          
          <div>
            <button 
              onClick={handleCtaClick}
              className="relative overflow-hidden inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-8 py-3.5 text-base font-bold transition-all shadow-xl hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isRippling && (
                <span className="absolute bg-white/20 rounded-full animate-ripple pointer-events-none" style={rippleStyle} />
              )}
              <Scale className="size-5" />
              <span>Start Legal Analysis</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn(
        "border-t py-12 px-6 backdrop-blur-md",
        theme === 'dark' ? "border-indigo-950/60 bg-[#080B11]" : "border-slate-200 bg-[#FAF9FB]"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-tr from-purple-600 to-orange-500 text-white">
              <Scale className="size-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">LexiGuard</span>
              <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider -mt-0.5">AI-Powered Legal Assistant</span>
            </div>
          </div>

          {/* Built with details */}
          <div className="text-xs text-muted-foreground text-center leading-relaxed">
            Made with ❤️ using <br className="xs:hidden" />
            <span className="font-semibold text-foreground">Google Gemini</span>, <span className="font-semibold text-foreground">Google ADK</span>, <span className="font-semibold text-foreground">MCP</span>, <span className="font-semibold text-foreground">Next.js</span>, <span className="font-semibold text-foreground">TypeScript</span>
          </div>

          {/* Educational Project Details */}
          <div className="flex flex-col items-center md:items-end text-xs text-muted-foreground gap-0.5">
            <span className="font-bold text-foreground">⚖ Educational Project</span>
            <span>Built for the Google Agentic AI Hackathon</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/60">
          <span>© 2026 LexiGuard</span>
          <span>AI for Accessible Justice</span>
        </div>
      </footer>
    </div>
  );
}

// Temporary Paperclip Icon helper
function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
