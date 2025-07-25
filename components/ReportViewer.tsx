import React from 'react';

interface ReportViewerProps {
  text: string;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ text }) => (
  <pre className="whitespace-pre-wrap text-sm font-sans">{text}</pre>
);

export default ReportViewer;
