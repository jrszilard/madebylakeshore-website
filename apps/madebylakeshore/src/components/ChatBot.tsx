import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: 'up' | 'down';
}

const SESSION_KEY = 'mbl-chat-messages';
const LEAD_DISMISSED_KEY = 'mbl-chat-lead-dismissed';
const LEAD_CAPTURED_KEY = 'mbl-chat-lead-captured';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const INITIAL_MESSAGE: Message = {
  id: 'greeting',
  role: 'assistant',
  content: `Oh good, you found me. I'm the part of this website that actually talks back.

I specialize in design and data questions—the kind that make you stare at a spreadsheet wondering if the numbers are judging you, or squint at a layout thinking "something's off but I can't explain it."

Go ahead. Tell me what's haunting you.`
};

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  default: [
    "My team ignores our dashboards",
    "We need a brand but don't know where to start",
    "Our data is in too many different systems",
    "How do I make my reports look more professional?"
  ],
  design: [
    "We need a brand but don't know where to start",
    "Something looks off in our design but I can't explain it",
    "How do we build a visual system that scales?",
    "Our presentations look amateurish"
  ],
  data: [
    "My team ignores our dashboards",
    "Our data is in too many different systems",
    "We spend hours on reports that nobody reads",
    "How do I pick the right chart for my data?"
  ],
  ai: [
    "Where does AI actually add value for us?",
    "We want to automate but don't know where to start",
    "How do we avoid AI hype and find real use cases?",
    "Can AI help with our reporting workflow?"
  ],
};

// Lightweight markdown renderer for bot messages
// Handles: **bold**, *italic*, bullet lists, numbered lists, [links](url), `inline code`
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={key++} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} pl-4 space-y-1 my-2`}>
          {listItems}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  const renderInline = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={`b${match.index}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`i${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        parts.push(<code key={`c${match.index}`} className="bg-mbl-mist/50 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
      } else if (match[5] && match[6]) {
        const isInternal = match[6].startsWith('/');
        parts.push(
          <a
            key={`a${match.index}`}
            href={match[6]}
            className="text-mbl-accent underline hover:text-mbl-accent/80"
            {...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {match[5]}
          </a>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  };

  for (const line of lines) {
    const ulMatch = line.match(/^[-•*]\s+(.+)/);
    const olMatch = line.match(/^\d+[.)]\s+(.+)/);

    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={key++} className="text-sm">{renderInline(ulMatch[1])}</li>);
    } else if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={key++} className="text-sm">{renderInline(olMatch[1])}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={key++} className="h-2" />);
      } else {
        elements.push(<p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
      }
    }
  }

  flushList();
  return elements;
}

// Detect if a bot message is suggesting the user talk to a human
function suggestsHumanContact(content: string): boolean {
  const signals = [
    'reach out',
    'send us a message',
    '/contact',
    'hello@madebylakeshore.com',
    'human conversation',
    'look at this together',
    'look at the actual thing',
    'human judgment takes over',
    'connect you',
    'follow up',
    'talk to the team',
    'conversation with justin',
    'conversation with wilma',
  ];
  const lower = content.toLowerCase();
  return signals.some(s => lower.includes(s));
}

function loadMessages(): Message[] {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [INITIAL_MESSAGE];
}

function saveMessages(messages: Message[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  } catch {}
}

// Inline CTA component shown when the bot suggests talking to a human
function InlineCTA() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href="/contact"
        className="inline-flex items-center gap-2 px-4 py-2 bg-mbl-dusk hover:bg-mbl-slate text-mbl-ink hover:text-white text-xs font-heading font-medium rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send us a message
      </a>
      <a
        href="mailto:hello@madebylakeshore.com"
        className="inline-flex items-center gap-2 px-4 py-2 border border-mbl-mist hover:border-mbl-accent/30 text-mbl-ink text-xs font-heading font-medium rounded-lg transition-colors"
      >
        Email directly
      </a>
    </div>
  );
}

// Feedback thumbs component
function FeedbackThumbs({ messageId, feedback, onFeedback }: {
  messageId: string;
  feedback?: 'up' | 'down';
  onFeedback: (messageId: string, type: 'up' | 'down') => void;
}) {
  if (feedback) {
    return (
      <div className="mt-2 flex items-center gap-1">
        <span className={`w-4 h-4 ${feedback === 'up' ? 'text-mbl-accent' : 'text-mbl-warm'}`}>
          {feedback === 'up' ? (
            <svg fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
          ) : (
            <svg fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" /></svg>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
      <button
        onClick={() => onFeedback(messageId, 'up')}
        className="w-4 h-4 text-mbl-stone/50 hover:text-mbl-accent transition-colors"
        aria-label="Helpful response"
      >
        <svg fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
      </button>
      <button
        onClick={() => onFeedback(messageId, 'down')}
        className="w-4 h-4 text-mbl-stone/50 hover:text-mbl-warm transition-colors"
        aria-label="Unhelpful response"
      >
        <svg fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" /></svg>
      </button>
    </div>
  );
}

// Lead capture form component
function LeadCaptureCard({ onSubmit, onDismiss }: {
  onSubmit: (email: string) => void;
  onDismiss: () => void;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    onSubmit(email.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-4 p-4 rounded-xl bg-mbl-accent/5 border border-mbl-accent/20">
        <p className="text-sm text-mbl-ink font-medium">Got it — we'll follow up within 24 hours.</p>
        <p className="text-xs text-mbl-stone mt-1">No spam, no newsletter. Just a human picking up where I left off.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-xl bg-mbl-cloud border border-mbl-mist">
      <p className="text-sm text-mbl-ink mb-3">
        Want the team to follow up on this? Drop your email and we'll send you a summary of our conversation along with some next-step thoughts.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-white border border-mbl-mist rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mbl-accent focus:ring-1 focus:ring-mbl-accent"
          aria-label="Your email address"
        />
        <button
          type="submit"
          disabled={!email.trim()}
          className="px-4 py-2 bg-mbl-dusk hover:bg-mbl-slate disabled:bg-mbl-mist disabled:text-mbl-stone text-mbl-ink hover:text-white text-sm font-heading font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
      <button
        onClick={onDismiss}
        className="text-xs text-mbl-stone hover:text-mbl-ink mt-2 transition-colors"
      >
        No thanks
      </button>
    </div>
  );
}

export default function ChatBot() {
  const entryContext = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('from') || ''
    : '';
  const questions = SUGGESTED_QUESTIONS[entryContext] || SUGGESTED_QUESTIONS.default;

  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadDismissed, setLeadDismissed] = useState(() => {
    try { return sessionStorage.getItem(LEAD_DISMISSED_KEY) === 'true'; } catch { return false; }
  });
  const [leadCaptured, setLeadCaptured] = useState(() => {
    try { return sessionStorage.getItem(LEAD_CAPTURED_KEY) === 'true'; } catch { return false; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userScrolledRef = useRef(false);

  // Count user messages (excluding the initial greeting)
  const userMessageCount = messages.filter(m => m.role === 'user').length;

  // Should we show the lead capture? After 3+ user messages, not dismissed, not captured
  const shouldShowLeadCapture = userMessageCount >= 3 && !leadDismissed && !leadCaptured && !isStreaming;

  // Conversation approaching limit
  const messageCount = messages.length - 1; // exclude greeting
  const nearLimit = messageCount >= 16;

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    userScrolledRef.current = !atBottom;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!userScrolledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type } : m
    ));
  };

  const handleLeadSubmit = async (email: string) => {
    setLeadCaptured(true);
    try { sessionStorage.setItem(LEAD_CAPTURED_KEY, 'true'); } catch {}

    // Build a conversation summary for the lead
    const conversationSummary = messages
      .filter(m => m.id !== 'greeting')
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Companion'}: ${m.content}`)
      .join('\n\n');

    // Send to Formspree (same form as contact page)
    try {
      await fetch('https://formspree.io/f/mkooadkb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          _subject: 'Chat Companion Lead — Follow Up Requested',
          message: `A visitor chatted with the Design & Data Companion and requested a follow-up.\n\nEmail: ${email}\n\n--- Conversation ---\n\n${conversationSummary}`,
        }),
      });
    } catch (err) {
      console.error('Lead capture error:', err);
    }
  };

  const handleLeadDismiss = () => {
    setLeadDismissed(true);
    try { sessionStorage.setItem(LEAD_DISMISSED_KEY, 'true'); } catch {}
  };

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage || input).trim();
    if (!userMessage || isStreaming) return;

    const userMsg: Message = { id: generateId(), role: 'user', content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideMessage) setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsStreaming(true);
    setError(null);
    userScrolledRef.current = false;

    const assistantId = generateId();

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        let errorMsg = 'Something went wrong. Try again?';
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                fullText += data.delta.text;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
                );
                scrollToBottom();
              }
            } catch {}
          }
        }

        if (!fullText) {
          setMessages(prev =>
            prev.map(m => m.id === assistantId
              ? { ...m, content: "Hmm, I had a thought but it didn't quite make it out. Mind trying that again?" }
              : m
            )
          );
        }
      } else {
        const data = await response.json();
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: data.message }]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat Error:', err);
      const errorMessage = err.message || 'Something went wrong. Try again?';
      setError(errorMessage);
      setMessages(prev => {
        const hasEmpty = prev.some(m => m.id === assistantId);
        if (hasEmpty) {
          return prev.map(m => m.id === assistantId
            ? { ...m, content: "Hmm, my brain hiccupped for a second there. Mind trying that again? (Even chatbots have off moments.)" }
            : m
          );
        }
        return [...prev, {
          id: assistantId,
          role: 'assistant',
          content: "Hmm, my brain hiccupped for a second there. Mind trying that again? (Even chatbots have off moments.)"
        }];
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleClearConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
    setLeadDismissed(false);
    setLeadCaptured(false);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEAD_DISMISSED_KEY);
    sessionStorage.removeItem(LEAD_CAPTURED_KEY);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const showSuggestions = messages.length === 1 && !isStreaming;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-8 space-y-6"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.map((message, index) => {
          const isAssistant = message.role === 'assistant';
          const isGreeting = message.id === 'greeting';
          const showCTA = isAssistant && !isGreeting && !isStreaming && suggestsHumanContact(message.content);
          const isLastAssistant = isAssistant && index === messages.length - 1;

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              aria-label={`${message.role === 'user' ? 'You' : 'Companion'}`}
            >
              <div className={`max-w-[85%] ${isAssistant ? 'group/msg' : ''}`}>
                <div
                  className={`rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-mbl-accent text-white'
                      : 'bg-white text-mbl-ink border border-mbl-mist'
                  }`}
                >
                  {isAssistant ? (
                    <div className="chat-markdown">{renderMarkdown(message.content)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>

                {/* Inline CTA when bot suggests human contact */}
                {showCTA && <InlineCTA />}

                {/* Feedback thumbs on assistant messages (not greeting, not currently streaming) */}
                {isAssistant && !isGreeting && !isStreaming && message.content && (
                  <FeedbackThumbs
                    messageId={message.id}
                    feedback={message.feedback}
                    onFeedback={handleFeedback}
                  />
                )}

                {/* Lead capture — show after the last assistant message when conditions are met */}
                {isLastAssistant && shouldShowLeadCapture && (
                  <LeadCaptureCard onSubmit={handleLeadSubmit} onDismiss={handleLeadDismiss} />
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white border border-mbl-mist rounded-2xl px-5 py-4">
              <div className="flex space-x-2" role="status" aria-live="polite" aria-atomic="true">
                <span className="sr-only">Assistant is thinking...</span>
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-red-500" role="alert">{error}</p>
          </div>
        )}

        {/* Conversation length indicator */}
        {nearLimit && !isStreaming && (
          <div className="flex justify-center">
            <div className="text-center px-4 py-3 rounded-xl bg-mbl-cloud border border-mbl-mist max-w-md">
              <p className="text-xs text-mbl-stone mb-2">
                We've been chatting a while — for deeper work, the team can dig in properly.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 text-xs font-heading font-medium text-mbl-accent hover:text-mbl-accent/80 transition-colors"
              >
                Continue the conversation with a human
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions - only show at start */}
      {showSuggestions && (
        <div className="px-4 md:px-6 pb-4">
          <p className="text-xs text-mbl-stone mb-2">Or try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="text-xs sm:text-xs px-4 py-2.5 sm:px-3 sm:py-1.5 bg-mbl-cloud hover:bg-mbl-mist border border-mbl-mist rounded-full text-mbl-stone hover:text-mbl-ink transition-colors"
                aria-label={`Ask: ${question}`}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-mbl-mist px-4 md:px-6 py-4 bg-white">
        <div className="flex gap-3 items-end">
          <label htmlFor="chat-input" className="sr-only">Type your message</label>
          <textarea
            ref={textareaRef}
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about design, data, or your creative crisis..."
            className="flex-1 resize-none bg-mbl-cloud border border-mbl-mist rounded-xl px-4 py-3 text-sm text-mbl-ink placeholder-mbl-stone focus:outline-none focus:border-mbl-accent focus:ring-1 focus:ring-mbl-accent transition-colors"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="px-5 py-3 bg-mbl-warm hover:bg-mbl-warm/90 text-white rounded-xl font-heading font-medium text-sm transition-colors"
              aria-label="Stop generating"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="px-5 py-3 bg-mbl-dusk hover:bg-mbl-slate disabled:bg-mbl-mist disabled:text-mbl-stone text-mbl-ink hover:text-white rounded-xl font-heading font-medium text-sm transition-colors disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-mbl-stone">
            I'm helpful but I'm not a replacement for the real thing.{' '}
            <a href="/contact" className="text-mbl-accent hover:underline">
              Send us a message
            </a>{' '}
            when you're ready to dig deeper.
          </p>
          {messages.length > 1 && (
            <button
              onClick={handleClearConversation}
              className="text-xs text-mbl-stone hover:text-mbl-ink transition-colors ml-4 whitespace-nowrap"
              aria-label="Clear conversation"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
