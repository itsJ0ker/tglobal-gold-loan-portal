import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import { ApiService } from '../../services/api';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Bot,
  User,
  Wrench,
} from 'lucide-react';

interface AiLoanAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiLoanAssistant: React.FC<AiLoanAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Hello! I am your TGlobal AI Loan Assistant. Tell me about your gold jewellery (weight and karat, e.g. 45 grams of 22K), or ask about our loan schemes, and I will calculate your maximum eligible loan using our verified backend valuation tools.',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setActiveTool('Analyzing query...');

    try {
      const response = await ApiService.sendChatMessage({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (response.toolCallsExecuted && response.toolCallsExecuted.length > 0) {
        const lastTool = response.toolCallsExecuted[response.toolCallsExecuted.length - 1];
        setActiveTool(`Executed tool: ${lastTool.name}`);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message.content,
        requiresConfirmation: response.message.requiresConfirmation,
        confirmationPayload: response.message.confirmationPayload || response.pendingConfirmation?.payload,
        toolCallsExecuted: response.toolCallsExecuted,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered a temporary connection issue. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const handleConfirmSubmission = async (payload: any, confirmed: boolean) => {
    setLoading(true);
    setActiveTool(confirmed ? 'Executing tool: submit_application...' : 'Cancelling submission...');

    try {
      const response = await ApiService.sendChatMessage({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        pendingConfirmation: {
          action: 'submit_application',
          payload,
          confirmed,
        },
      });

      const reply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message.content,
        toolCallsExecuted: response.toolCallsExecuted,
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Failed to process confirmation. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const quickPrompts = [
    'I have 45 grams of 22 carat jewellery, how much can I get?',
    'What loan schemes and interest rates are available?',
    'Compare Bullet Repayment vs Monthly EMI plan',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl flex flex-col border-l border-ivory-200 transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-900 to-forest-800 text-white p-4 flex items-center justify-between border-b border-forest-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-400/40 flex items-center justify-center text-gold-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
              <span>TGlobal Loan Assistant</span>
              <span className="text-[10px] bg-forest-700 text-gold-300 px-2 py-0.5 rounded-full font-mono uppercase">
                Tool-Powered
              </span>
            </h3>
            <p className="text-[11px] text-forest-100/70">
              Validated backend quotes · Strict guardrails
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-forest-100 hover:text-white hover:bg-forest-700/50 rounded-lg transition-colors"
          aria-label="Close Assistant"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Tool Chip Status */}
      {activeTool && (
        <div className="bg-gold-50 border-b border-gold-200 px-4 py-2 flex items-center gap-2 text-xs text-gold-800">
          <Wrench className="w-3.5 h-3.5 text-gold-600 animate-pulse" />
          <span className="font-mono text-[11px]">{activeTool}</span>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ivory-50/40">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-forest-800 text-gold-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-forest-800 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-charcoal-900 border border-ivory-200 rounded-bl-none shadow-refined'
                }`}
              >
                {/* Message Content */}
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Tool Badges */}
                {m.toolCallsExecuted && m.toolCallsExecuted.length > 0 && (
                  <div className="pt-2 border-t border-ivory-100 flex flex-wrap gap-1.5">
                    {m.toolCallsExecuted.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-ivory-100 text-forest-800 border border-ivory-200"
                      >
                        <Wrench className="w-3 h-3 text-gold-600" />
                        <span>{tc.name}()</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Confirmation Card for submit_application */}
                {m.requiresConfirmation && m.confirmationPayload && (
                  <div className="bg-forest-50 border border-forest-200 rounded-xl p-3.5 space-y-3 text-xs text-charcoal-800 mt-2">
                    <div className="flex items-center gap-1.5 font-semibold text-forest-900">
                      <ShieldCheck className="w-4 h-4 text-forest-700" />
                      <span>Review Application Summary</span>
                    </div>

                    <div className="space-y-1 text-[11px] bg-white p-2.5 rounded-lg border border-forest-100">
                      <div>Applicant: <strong className="text-charcoal-900">{m.confirmationPayload.customerName}</strong></div>
                      <div>Mobile: <strong className="font-mono text-charcoal-900">{m.confirmationPayload.mobileNumber}</strong></div>
                      <div>Gold: <strong className="text-charcoal-900">{m.confirmationPayload.netWeightGrams}g ({m.confirmationPayload.karat}K)</strong></div>
                      <div>Plan: <strong className="text-forest-800">{m.confirmationPayload.planId}</strong></div>
                    </div>

                    <p className="text-[10px] text-charcoal-500">
                      Explicit confirmation is required before this application is recorded in the intake portal.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleConfirmSubmission(m.confirmationPayload, true)}
                        className="flex-1 py-2 px-3 rounded-lg bg-forest-800 hover:bg-forest-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Submit</span>
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleConfirmSubmission(m.confirmationPayload, false)}
                        className="py-2 px-3 rounded-lg border border-charcoal-200 text-charcoal-700 hover:bg-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-full bg-charcoal-200 text-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-charcoal-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-forest-700" />
            <span>Consulting backend loan tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="p-2.5 bg-ivory-50 border-t border-ivory-200 overflow-x-auto flex gap-2 no-scrollbar">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            className="whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full bg-white border border-ivory-300 text-charcoal-700 hover:border-forest-700 hover:text-forest-900 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-white border-t border-ivory-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="chat-input-text"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about schemes, quote 45g 22K..."
            className="flex-1 px-4 py-2.5 bg-ivory-50/70 border border-ivory-200 rounded-xl text-xs sm:text-sm text-charcoal-900 focus:bg-white focus:border-forest-800 transition-all"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-forest-800 text-white hover:bg-forest-700 disabled:bg-ivory-300 disabled:text-charcoal-400 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
