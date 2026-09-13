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
          <span className={`text-sm font-medium px-2 py-1 rounded-full bg-gray-100 ${
            trend === 'improving' ? 'text-green-600' : trend === 'declining' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{explanation}</p>
        
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                <span>{value}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthScoreCard;
