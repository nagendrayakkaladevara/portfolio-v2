import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section id={id} className="portfolio-section" aria-labelledby={`${id}-title`}
      initial={reduce ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -25px 0px' }} transition={{ duration: 0.4 }}>
      <h2 id={`${id}-title`} className="section-label">{title}</h2>
      {children}
    </motion.section>
  );
}
