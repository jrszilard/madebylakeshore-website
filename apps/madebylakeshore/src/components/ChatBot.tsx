import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: `Oh good, you found me. I'm the part of this website that actually talks back.

I specialize in design and data questions—the kind that make you stare at a spreadsheet wondering if the numbers are judging you, or squint at a layout thinking "something's off but I can't explain it."

Go ahead. Tell me what's haunting you.`
};

const SUGGESTED_QUESTIONS = [
  "My dashboard has too many KPIs",
  "Something looks off but I can't explain it",
  "Help me pick better colors",
  "What chart should I use?"
];

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    // Only scroll if there's more than the initial message
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (err) {
      console.error('Chat Error:', err);
      setError('Something went wrong. Try again?');
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "Hmm, my brain hiccupped for a second there. Mind trying that again? (Even chatbots have off moments.)" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area - scrolls independently */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                message.role === 'user'
                  ? 'bg-mbl-accent text-white'
                  : 'bg-white text-mbl-ink border border-mbl-mist'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-mbl-mist rounded-2xl px-5 py-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-mbl-stone rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions - only show at start */}
      {messages.length === 1 && (
        <div className="px-4 md:px-6 pb-4">
          <p className="text-xs text-mbl-stone mb-2">Or try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="text-xs px-3 py-1.5 bg-mbl-cloud hover:bg-mbl-mist border border-mbl-mist rounded-full text-mbl-stone hover:text-mbl-ink transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-mbl-mist px-4 md:px-6 py-4 bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about design, data, or your creative crisis..."
            className="flex-1 bg-mbl-cloud border border-mbl-mist rounded-xl px-4 py-3 text-sm text-mbl-ink placeholder-mbl-stone focus:outline-none focus:border-mbl-accent focus:ring-1 focus:ring-mbl-accent transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-mbl-ink hover:bg-mbl-slate disabled:bg-mbl-mist disabled:text-mbl-stone text-white rounded-xl font-heading font-medium text-sm transition-colors disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-mbl-stone mt-3 text-center">
          I'm helpful but I'm not a replacement for an actual consultation.{' '}
          <a href="/contact" className="text-mbl-accent hover:underline">
            Book time with the team
          </a>{' '}
          when you're ready.
        </p>
      </div>
    </div>
  );
}
