import React from 'react';

export interface ApiLog {
  endpoint: string;
  ms: number;
  status: number;
}

interface Props {
  logs: ApiLog[];
  onDownload: () => void;
}

export const DiagnosticsPanel: React.FC<Props> = ({ logs, onDownload }) => {
  if (logs.length === 0) return null;
  const median = [...logs].sort((a,b)=>a.ms-b.ms)[Math.floor(logs.length/2)]?.ms || 0;
  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Diagnostics</h3>
      <table className="min-w-full text-xs">
        <thead>
          <tr><th>Endpoint</th><th>ms</th><th>Status</th></tr>
        </thead>
        <tbody>
          {logs.map((log,i)=>(
            <tr key={i} className={log.ms>2*median?"text-red-600":""}>
              <td>{log.endpoint}</td><td>{log.ms}</td><td>{log.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onDownload} className="mt-2 text-sm text-primary-600 underline">Download Logs</button>
    </div>
  );
};
