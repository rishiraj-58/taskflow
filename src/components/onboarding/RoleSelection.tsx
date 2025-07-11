'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Code2, 
  Eye, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelected: (role: string) => void;
  selectedRole?: string | null;
}

const roles = [
  {
    role: 'WORKSPACE_CREATOR',
    title: 'Workspace Creator / Executive',
    description: 'Strategic oversight and portfolio management across multiple projects',
    icon: Building2,
    responsibilities: [
      'Portfolio-level project oversight',
      'Strategic decision making',
      'Resource allocation across teams',
      'Executive reporting and analytics'
    ],
    perfectFor: 'CEOs, CTOs, VPs, and senior executives managing multiple projects',
    color: 'bg-gradient-to-br from-purple-500 to-purple-700'
  },
  {
    role: 'PROJECT_MANAGER',
    title: 'Project Manager',
    description: 'Sprint management, team coordination, and project delivery',
    icon: Users,
    responsibilities: [
      'Sprint planning and execution',
      'Team coordination and communication',
      'Risk assessment and mitigation',
      'Stakeholder updates and reporting'
    ],
    perfectFor: 'Project managers, scrum masters, and team coordinators',
    color: 'bg-gradient-to-br from-blue-500 to-blue-700'
  },
  {
    role: 'DEVELOPER',
    title: 'Developer',
    description: 'Task execution, code development, and technical implementation',
    icon: Code2,
    responsibilities: [
      'Feature development and coding',
      'Bug fixes and technical tasks',
      'Code reviews and quality assurance',
      'Technical documentation'
    ],
    perfectFor: 'Software developers, engineers, and technical contributors',
    color: 'bg-gradient-to-br from-green-500 to-green-700'
  },
  {
    role: 'STAKEHOLDER',
    title: 'Stakeholder',
    description: 'Project visibility, ROI tracking, and business alignment',
    icon: Eye,
    responsibilities: [
      'Project progress monitoring',
      'ROI and budget tracking',
      'Business requirement validation',
      'Milestone and deliverable review'
    ],
    perfectFor: 'Business analysts, product owners, and project sponsors',
    color: 'bg-gradient-to-br from-orange-500 to-orange-700'
  },
  {
    role: 'TEAM_LEAD',
    title: 'Team Lead',
    description: 'Technical guidance, code quality, and architectural decisions',
    icon: ShieldCheck,
    responsibilities: [
      'Technical architecture decisions',
      'Code quality and best practices',
      'Team mentoring and development',
      'Cross-project technical coordination'
    ],
    perfectFor: 'Tech leads, senior developers, and solution architects',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-700'
  }
];

export function RoleSelection({ onRoleSelected, selectedRole }: RoleSelectionProps) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map(({ role, title, description, icon: Icon, responsibilities, perfectFor, color }) => (
          <Card
            key={role}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 ${
              selectedRole === role 
                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50 dark:bg-blue-900/20' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
            onClick={() => onRoleSelected(role)}
            onMouseEnter={() => setHoveredRole(role)}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${color} text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                {selectedRole === role && (
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                {description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Key Responsibilities:</h4>
                <ul className="space-y-1">
                  {responsibilities.slice(0, 3).map((responsibility, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {responsibility}
                    </li>
                  ))}
                  {responsibilities.length > 3 && (
                    <li className="text-xs text-gray-500 dark:text-gray-500 italic">
                      +{responsibilities.length - 3} more responsibilities
                    </li>
                  )}
                </ul>
              </div>
              
              <div>
                <Badge variant="outline" className="text-xs">
                  {perfectFor}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRole && (
        <div className="mt-8 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ✨ Perfect! You've selected: {roles.find(r => r.role === selectedRole)?.title}
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Your dashboard and AI assistant will be optimized for your role. 
              Ready to start your personalized TaskFlow experience?
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 