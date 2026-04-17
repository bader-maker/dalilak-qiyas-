"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  context?: "test" | "general";
  currentQuestion?: {
    question: string;
    options: string[];
    section?: string;
    category?: string;
  };
  isArabic?: boolean;
}

export default function AIAssistant({ context = "general", currentQuestion, isArabic = true }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: context === "test"
          ? (isArabic
              ? "مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في فهم السؤال الحالي أو شرح المفاهيم. كيف يمكنني مساعدتك؟"
              : "Hello! I'm your AI assistant. I can help you understand the current question or explain concepts. How can I help you?")
          : (isArabic
              ? "مرحباً! أنا مساعدك الذكي في دليلك إلى قياس. يمكنني الإجابة على أسئلتك حول اختبارات القدرات والتحصيلي، شرح المفاهيم، أو مساعدتك في التحضير. كيف يمكنني مساعدتك اليوم؟"
              : "Hello! I'm your AI assistant at Dalilak Qiyas. I can answer your questions about GAT and SAAT tests, explain concepts, or help you prepare. How can I help you today?"),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, context, isArabic]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();

    // Context-aware responses for test mode
    if (context === "test" && currentQuestion) {
      if (lowerMessage.includes("شرح") || lowerMessage.includes("explain") || lowerMessage.includes("اشرح")) {
        return isArabic
          ? `دعني أشرح لك السؤال:\n\n"${currentQuestion.question}"\n\nهذا السؤال من قسم ${currentQuestion.section || "غير محدد"} - ${currentQuestion.category || ""}.\n\nللإجابة على هذا السؤال، عليك التفكير في الخيارات المتاحة وتحليل كل واحد منها. حاول استبعاد الخيارات الخاطئة أولاً.\n\nهل تريد مساعدة إضافية؟`
          : `Let me explain the question:\n\n"${currentQuestion.question}"\n\nThis question is from ${currentQuestion.section || "Unknown"} section - ${currentQuestion.category || ""}.\n\nTo answer this question, think about the available options and analyze each one. Try to eliminate wrong answers first.\n\nWould you like more help?`;
      }

      if (lowerMessage.includes("تلميح") || lowerMessage.includes("hint") || lowerMessage.includes("مساعدة") || lowerMessage.includes("help")) {
        return isArabic
          ? `إليك تلميح للسؤال الحالي:\n\n• اقرأ السؤال بعناية مرة أخرى\n• حدد الكلمات المفتاحية في السؤال\n• استبعد الخيارات التي تبدو غير منطقية\n• إذا كان السؤال رياضياً، جرب التعويض بالأرقام\n\nهل تحتاج شرحاً أكثر تفصيلاً؟`
          : `Here's a hint for the current question:\n\n• Read the question carefully again\n• Identify key words in the question\n• Eliminate options that seem illogical\n• If it's a math question, try substituting numbers\n\nDo you need a more detailed explanation?`;
      }

      if (lowerMessage.includes("خيارات") || lowerMessage.includes("options")) {
        const optionsList = currentQuestion.options.map((opt, i) => `${["أ", "ب", "ج", "د"][i] || i + 1}. ${opt}`).join("\n");
        return isArabic
          ? `الخيارات المتاحة هي:\n\n${optionsList}\n\nفكر في كل خيار وحاول ربطه بالسؤال.`
          : `The available options are:\n\n${optionsList}\n\nThink about each option and try to connect it to the question.`;
      }
    }

    // General responses
    if (lowerMessage.includes("قدرات") || lowerMessage.includes("gat") || lowerMessage.includes("aptitude")) {
      return isArabic
        ? "اختبار القدرات العامة يقيس القدرات التحليلية والاستدلالية. يتكون من قسمين:\n\n📊 **القسم الكمي**: يشمل الجبر، الهندسة، الإحصاء، والنسب.\n\n📝 **القسم اللفظي**: يشمل التناظر اللفظي، إكمال الجمل، واستيعاب المقروء.\n\nهل تريد نصائح للتحضير؟"
        : "The General Aptitude Test (GAT) measures analytical and reasoning abilities. It consists of two sections:\n\n📊 **Quantitative**: Includes algebra, geometry, statistics, and ratios.\n\n📝 **Verbal**: Includes analogies, sentence completion, and reading comprehension.\n\nWould you like preparation tips?";
    }

    if (lowerMessage.includes("تحصيلي") || lowerMessage.includes("saat") || lowerMessage.includes("achievement")) {
      return isArabic
        ? "اختبار التحصيلي يقيس مستوى تحصيلك في المواد العلمية:\n\n🔢 **الرياضيات**: الجبر، الهندسة، التفاضل، حساب المثلثات\n⚡ **الفيزياء**: الميكانيكا، الكهرباء، الموجات\n🧪 **الكيمياء**: بنية الذرة، التفاعلات، الكيمياء العضوية\n🧬 **الأحياء**: الخلية، الوراثة، جسم الإنسان\n\nما المادة التي تحتاج مساعدة فيها؟"
        : "The SAAT measures your achievement in scientific subjects:\n\n🔢 **Mathematics**: Algebra, geometry, calculus, trigonometry\n⚡ **Physics**: Mechanics, electricity, waves\n🧪 **Chemistry**: Atomic structure, reactions, organic chemistry\n🧬 **Biology**: Cell, genetics, human body\n\nWhich subject do you need help with?";
    }

    if (lowerMessage.includes("نصائح") || lowerMessage.includes("tips") || lowerMessage.includes("استعداد") || lowerMessage.includes("prepare")) {
      return isArabic
        ? "إليك أهم النصائح للتحضير:\n\n1️⃣ **ابدأ مبكراً**: خصص وقتاً يومياً للمذاكرة\n2️⃣ **حل اختبارات سابقة**: التدريب المستمر يحسن الأداء\n3️⃣ **راجع أخطاءك**: تعلم من كل خطأ\n4️⃣ **نظم وقتك**: في الاختبار، لا تقضِ وقتاً طويلاً على سؤال واحد\n5️⃣ **نم جيداً**: الراحة مهمة قبل الاختبار\n\nهل تحتاج نصائح لمادة معينة؟"
        : "Here are the top preparation tips:\n\n1️⃣ **Start early**: Dedicate daily time for studying\n2️⃣ **Solve past tests**: Continuous practice improves performance\n3️⃣ **Review your mistakes**: Learn from every error\n4️⃣ **Manage your time**: Don't spend too long on one question\n5️⃣ **Sleep well**: Rest is important before the test\n\nDo you need tips for a specific subject?";
    }

    if (lowerMessage.includes("رياضيات") || lowerMessage.includes("math") || lowerMessage.includes("جبر") || lowerMessage.includes("algebra")) {
      return isArabic
        ? "الرياضيات من أهم أقسام الاختبار! إليك بعض النقاط المهمة:\n\n• **الجبر**: تأكد من إتقان حل المعادلات وتحليل العبارات الجبرية\n• **الهندسة**: احفظ قوانين المساحات والحجوم\n• **النسب**: تدرب على مسائل النسبة المئوية والتناسب\n\nهل تريد تمارين على موضوع معين؟"
        : "Mathematics is one of the most important sections! Here are some key points:\n\n• **Algebra**: Make sure you master solving equations and factoring\n• **Geometry**: Memorize area and volume formulas\n• **Ratios**: Practice percentage and proportion problems\n\nWould you like exercises on a specific topic?";
    }

    // Default response
    return isArabic
      ? "شكراً على سؤالك! يمكنني مساعدتك في:\n\n• شرح المفاهيم والمواضيع\n• تقديم نصائح للتحضير\n• الإجابة على أسئلة حول الاختبارات\n• مساعدتك في فهم الأسئلة\n\nما الذي تود معرفته؟"
      : "Thanks for your question! I can help you with:\n\n• Explaining concepts and topics\n• Providing preparation tips\n• Answering questions about tests\n• Helping you understand questions\n\nWhat would you like to know?";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await generateAIResponse(input.trim());
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isArabic ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, an error occurred. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = context === "test"
    ? (isArabic
        ? ["اشرح السؤال", "أعطني تلميح", "ما الخيارات؟"]
        : ["Explain question", "Give me a hint", "What are the options?"])
    : (isArabic
        ? ["نصائح للقدرات", "كيف أستعد للتحصيلي؟", "شرح الرياضيات"]
        : ["GAT tips", "How to prepare for SAAT?", "Explain math"]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${isArabic ? "left-4" : "right-4"} bottom-4 z-40 w-14 h-14 bg-gradient-to-r from-[#006C35] to-[#00A651] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group`}
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className={`absolute ${isArabic ? "right-full mr-3" : "left-full ml-3"} bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
          {isArabic ? "المساعد الذكي" : "AI Assistant"}
        </span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className={`fixed ${isArabic ? "left-4" : "right-4"} bottom-20 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#006C35] to-[#00A651] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold">{isArabic ? "المساعد الذكي" : "AI Assistant"}</h3>
                  <p className="text-xs text-white/70">
                    {context === "test"
                      ? (isArabic ? "مساعدك في الاختبار" : "Your test helper")
                      : (isArabic ? "دليلك إلى قياس" : "Dalilak Qiyas")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4" dir={isArabic ? "rtl" : "ltr"}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? (isArabic ? "justify-start" : "justify-end") : (isArabic ? "justify-end" : "justify-start")}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-[#006C35] text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`flex ${isArabic ? "justify-end" : "justify-start"}`}>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-2" dir={isArabic ? "rtl" : "ltr"}>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(action);
                    handleSend();
                  }}
                  disabled={isLoading}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-full transition-colors disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700" dir={isArabic ? "rtl" : "ltr"}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isArabic ? "اكتب سؤالك هنا..." : "Type your question here..."}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#006C35] disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-[#006C35] text-white rounded-xl hover:bg-[#004d26] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
