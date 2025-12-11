import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Activity } from 'lucide-react';
import AgentCard from './components/AgentCard';
import AuditLog from './components/AuditLog';
import { AgentType, Message, AuditLogEntry } from './types';
import { AGENTS, MOCK_DB } from './constants';
import { initializeChat, sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';

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
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini on mount
  useEffect(() => {
    initializeChat();
    addLog(AgentType.ORCHESTRATOR, "System Initialization", "System online and ready.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addLog = (agent: AgentType, action: string, details: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      agent,
      action,
      details,
      status: 'SUCCESS'
    }, ...prev]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    
    setIsProcessing(true);
    setActiveAgent(AgentType.ORCHESTRATOR);
    addLog(AgentType.ORCHESTRATOR, "Inbound Request", `Analyzing User Intent: "${userMsg.substring(0, 30)}..."`);

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
        addLog(AgentType.ORCHESTRATOR, "Dispatch Event", `Routing to ${targetAgent}`);
        
        // Simulate Network Delay for Effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Log Agent Action
        addLog(targetAgent, "Data Processing", `Executing Tool: ${toolName}`);
        
        // 3. Send Tool Response back to Gemini
        const finalResText = await sendToolResponseToGemini(toolName, mockResponse);
        
        // Switch back to Orchestrator to deliver message
        setActiveAgent(AgentType.ORCHESTRATOR);
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: finalResText, 
          timestamp: new Date(),
          agent: AgentType.ORCHESTRATOR // The orchestrator delivers the final summary
        }]);
        addLog(AgentType.ORCHESTRATOR, "Response Delivery", "Consolidated response sent to user.");

      } else {
        // Direct response (Orchestrator couldn't dispatch or asked for clarification)
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: orchestratorRes.text, 
          timestamp: new Date(),
          agent: AgentType.ORCHESTRATOR
        }]);
        addLog(AgentType.ORCHESTRATOR, "Direct Response", "Request clarification or general inquiry.");
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

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      
      {/* LEFT COLUMN: Orchestrator Viz & Chat */}
      <div className="flex-1 flex flex-col p-6 gap-6 max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" />
              AIS Hospital ERP
            </h1>
            <p className="text-slate-500 text-sm">AI-Enhanced Segregation of Duties Architecture</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            System Online
          </div>
        </header>

        {/* Visualization Area */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative min-h-[220px] flex flex-col items-center justify-between">
            <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Live Orchestration Topology</h3>
            
            {/* Top Node: Orchestrator */}
            <div className="mb-8 z-10 w-full flex justify-center">
              <div className="w-64">
                 <AgentCard 
                    config={AGENTS[AgentType.ORCHESTRATOR]} 
                    isActive={activeAgent === AgentType.ORCHESTRATOR} 
                    isProcessing={isProcessing && activeAgent === AgentType.ORCHESTRATOR}
                 />
              </div>
            </div>

            {/* Connecting Lines (SVG) */}
            <svg className="absolute top-[90px] left-0 w-full h-24 pointer-events-none z-0 overflow-visible" stroke="rgb(226, 232, 240)">
               <line x1="50%" y1="0" x2="15%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="38%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="62%" y2="100%" strokeWidth="2" />
               <line x1="50%" y1="0" x2="85%" y2="100%" strokeWidth="2" />
            </svg>

            {/* Bottom Nodes: Specialists */}
            <div className="flex justify-between w-full gap-2 z-10 px-4">
               <div className="w-1/4">
                 <AgentCard config={AGENTS[AgentType.MEDICAL_RECORDS]} isActive={activeAgent === AgentType.MEDICAL_RECORDS} isProcessing={activeAgent === AgentType.MEDICAL_RECORDS} />
               </div>
               <div className="w-1/4">
                 <AgentCard config={AGENTS[AgentType.BILLING]} isActive={activeAgent === AgentType.BILLING} isProcessing={activeAgent === AgentType.BILLING} />
               </div>
               <div className="w-1/4">
                 <AgentCard config={AGENTS[AgentType.REGISTRATION]} isActive={activeAgent === AgentType.REGISTRATION} isProcessing={activeAgent === AgentType.REGISTRATION} />
               </div>
               <div className="w-1/4">
                 <AgentCard config={AGENTS[AgentType.APPOINTMENTS]} isActive={activeAgent === AgentType.APPOINTMENTS} isProcessing={activeAgent === AgentType.APPOINTMENTS} />
               </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                 <div className="text-xs text-slate-400 italic ml-12">System is analyzing requirements...</div>
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
                placeholder="Ex: 'Saya ingin mendaftarkan pasien baru' or 'Berapa tagihan untuk John Doe?'"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isProcessing}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-md"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 text-center">
               <span className="text-[10px] text-slate-400">Powered by Gemini 2.5 • AIS Compliant Architecture</span>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Audit Log */}
      <div className="w-80 bg-white border-l border-slate-200 p-0 hidden xl:block shadow-xl z-20">
         <AuditLog logs={logs} />
         
         <div className="p-4 border-t border-slate-200 bg-slate-50">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">System Capabilities</h4>
           <ul className="space-y-2">
             {[
               "Natural Language Intent Analysis",
               "Strict Segregation of Duties",
               "HIPAA-Ready Logging",
               "Automated Tool Dispatching",
               "Mock RCM & FHIR Database"
             ].map((item, i) => (
               <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> {item}
               </li>
             ))}
           </ul>
         </div>
      </div>

    </div>
  );
};

export default App;