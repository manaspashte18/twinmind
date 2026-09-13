import React from 'react';
import { HealthScore } from '../types';

interface Props {
  score: number;
  category: string;
  breakdown: Record<string, number>;
  trend: string;
  explanation: string;
}

const HealthScoreCard: React.FC<Props> = ({ score, category, breakdown, trend, explanation }) => {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrokeColor = (s: number) => {
    if (s >= 80) return '#22c55e'; // green-500
    if (s >= 60) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="flex flex-col items-center justify-center relative">
        <svg className="w-36 h-36 transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke={getStrokeColor(score)}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getColor(score)}`}>{score}</span>
          <span className="text-sm font-medium text-gray-500">{category}</span>
        </div>
      </div>
      
      <div className="flex-1 w-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold text-gray-900">Supply Chain Health</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            trend === 'improving' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            trend === 'declining' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            Trend: {trend}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{explanation}</p>
        
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => {
            const barColor = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500';
            const textColor = value >= 80 ? 'text-emerald-700 font-semibold' : value >= 60 ? 'text-amber-700 font-semibold' : 'text-rose-700 font-semibold';
            return (
              <div key={key}>
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                  <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className={textColor}>{value}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${barColor} h-2 rounded-full transition-all duration-700 ease-out`} 
                    style={{ width: `${Math.min(100, Math.max(4, value))}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthScoreCard;
