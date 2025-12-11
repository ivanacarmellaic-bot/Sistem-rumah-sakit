export enum AgentType {
  ORCHESTRATOR = 'ORCHESTRATOR',
  MEDICAL_RECORDS = 'MEDICAL_RECORDS',
  BILLING = 'BILLING',
  REGISTRATION = 'REGISTRATION',
  APPOINTMENTS = 'APPOINTMENTS'
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  agent?: AgentType; // The agent that "spoke" this message
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  agent: AgentType;
  details: string;
  status: 'SUCCESS' | 'PENDING' | 'DENIED';
}

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  color: string;
  iconName: string;
}

export interface GeminiResponse {
  text: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}