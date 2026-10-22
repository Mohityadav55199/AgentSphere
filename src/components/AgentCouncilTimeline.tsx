import React from "react";
import { CheckCircle2, ChevronRight, ShieldCheck, Sparkles, Terminal } from "lucide-react";

export interface CouncilMember {
  id: "supervisor" | "researcher" | "developer" | "analyst" | "auditor";
  name: string;
  role: string;
  icon: string;
  activeColor: string;
  badgeBg: string;
  borderColor: string;
  headingMatch: RegExp;
}

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: "supervisor",
    name: "Supervisor",
    role: "Planning & Strategy",
    icon: "🎯",
    activeColor: "text-purple-600 dark:text-purple-400",
    badgeBg:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    borderColor: "border-purple-300 dark:border-purple-800",
    headingMatch: /### 🎯\s*Supervisor Plan/i,
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Context & Retrieval",
    icon: "🔍",
    activeColor: "text-sky-600 dark:text-sky-400",
    badgeBg:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    borderColor: "border-sky-300 dark:border-sky-800",
    headingMatch: /### 🔍\s*(Research|Context)/i,
  },
  {
    id: "developer",
    name: "Developer",
    role: "Code & Implementation",
    icon: "💻",
    activeColor: "text-emerald-600 dark:text-emerald-400",
    badgeBg:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    borderColor: "border-emerald-300 dark:border-emerald-800",
    headingMatch: /### 💻\s*Developer Implementation/i,
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "Data & Architecture",
    icon: "📊",
    activeColor: "text-amber-600 dark:text-amber-400",
    badgeBg:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    borderColor: "border-amber-300 dark:border-amber-800",
    headingMatch: /### 📊\s*Data & Architecture/i,
  },
  {
    id: "auditor",
    name: "Auditor",
    role: "Security & QA Critic",
    icon: "🛡️",
    activeColor: "text-rose-600 dark:text-rose-400",
    badgeBg:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    borderColor: "border-rose-300 dark:border-rose-800",
    headingMatch: /### 🛡️\s*Security Audit/i,
  },
];

interface AgentCouncilTimelineProps {
  content: string;
  activeNode?: string;
}

export const AgentCouncilTimeline: React.FC<AgentCouncilTimelineProps> = ({
  content,
  activeNode,
}) => {
  // Check which council members participated in this message
  const participatingMembers = COUNCIL_MEMBERS.map((member) => {
    const hasSection = member.headingMatch.test(content);
    const isActive = activeNode === member.id;
    return {
      ...member,
      participated: hasSection || isActive,
    };
  });

  const activeCount = participatingMembers.filter((m) => m.participated).length;

  // If this message doesn't contain multi-agent participation, don't show the bar
  if (activeCount === 0 && !activeNode) {
    return null;
  }

  const isAuditorDone = participatingMembers.find((m) => m.id === "auditor")?.participated;

  return (
    <div className="mb-3 rounded-xl border border-gray-200/80 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 p-2.5 shadow-xs backdrop-blur-xs dark:border-gray-800 dark:from-gray-900/80 dark:via-gray-900/50 dark:to-gray-900/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-3 w-3" />
          </span>
          <span>5-Agent Council Pipeline</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            {activeCount > 0 ? `${activeCount} Agents Active` : "Multi-Agent Swarm"}
          </span>
        </div>

        {isAuditorDone && (
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Audited & Verified</span>
          </div>
        )}
      </div>

      {/* Stepper Pipeline */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-1 dark:border-gray-800/80">
        {participatingMembers.map((member, idx) => {
          return (
            <React.Fragment key={member.id}>
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-all ${
                  member.participated
                    ? `${member.badgeBg} font-semibold shadow-2xs`
                    : "border-gray-200/60 bg-gray-50 text-gray-400 opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
                }`}
                title={`${member.name} (${member.role}): ${
                  member.participated ? "Contributed to this response" : "Waiting on standby"
                }`}
              >
                <span>{member.icon}</span>
                <span className="text-[11px] font-medium">{member.name}</span>
                {member.participated && (
                  <CheckCircle2 className="h-3 w-3 text-current opacity-80" />
                )}
              </div>

              {idx < participatingMembers.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
