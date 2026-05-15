import { useState } from 'react';
import Layout from '@/components/Layout';
import toast from 'react-hot-toast';
import { sendChatQuestion } from '@/services/chat';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const quickPrompts = [
  'How much did I spend on food last month?',
  'Am I on track with my budget?',
  "What's my biggest unnecessary expense?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const askQuestion = async (input: string) => {
    const text = input.trim();
    if (!text) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setQuestion('');

    try {
      const response = await sendChatQuestion(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (err) {
      console.error('AI chat failed', err);
      toast.error('AI chat is unavailable right now. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not answer right now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
            💬 Financial AI Chat
          </h1>
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
            Ask questions about your spending, budgets, and trends.
          </p>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => askQuestion(prompt)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askQuestion(question);
              }}
              className="flex gap-2"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your finances..."
                className="flex-1 px-3 py-2 rounded-lg"
                style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
              >
                {loading ? 'Asking…' : 'Ask'}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className="rounded-xl p-4"
                style={{
                  background: m.role === 'user' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {m.role === 'user' ? 'You' : 'Ledgerly AI'}
                </p>
                <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{m.content}</p>
              </div>
            ))}
            {!messages.length && (
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Start by selecting a quick prompt or typing your own question.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
