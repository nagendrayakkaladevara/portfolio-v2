import { ArrowUpRight, Braces, ContactRound, GitFork, MessageCircle, MousePointer2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project, ProjectIcon } from '../data/portfolio';

const icons = { github: GitFork, message: MessageCircle, contacts: ContactRound, components: Braces, button: MousePointer2 };

export function ProjectMark({ icon }: { icon: ProjectIcon }) {
  const Icon = icons[icon];
  return <span className={`project-mark mark-${icon}`}><Icon aria-hidden="true" size={15} strokeWidth={1.8} /></span>;
}

export function ProjectCard({ project, onActivate }: { project: Project; onActivate: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.a href={project.href} target="_blank" rel="noopener noreferrer" className="project-link"
      onClick={onActivate} whileHover={reduce ? undefined : { y: -2 }} whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }} aria-label={`${project.name} — open project in a new tab`}>
      <Card className="project-card">
        <div className="project-heading">
          <ProjectMark icon={project.icon} /><h3>{project.name}</h3>
          {project.badge && <Badge variant="outline" className="project-badge">{project.badge}</Badge>}
          <ArrowUpRight aria-hidden="true" className="external-arrow" size={12} />
        </div>
        <p className="project-description">{project.description}</p>
        {project.highlights && <div className="project-highlights">{project.highlights.map(item => <span key={item.label}><strong>{item.value}</strong> {item.label}</span>)}</div>}
      </Card>
    </motion.a>
  );
}
