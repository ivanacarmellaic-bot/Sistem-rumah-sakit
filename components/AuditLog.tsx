import React from 'react';
import { AuditLogEntry, AgentType, AgentConfig } from '../types';
import { AGENTS } from '../constants';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface AuditLogProps {
  logs: AuditLogEntry[];
}

const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <ShieldCheck size={18} className="text-blue-600" />
        <h2 className="font-semibold text-slate-700 text-sm">AIS Audit Trail (SOD Compliance)</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-xs font-semibold text-slate-500">Time</th>
              <th className="p-3 text-xs font-semibold text-slate-500">Agent</th>
              <th className="p-3 text-xs font-semibold text-slate-500">Action/Event</th>
              <th className="p-3 text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">
                  No system activity recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const agentConfig: AgentConfig = AGENTS[log.agent] || AGENTS[AgentType.ORCHESTRATOR];
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors text-xs">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium text-white ${agentConfig.color}`}>
                        {agentConfig.name.replace("Agen ", "").replace("Sistem Rumah Sakit ", "Orch.")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 max-w-[200px] truncate" title={log.details}>
                      {log.action}
                    </td>
                    <td className="p-3">
                      {log.status === 'SUCCESS' ? (
                        <span className="text-green-600 font-medium">Approved</span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle size={10} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;