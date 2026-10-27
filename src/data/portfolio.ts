export type ProjectIcon = 'github' | 'message' | 'contacts' | 'components' | 'button';

export interface Project {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: ProjectIcon;
  badge?: string;
  highlights?: { value: string; label: string }[];
}

export interface WorkProject {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  description: string;
  stack: string[];
  impact: string;
}

// Edit this file to update the portfolio without changing presentation components.
// Project links and achievement metrics are from the supplied March 2025 resume.
// Current GE Vernova role and Prodapt end date are from previously shared context.
export const portfolio = {
  name: 'Sai Nagendra',
  fullName: 'Sai Nagendra Yakkaladevara',
  role: 'Software developer, building thoughtful interfaces',
  avatar: import.meta.env.VITE_PROFILE_IMAGE_URL || undefined,
  initials: 'SN',
  location: 'Hyderabad, India',
  email: 'nagendrayakkaladevara@gmail.com',
  intro: 'I build useful products from the ground up: shaping the interface, writing the code, connecting the pieces, and making the experience feel simple.',
  current: {
    company: 'GE Vernova',
    role: 'Senior Software Developer',
    period: 'May 2025–present',
    description: 'I build user interfaces at GE Vernova, working on applications and reusable components for Grid Solutions.',
    note: 'Working with Angular, TypeScript, and a shared component ecosystem to make complex workflows feel intuitive.',
  },
  previous: {
    company: 'Prodapt Solutions',
    role: 'Software Developer',
    period: 'Mar 2022–May 2025',
    description: 'Built four products from the ground up, spanning employee learning, idea management, onboarding, and leadership dashboards.',
  },
  socials: [
    { label: 'GitHub', href: 'https://github.com/nagendrayakkaladevara' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sai-nagendra-yakkaladevara-67317419a/' },
    { label: 'Twitter', href: 'https://twitter.com/nagendra_s_y' },
    { label: 'Email', href: 'mailto:nagendrayakkaladevara@gmail.com' },
  ],
  resume: { href: import.meta.env.VITE_RESUME_URL || undefined, label: 'Resume', date: 'March 2025' },
  projects: [
    { id: 'github-wrapped', name: 'GitHub Wrapped', icon: 'github', href: 'https://wrappedgithub.netlify.app/', description: 'Your year on GitHub, brought together in a personal developer recap.', highlights: [{ value: 'GitHub', label: 'activity insights' }, { value: 'React', label: '+ TypeScript' }] },
    { id: 'preview-messenger', name: 'PreviewMessenger', icon: 'message', href: 'https://previewmessenger.netlify.app/', description: 'Real-time conversations. See what a friend is typing before they hit send.', highlights: [{ value: 'Live', label: 'typing previews' }, { value: 'WebSockets', label: 'powered' }] },
    { id: 'crew-contacts', name: 'Crew Contacts', icon: 'contacts', href: 'https://crewcontacts.netlify.app/', description: 'A simple contact book for crews, with hands-free voice search.' },
    { id: 'reuse-react', name: 'ReUseReact UI', icon: 'components', href: 'https://reusablereactui.netlify.app/', description: '15+ reusable React components. Flexible, lightweight, and easy to make your own.' },
  ] satisfies Project[],
  smallProjects: [
    { id: 'react-button', name: 'react-button', icon: 'button', href: 'https://www.npmjs.com/package/@nagendrayakkaladevara/react-button-component', description: 'A reusable, customizable React button.' },
  ] satisfies Project[],
  workProjects: [
    { id: 'university', name: 'Prodapt University', shortDescription: 'Employee learning, simplified', category: 'learning', description: 'An employee training platform that brings learning workflows into one place, built from the ground up with a React and TypeScript frontend and a Node.js backend.', stack: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB'], impact: 'Reduced manual effort by 74% and improved productivity by 65%, as recorded in my 2025 resume.' },
    { id: 'cii', name: 'CII', shortDescription: 'Ideas into action', category: 'collaboration', description: 'An idea management platform with multi-level approval and validation workflows, helping employees collaborate and move ideas forward.', stack: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'MongoDB'], impact: 'Designed and built the application from the ground up.' },
    { id: 'onboarding', name: '306090', shortDescription: 'A better start for every employee', category: 'automation', description: 'An employee onboarding platform with automatic task assignments and email triggers, built to make joining a team a smoother experience.', stack: ['React', 'TypeScript', 'Node.js', 'WebSockets', 'MongoDB'], impact: 'Eliminated manual onboarding effort through automation, as recorded in my 2025 resume.' },
    { id: 'edocket', name: 'eDocket', shortDescription: 'Clarity for leadership', category: 'analytics', description: 'A director-level dashboard for monitoring employee data, bringing together interactive charts and maps to support clearer decisions.', stack: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB'], impact: 'Improved efficiency by 80%, as recorded in my 2025 resume.' },
  ] satisfies WorkProject[],
  skills: [
    { category: 'Frontend', value: 'React · Angular · Next.js · TypeScript' },
    { category: 'Interfaces', value: 'Tailwind CSS · shadcn/ui · Material UI' },
    { category: 'Backend', value: 'Node.js · Express · REST APIs · WebSockets' },
    { category: 'Tools & data', value: 'MongoDB · Git · npm · AWS basics' },
  ],
  recognition: [{ title: 'Spotlight Award', detail: 'Prodapt · March 2024', description: 'Recognized for exceptional performance on the Prodapt University project.' }],
  education: { degree: 'Bachelor of Technology', institution: 'Gayatri Vidya Parishad College of Engineering', period: '2017–2021', detail: 'Autonomous · Engineering' },
  interests: [
    { id: 'building', title: 'Always building', eyebrow: 'Side projects', text: 'I enjoy turning everyday problems into small, useful products. Side projects are where I experiment, learn, and follow an idea all the way through.', icon: 'code' },
    { id: 'learning', title: 'Always curious', eyebrow: 'Learning', text: 'There is always something new to understand. I like exploring technologies, following industry trends, and expanding what I can build.', icon: 'book' },
    { id: 'balance', title: 'Beyond the screen', eyebrow: 'A little balance', text: 'Away from code, I make time for fitness and keeping up with the world. A little movement and a fresh perspective help me come back with more focus.', icon: 'activity' },
  ],
};
