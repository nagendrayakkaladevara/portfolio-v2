import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Activity, ArrowRight, ArrowUpRight, Award, BookOpen, Check, Code2, Copy, Download, GraduationCap, Mail, Volume2, VolumeX, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { portfolio, type WorkProject } from './data/portfolio';
import { ProjectCard, ProjectMark } from './components/project-card';
import { Section } from './components/section';
import { useInterfaceSound } from './components/layout/site-layout';
import { RecentWriting } from './features/writing/post-list';
import { PageMeta } from './components/layout/page-meta';


const interestIcons = { code: Code2, book: BookOpen, activity: Activity };

export function HomePage() {
  const { enabled: soundEnabled, toggle: toggleSound, cue } = useInterfaceSound();
  const reduce = useReducedMotion();
  const [company, setCompany] = useState<'current' | 'previous' | null>(null);
  const [work, setWork] = useState<WorkProject | null>(null);
  const [interest, setInterest] = useState('building');
  const [contactOpen, setContactOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const toggleCompany = (next: 'current' | 'previous') => {
    cue(company === next ? 'close' : 'open');
    setCompany(company === next ? null : next);
  };
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(portfolio.email);
      setCopyStatus('copied');
      cue('copy');
    } catch { setCopyStatus('failed'); }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main id="main" className="portfolio" tabIndex={-1}>
        <PageMeta title="Sai Nagendra — Software Developer" description="Thoughtful interfaces. Useful products. Selected work, projects, and writing." />
        <motion.section aria-label="Introduction" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <header className="intro-header">
            <Avatar className="profile-avatar"><AvatarImage src={portfolio.avatar} alt={portfolio.fullName} /><AvatarFallback>{portfolio.initials}</AvatarFallback></Avatar>
            <div><h1>{portfolio.name}</h1><p className="role">{portfolio.role}</p></div>
          </header>
          <p className="intro-copy">{portfolio.intro}</p>
          <div className="now-section">
            <h2 className="section-label">Now</h2>
            <p className="now-copy">I’m a {portfolio.current.role} at <button className="inline-company" aria-expanded={company === 'current'} aria-controls="company-detail" onClick={() => toggleCompany('current')}>{portfolio.current.company}</button>, building interfaces and reusable components for Grid Solutions.</p>
            <div className="current-links">
              <button className="company-pill" onClick={() => toggleCompany('current')} aria-expanded={company === 'current'} aria-controls="company-detail"><span className="ge-mark">GE</span> Grid Solutions <ArrowUpRight size={11} /></button>
              <a className="company-pill" href="#selected-work"><Code2 size={14} /> Frontend engineering <ArrowUpRight size={11} /></a>
              <a className="company-pill" href="#toolkit"><BracesMark /> UI systems <ArrowUpRight size={11} /></a>
            </div>
            <p className="context-note">{portfolio.current.note}</p>
            <p className="previous-copy">Before that, I built products from the ground up at <button className="inline-company" aria-expanded={company === 'previous'} aria-controls="company-detail" onClick={() => toggleCompany('previous')}>Prodapt</button>, across employee learning, onboarding, idea management, and leadership dashboards.</p>
            <div id="company-detail">
              <AnimatePresence initial={false} mode="wait">
                {company && <motion.div key={company} className="company-disclosure" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.22 }}>
                  <Card className="company-detail-card"><div className="company-detail-heading"><strong>{portfolio[company].company}</strong><Badge variant="outline">{company === 'current' ? 'Current' : 'Previous'}</Badge></div><p className="company-meta">{portfolio[company].role} · {portfolio[company].period}</p><p>{portfolio[company].description}</p></Card>
                </motion.div>}
              </AnimatePresence>
            </div>
          </div>
          <nav id="contact" className="social-links" aria-label="Social profiles and resume">
            {portfolio.socials.map((social, index) => <span className="social-item" key={social.label}>{social.label === 'Email' ? <button className="text-link" onClick={() => { setContactOpen(true); cue('open'); }}>{social.label}</button> : <a className="text-link" href={social.href} target="_blank" rel="noopener noreferrer">{social.label}</a>}{(index < portfolio.socials.length - 1 || portfolio.resume.href) && <span className="social-dot" aria-hidden="true">·</span>}</span>)}
            {portfolio.resume.href && <a className="text-link" href={portfolio.resume.href} target="_blank" rel="noopener noreferrer" title="View resume">{portfolio.resume.label} <Download size={11} aria-hidden="true" /></a>}
          </nav>
        </motion.section>

        <Section id="projects" title="Recent projects">
          <div className="project-grid">{portfolio.projects.map(project => <ProjectCard key={project.id} project={project} onActivate={() => cue('select')} />)}</div>
          <div className="small-projects">{portfolio.smallProjects.map(project => <a className="small-project" key={project.id} href={project.href} target="_blank" rel="noopener noreferrer" onClick={() => cue('select')}><ProjectMark icon={project.icon} /><span className="small-project-name">{project.name}</span><span className="small-project-description">{project.description}</span><ArrowUpRight className="external-arrow" size={12} aria-hidden="true" /></a>)}</div>
          <a className="more-link" href={portfolio.socials[0].href} target="_blank" rel="noopener noreferrer">More on GitHub <ArrowRight size={13} aria-hidden="true" /></a>
        </Section>

        <Section id="selected-work" title="Selected work">
          <div className="work-list">{portfolio.workProjects.map(project => <button key={project.id} className="work-row" onClick={() => { setWork(project); cue('open'); }} aria-label={`Read about ${project.name}`}>
            <span className={`work-thumbnail thumbnail-${project.id}`} aria-hidden="true">{project.id === 'university' ? <GraduationCap size={15} /> : project.id === 'cii' ? <Zap size={14} /> : project.id === 'onboarding' ? <span>30</span> : <Activity size={14} />}</span>
            <span className="work-name">{project.name}</span><span className="work-description">{project.shortDescription}</span><span className="work-category">{project.category}</span>
          </button>)}</div>
          <p className="section-note">Built during my time at Prodapt Solutions.</p>
        </Section>

        <Section id="toolkit" title="Toolkit">
          <dl className="skills-list">{portfolio.skills.map(skill => <div className="skill-row" key={skill.category}><dt>{skill.category}</dt><dd>{skill.value}</dd></div>)}</dl>
        </Section>

        <RecentWriting />

        <Section id="recognition" title="Recognition">
          {portfolio.recognition.map(award => <div key={award.title}><div className="recognition-line"><Award size={15} aria-hidden="true" /><span>{award.title}</span><span className="award-detail">{award.detail}</span></div><p className="recognition-description">{award.description}</p></div>)}
        </Section>

        <Section id="education" title="Education">
          <div className="education-heading"><span>{portfolio.education.degree}</span><span className="education-date">{portfolio.education.period}</span></div><p className="education-school">{portfolio.education.institution}</p>
        </Section>

        <Section id="about" title="Beyond the code">
          <div className="interest-row">{portfolio.interests.map((item, index) => {
            const active = item.id === interest;
            const Icon = interestIcons[item.icon as keyof typeof interestIcons];
            return <motion.button key={item.id} className={`interest-card ${active ? 'is-active' : ''}`} onClick={() => { setInterest(item.id); if (!active) cue('select'); }} animate={{ flexGrow: active ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }} aria-label={`Read ${item.title}`} aria-expanded={active}>
              {active ? <motion.div className="interest-content" key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.16 }}><p>{item.text}</p><div className="interest-person"><Icon size={21} aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.eyebrow}</span></div></div></motion.div> : <><span className="interest-number">0{index + 1}</span><span className="interest-vertical">{item.title}</span></>}
            </motion.button>;
          })}</div>
        </Section>

        <footer className="footer"><p>Based in {portfolio.location} · Open to a good conversation. <button className="text-link" onClick={() => { setContactOpen(true); cue('open'); }}>Say hi</button>.</p><button className="sound-toggle" aria-pressed={soundEnabled} onClick={toggleSound} title={`Turn interface sounds ${soundEnabled ? 'off' : 'on'}`}>{soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}<span>Sound {soundEnabled ? 'on' : 'off'}</span></button></footer>
      </main>

      <Dialog open={work !== null} onOpenChange={open => { if (!open) { setWork(null); cue('close'); } }}>
        <DialogContent className="detail-dialog"><DialogHeader><p className="dialog-eyebrow">Selected work · Prodapt</p><DialogTitle>{work?.name}</DialogTitle><DialogDescription>{work?.shortDescription}</DialogDescription></DialogHeader><p className="dialog-body">{work?.description}</p><div className="stack-badges">{work?.stack.map(tech => <Badge variant="secondary" key={tech}>{tech}</Badge>)}</div><div className="impact"><span>Impact</span><p>{work?.impact}</p></div></DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={open => { setContactOpen(open); if (!open) { setCopyStatus('idle'); cue('close'); } }}>
        <DialogContent className="detail-dialog contact-dialog"><DialogHeader><p className="dialog-eyebrow">Let’s connect</p><DialogTitle>A good conversation starts here.</DialogTitle><DialogDescription>Have an idea, a question, or just want to say hello?</DialogDescription></DialogHeader><a href={`mailto:${portfolio.email}`} className="contact-email">{portfolio.email}</a><div className="contact-actions"><Button asChild><a href={`mailto:${portfolio.email}`}><Mail size={15} /> Send an email</a></Button><Button variant="outline" onClick={copyEmail}>{copyStatus === 'copied' ? <Check size={15} /> : <Copy size={15} />}{copyStatus === 'copied' ? 'Copied' : 'Copy email'}</Button></div><p className="copy-feedback" role="status">{copyStatus === 'copied' ? 'Email address copied to clipboard.' : copyStatus === 'failed' ? 'Could not copy. Select the email address above to copy it manually.' : ''}</p></DialogContent>
      </Dialog>
    </MotionConfig>
  );
}

function BracesMark() { return <span className="braces-mark" aria-hidden="true">{ '{ }' }</span>; }
