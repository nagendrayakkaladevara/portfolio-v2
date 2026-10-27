import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, RotateCcw, Square, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInterfaceSound } from '@/src/components/layout/site-layout';
import { CrtMascot, CrtAvatar } from './mascot';
import { usePortfolioChat } from './use-portfolio-chat';
import { getChatBounds } from './viewport';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [viewport, setViewport] = useState<ReturnType<typeof getChatBounds> | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { cue } = useInterfaceSound();
  const reduce = useReducedMotion();
  const chat = usePortfolioChat(open, pathname);
  const config = chat.configQuery.data;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  useLayoutEffect(() => {
    if (!open) return;
    const visible = window.visualViewport;
    const update = () => setViewport(getChatBounds({
      width: visible?.width ?? window.innerWidth,
      height: visible?.height ?? window.innerHeight,
      offsetLeft: visible?.offsetLeft ?? 0,
      offsetTop: visible?.offsetTop ?? 0,
      mobile: window.innerWidth < 640,
    }));
    update();
    visible?.addEventListener('resize', update);
    visible?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      visible?.removeEventListener('resize', update);
      visible?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  useEffect(() => {
    if (open && stickToBottom.current) { const container = scrollRef.current; if (container) container.scrollTop = container.scrollHeight; }
  }, [open, chat.messages, chat.busy]);
  const available = config?.enabled && !chat.configQuery.isError;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || chat.busy || chat.resetting || !available) return;
    stickToBottom.current = true;
    void chat.send(draft); setDraft(''); cue('select');
  }
  function chooseQuestion(question: string) { stickToBottom.current = true; void chat.send(question); cue('select'); }
  function followSource(url: string) {
    setOpen(false);
    if (/\.pdf(?:$|[?#])/.test(url)) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    navigate(url);
    const hash = url.split('#')[1];
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth' }));
  }
  return <Dialog open={open} onOpenChange={next => { setOpen(next); cue(next ? 'open' : 'close'); }}>
    <DialogTrigger asChild><CrtMascot aria-label="Ask about Sai" title="Ask about Sai — AI Agent">
      <span className="mascot-hint">Ask about Sai <span aria-hidden="true">↗</span></span>
    </CrtMascot></DialogTrigger>
    <DialogContent positioning="custom" className="chat-dialog" aria-labelledby="portfolio-chat-title" style={viewport ? { ...viewport, right: 'auto', bottom: 'auto', maxWidth: viewport.width, maxHeight: viewport.height, margin: 0, transform: 'none', translate: 'none' } : undefined} overlayClassName="chat-backdrop" showCloseButton={false} onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => { if (inputRef.current && !inputRef.current.disabled) inputRef.current.focus(); else document.getElementById('portfolio-chat-title')?.focus(); }); }}>
      <motion.div className="chat-shell" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
        <header className="chat-header"><div className="chat-header-identity"><CrtAvatar /><div><DialogTitle className="chat-title" id="portfolio-chat-title" tabIndex={-1}>{config?.title || 'Ask about Sai'}</DialogTitle><DialogDescription className="chat-description"><span className="chat-status-dot" />AI Agent{chat.mode === 'demo' ? ' · Demo' : ''}</DialogDescription></div></div>
          <div className="chat-header-actions"><Button variant="ghost" size="icon" className="chat-icon-button" aria-label="New chat" title="New chat" disabled={chat.busy || chat.resetting || !chat.messages.length} onClick={() => { void chat.reset(); setDraft(''); stickToBottom.current = true; }}><RotateCcw size={15} /></Button><DialogClose asChild><Button variant="ghost" size="icon" className="chat-icon-button" aria-label="Close chat" title="Close chat"><X size={17} /></Button></DialogClose></div>
        </header>
        <div className="chat-conversation" ref={scrollRef} role="region" aria-label="Conversation" tabIndex={0} onScroll={() => { const el = scrollRef.current; if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
          {chat.configQuery.isPending ? <p className="chat-loading" role="status">Getting ready…</p> : chat.configQuery.isError ? <div className="chat-unavailable" role="alert"><p>The AI Agent couldn’t connect.</p><button className="text-link" onClick={() => void chat.configQuery.refetch()}>Try again</button></div> : !config?.enabled ? <p className="chat-unavailable">The AI Agent is taking a short break. You can still explore the portfolio or get in touch directly.</p> : !chat.messages.length ? <div className="chat-welcome"><span className="chat-eyebrow">HELLO THERE</span><h3>Get to know<br /><span>Sai.</span></h3><p>{config.welcomeMessage}</p><div className="chat-suggestions">{config.suggestedQuestions.map(question => <button type="button" key={question} onClick={() => chooseQuestion(question)} disabled={chat.busy || chat.resetting}>{question}<ArrowUpRight size={13} aria-hidden="true" /></button>)}</div></div> : <ol className="chat-messages">{chat.messages.map(message => <li key={message.id} className={`chat-message chat-message-${message.role}`}>
            <span className="chat-message-author">{message.role === 'user' ? 'You' : 'AI Agent'}</span>
            <div className="chat-message-text">{message.text || (message.status === 'streaming' ? <span className="chat-thinking" aria-label="Thinking"><span /><span /><span /></span> : message.status === 'stopped' ? 'Reply stopped.' : 'No reply received.')}</div>
            {message.sources.length > 0 && <div className="chat-sources" aria-label="Sources">{message.sources.map(source => <button key={source.id} type="button" onClick={() => followSource(source.url)}>{source.title}<ArrowUpRight size={11} aria-hidden="true" /></button>)}</div>}
            {message.status === 'stopped' && message.text && <span className="chat-message-note">Reply stopped</span>}
            {message.status === 'error' && message.text && <span className="chat-message-note">Incomplete reply</span>}
          </li>)}</ol>}
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{chat.announcement}</div>
        {chat.error && <div className="chat-error" role="alert">{chat.error.message} {chat.error.retryable && <button type="button" className="text-link" onClick={chat.retry} disabled={chat.busy}>Retry</button>}</div>}
        <form className="chat-composer" onSubmit={submit}><div className="chat-input-wrap"><label className="sr-only" htmlFor="portfolio-chat-input">Ask a question about Sai</label><textarea id="portfolio-chat-input" ref={inputRef} rows={2} value={draft} onChange={event => setDraft(event.target.value)} maxLength={config?.maxMessageLength || 2000} placeholder="Ask about Sai’s work…" disabled={!available || chat.resetting} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !window.matchMedia('(pointer: coarse)').matches) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          {chat.busy ? <Button type="button" size="icon" className="chat-send" onClick={chat.stop} aria-label="Stop reply" title="Stop reply"><Square size={13} fill="currentColor" /></Button> : <Button type="submit" size="icon" className="chat-send" disabled={!draft.trim() || !available || chat.resetting} aria-label="Send message" title="Send message"><ArrowUp size={17} /></Button>}
        </div><div className="chat-composer-note"><span>{config?.disclaimer || (chat.mode === 'demo' ? 'Demo chat · answers from this portfolio' : 'AI answers can be imperfect. Check the sources.')}</span>{draft.length > (config?.maxMessageLength || 2000) * .8 && <span>{draft.length}/{config?.maxMessageLength || 2000}</span>}</div></form>
      </motion.div>
    </DialogContent>
  </Dialog>;
}
