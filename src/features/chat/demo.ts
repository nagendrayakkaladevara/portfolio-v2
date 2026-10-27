import config from '@/src/data/chat.json';
import { portfolio } from '@/src/data/portfolio';
import { chatConfigSchema, type ChatClient, type ChatEvent, type ChatRequest, type ChatSession, type ChatSource } from './contracts';

const source = (id: string, title: string, url: string): ChatSource => ({ id, title, url });
// Deliberately deterministic demo: only public portfolio fields, never private context.
export function getDemoReply(question: string): { text: string; sources: ChatSource[] } {
  const q = question.toLowerCase();
  if (/who are you|are you nagendra|real person|\bbot\b|\bassistant\b/.test(q)) return { text: 'I’m Nagendra’s portfolio AI Agent, not Nagendra himself. This is a demo that answers common questions from the public information in his portfolio.', sources: [source('profile', 'About Nagendra', '/')] };
  if (/salary|compensation|phone|address|confidential|password|system prompt|ignore .*instruction/.test(q)) return { text: 'I can help with the public information in this portfolio. I don’t have private details about Nagendra. For a specific question, you can contact him directly.', sources: [source('contact', 'Contact Nagendra', '/#contact')] };
  if (/contact|touch|email|hire|hiring|available|availability|freelance|opportunit/.test(q)) return { text: `You can reach Nagendra at ${portfolio.email}, or through the social links on his portfolio. I can’t confirm his current availability—he’s the best person to ask.`, sources: [source('contact', 'Contact & social links', '/#contact')] };
  const work = portfolio.workProjects.find(project => q.includes(project.name.toLowerCase()));
  if (work) return { text: `${work.name} — ${work.description}\n\nStack: ${work.stack.join(', ')}.\n\n${work.impact}`, sources: [source('selected-work', 'Selected work', '/#selected-work')] };
  const personal = portfolio.projects.find(project => q.includes(project.name.toLowerCase()));
  if (personal) return { text: `${personal.name} — ${personal.description}`, sources: [source('projects', 'Recent projects', '/#projects')] };
  if (/skill|stack|technolog|angular|typescript|react|backend/.test(q)) return { text: `His portfolio lists ${portfolio.skills.map(item => `${item.category.toLowerCase()}: ${item.value.replaceAll(' · ', ', ')}`).join('; ')}. At ${portfolio.current.company}, his work focuses on Angular, TypeScript, and shared UI components.`, sources: [source('skills', 'Toolkit', '/#toolkit'), source('work', 'Current work', '/')] };
  if (/project|built|build|product/.test(q)) return { text: `A few of his personal projects:\n\n${portfolio.projects.map(p => `${p.name} — ${p.description}`).join('\n\n')}\n\nHis professional work also includes ${portfolio.workProjects.map(p => p.name).join(', ')}.`, sources: [source('projects', 'Recent projects', '/#projects'), source('selected-work', 'Selected work', '/#selected-work')] };
  if (/education|college|degree|stud/.test(q)) return { text: `Nagendra completed a ${portfolio.education.degree} at ${portfolio.education.institution} (${portfolio.education.period}).`, sources: [source('education', 'Education', '/#education')] };
  if (/hobb|interest|outside|free time|enjoy/.test(q)) return { text: 'His portfolio describes an interest in side projects, learning new technologies, and fitness. He enjoys turning everyday problems into small, useful products.', sources: [source('interests', 'Beyond the code', '/#about')] };
  if (/writing|blog|article/.test(q)) return { text: 'The Writing section currently contains clearly labeled sample articles to demonstrate the reading experience. They should not be treated as Nagendra’s published writing yet.', sources: [source('writing', 'Writing', '/posts')] };
  if (/resume|cv/.test(q)) return { text: `You can download his ${portfolio.resume.date} resume from the portfolio. It is an older copy, so check the current work section or contact Nagendra for up-to-date details.`, sources: [source('resume', `${portfolio.resume.date} resume`, portfolio.resume.href)] };
  if (/work|experience|company|career|nagendra|yourself|about|^hi\b|^hello\b/.test(q)) return { text: `Nagendra is a ${portfolio.current.role} at ${portfolio.current.company} (${portfolio.current.period}). He builds interfaces and reusable components for Grid Solutions.\n\nPreviously, he worked at ${portfolio.previous.company} (${portfolio.previous.period}), building products for employee learning, onboarding, idea management, and leadership dashboards.`, sources: [source('profile', 'About Nagendra', '/'), source('selected-work', 'Selected work', '/#selected-work')] };
  return { text: 'I don’t have a verified answer to that in this demo. You can ask about Nagendra’s work, projects, skills, education, or contact details. For anything else, it’s best to ask him directly.', sources: [source('profile', 'Explore the portfolio', '/')] };
}
function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export class DemoChatClient implements ChatClient {
  readonly mode = 'demo';
  async getConfig(signal: AbortSignal) { signal.throwIfAborted(); return chatConfigSchema.parse(config); }
  async createSession(signal: AbortSignal) { signal.throwIfAborted(); return { id: crypto.randomUUID(), token: crypto.randomUUID(), expiresAt: new Date(Date.now() + 3_600_000).toISOString() }; }
  async *streamMessage(_session: ChatSession, request: ChatRequest, signal: AbortSignal): AsyncIterable<ChatEvent> {
    signal.throwIfAborted();
    const reply = getDemoReply(request.content);
    const messageId = crypto.randomUUID();
    yield { type: 'start', messageId, clientMessageId: request.clientMessageId };
    await pause(280, signal);
    for (const text of reply.text.match(/.{1,28}(?:\s|$)|.{1,28}/gs) || []) { await pause(16, signal); yield { type: 'delta', text }; }
    yield { type: 'done', messageId, text: reply.text, sources: reply.sources, finishReason: 'stop', knowledgeVersion: 'portfolio-demo-v1' };
  }
  async deleteSession(_session: ChatSession, signal: AbortSignal) { signal.throwIfAborted(); }
}
