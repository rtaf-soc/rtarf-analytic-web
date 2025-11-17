import React from "react";

interface SeverityStatisticsProps {
  threats?: Array<{ severity?: string }>;
}

const SeverityStatistics: React.FC<SeverityStatisticsProps> = ({ 
  threats = []
}) => {
  // Count severity levels from threats array
  const severityCount = threats.reduce((acc, threat) => {
    const severity = threat.severity?.toLowerCase();
    if (severity === 'critical') acc.critical++;
    else if (severity === 'high') acc.high++;
    else if (severity === 'medium') acc.medium++;
    else if (severity === 'low') acc.low++;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0 });

  const stats = [
    {
      label: "CRITICAL",
      count: severityCount.critical,
      bgColor: "bg-red-500",
      glowColor: "shadow-red-500/50",
      textColor: "text-red-100"
    },
    {
      label: "HIGH",
      count: severityCount.high,
      bgColor: "bg-orange-500",
      glowColor: "shadow-orange-500/50",
      textColor: "text-orange-100"
    },
    {
      label: "MEDIUM",
      count: severityCount.medium,
      bgColor: "bg-yellow-500",
      glowColor: "shadow-yellow-500/50",
      textColor: "text-yellow-100"
    },
    {
      label: "LOW",
      count: severityCount.low,
      bgColor: "bg-blue-500",
      glowColor: "shadow-blue-500/50",
      textColor: "text-blue-100"
    }
  ];

  return (
    <div className="w-full px-1 py-0.5">
      <div className="grid grid-cols-4 gap-1">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`${stat.bgColor} rounded p-0.5 flex flex-col items-center justify-center`}
          >
            <div className="text-base font-bold text-white leading-tight">
              {stat.count}
            </div>
            <div className="text-[7px] font-medium text-white uppercase leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeverityStatistics;