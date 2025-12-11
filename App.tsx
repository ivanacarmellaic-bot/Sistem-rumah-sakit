import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Activity, KeyRound, Loader2, RotateCcw } from 'lucide-react';
import AgentCard from './components/AgentCard';
import { AgentType, Message } from './types';
import { AGENTS, MOCK_DB } from './constants';
import { initializeChat, sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';

const STORAGE_KEY = 'gemini_api_key_v1';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: "Selamat datang di Sistem ERP Rumah Sakit Cerdas. Saya adalah Orkestrator. Silakan ajukan pertanyaan terkait Medis, Penagihan, Pendaftaran, atau Janji Temu.",
      timestamp: new Date(),
      agent: AgentType.ORCHESTRATOR
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.ORCHESTRATOR);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API Key State handling
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Gemini on mount with persistence check
  useEffect(() => {
    const init = async () => {
      // 1. Try Local Storage first (for deployed apps usability)
      const storedKey = localStorage.getItem(STORAGE_KEY);
      if (storedKey) {
        const success = await initializeChat(storedKey);
        if (success) {
          setIsInitializing(false);
          return;
        }
      }

      // 2. Try Environment Variable (via default init)
      const successEnv = await initializeChat();
      if (!successEnv) {
        setNeedsApiKey(true);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleSetApiKey = async () => {
    if (!userApiKey.trim()) return;
    setIsInitializing(true);
    
    const success = await initializeChat(userApiKey);
    if (success) {
      // Save to storage for convenience
      localStorage.setItem(STORAGE_KEY, userApiKey);
      setNeedsApiKey(false);
    } else {
      alert("Gagal menginisialisasi dengan Key tersebut. Mohon periksa kembali.");
    }
    setIsInitializing(false);
  };

  const handleResetKey = () => {
     localStorage.removeItem(STORAGE_KEY); // Clear storage
     setUserApiKey('');
     setNeedsApiKey(true);
     setMessages([{
        role: 'system',
        content: "Sistem di-reset. Silakan masukkan API Key baru.",
        timestamp: new Date(),
        agent: AgentType.ORCHESTRATOR
     }]);
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    
    setIsProcessing(true);
    setActiveAgent(AgentType.ORCHESTRATOR);

    try {
      // 1. Send to Orchestrator
      const orchestratorRes = await sendMessageToGemini(userMsg);

      // 2. Check for Function Call (Dispatch)
      if (orchestratorRes.functionCalls && orchestratorRes.functionCalls.length > 0) {
        const toolCall = orchestratorRes.functionCalls[0];
        const toolName = toolCall.name;
        
        let targetAgent = AgentType.ORCHESTRATOR;
        let mockResponse = "Error: Unknown Agent";

        // Map tool names to Agents and Mock Responses
        switch(toolName) {
          case 'call_medical_records_agent':
            targetAgent = AgentType.MEDICAL_RECORDS;
            mockResponse = MOCK_DB.MEDICAL;
            break;
          case 'call_billing_insurance_agent':
            targetAgent = AgentType.BILLING;
            mockResponse = MOCK_DB.BILLING;
            break;
          case 'call_patient_registration_agent':
            targetAgent = AgentType.REGISTRATION;
            mockResponse = MOCK_DB.REGISTRATION;
            break;
          case 'call_appointment_management_agent':
            targetAgent = AgentType.APPOINTMENTS;
            mockResponse = MOCK_DB.APPOINTMENTS;
            break;
        }

        // VISUALIZE: Switch active agent
        setActiveAgent(targetAgent);
        
        // Simulate Network Delay for Effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 3. Send Tool Response back to Gemini
        const finalResText = await sendToolResponseToGemini(toolName, mockResponse);
        
        // Switch back to Orchestrator to deliver message
        setActiveAgent(AgentType.ORCHESTRATOR);
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: finalResText, 
          timestamp: new Date(),
          agent: AgentType.ORCHESTRATOR 
        }]);

      } else {
        // Direct response
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: orchestratorRes.text, 
          timestamp: new Date(),
          agent: AgentType.ORCHESTRATOR
        }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', content: "System Error encountered.", timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
      setActiveAgent(AgentType.ORCHESTRATOR);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // API Key Modal
  if (needsApiKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600">
              <KeyRound size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Setup Required</h2>
          <p className="text-slate-500 text-center mb-6 text-sm">
            Untuk memulai demo AIS Hospital Orchestrator, silakan masukkan <strong>Google Gemini API Key</strong> Anda.
          </p>
          <div className="space-y-4">
            <input
              type="password"
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              placeholder="Paste API Key here (starts with AIza...)"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <button
              onClick={handleSetApiKey}
              disabled={isInitializing || !userApiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isInitializing ? <Loader2 className="animate-spin" size={20} /> : "Start System"}
            </button>
          </div>
          <p className="mt-4 text-xs text-center text-slate-400">
            Key Anda disimpan aman di browser (Local Storage) agar Anda tidak perlu login ulang saat deploy.
            <br/> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Dapatkan API Key Gratis di sini.</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden justify-center">
      
      {/* Main Container - Centered and now wider without the sidebar */}
      <div className="flex flex-col p-4 md:p-6 gap-6 w-full max-w-5xl h-full">
        
        {/* Header */}
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" />
              AIS Hospital ERP
            </h1>
            <p className="text-slate-500 text-sm hidden md:block">AI-Enhanced Segregation of Duties Architecture</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleResetKey}
               className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
               title="Reset API Key"
             >
                <RotateCcw size={18} />
             </button>
             <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                System Online
             </div>
          </div>
        </header>

        {/* Visualization Area */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative min-h-[200px] flex flex-col items-center justify-between shrink-0">
            <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">Live Orchestration Topology</h3>
            
            {/* Top Node: Orchestrator */}
            <div className="mb-6 z-10 w-full flex justify-center">
              <div className="w-64">
                 <AgentCard 
                    config={AGENTS[AgentType.ORCHESTRATOR]} 
                    isActive={activeAgent === AgentType.ORCHESTRATOR} 
                    isProcessing={isProcessing && activeAgent === AgentType.ORCHESTRATOR}
                 />
              </div>
            </div>

            {/* Connecting Lines (SVG) - Adjusted for responsivity */}
            <svg className="absolute top-[80px] left-0 w-full h-24 pointer-events-none z-0 overflow-visible hidden md:block" stroke="rgb(226, 232, 240)">
               <line x1="50%" y1="0" x2="15%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="38%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="62%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="85%" y2="100%" strokeWidth="2" />
            </svg>

            {/* Bottom Nodes: Specialists */}
            <div className="grid grid-cols-2 md:flex md:justify-between w-full gap-2 md:gap-4 z-10 md:px-4">
               <div className="md:w-1/4">
                 <AgentCard config={AGENTS[AgentType.MEDICAL_RECORDS]} isActive={activeAgent === AgentType.MEDICAL_RECORDS} isProcessing={activeAgent === AgentType.MEDICAL_RECORDS} />
               </div>
               <div className="md:w-1/4">
                 <AgentCard config={AGENTS[AgentType.BILLING]} isActive={activeAgent === AgentType.BILLING} isProcessing={activeAgent === AgentType.BILLING} />
               </div>
               <div className="md:w-1/4">
                 <AgentCard config={AGENTS[AgentType.REGISTRATION]} isActive={activeAgent === AgentType.REGISTRATION} isProcessing={activeAgent === AgentType.REGISTRATION} />
               </div>
               <div className="md:w-1/4">
                 <AgentCard config={AGENTS[AgentType.APPOINTMENTS]} isActive={activeAgent === AgentType.APPOINTMENTS} isProcessing={activeAgent === AgentType.APPOINTMENTS} />
               </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                      : 'bg-blue-50 text-slate-800 rounded-tl-none border border-blue-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block opacity-70">
                       {msg.timestamp.toLocaleTimeString()} • {msg.agent ? AGENTS[msg.agent].name : 'User'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && activeAgent === AgentType.ORCHESTRATOR && (
              <div className="flex justify-start">
                 <div className="flex items-center gap-2 text-xs text-slate-400 italic ml-12 bg-slate-50 px-3 py-1 rounded-full">
                    <Loader2 size={12} className="animate-spin" />
                    System is analyzing requirements...
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 'Saya ingin mendaftarkan pasien baru'..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isProcessing}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-md"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <div className="mt-2 text-center">
               <span className="text-[10px] text-slate-400">Powered by Gemini 2.5 • AIS Compliant Architecture</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default App;