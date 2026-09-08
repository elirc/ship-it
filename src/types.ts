export type Sprint = {
  id: string;
  title: string;
  goal: string;
  tickets: Ticket[];
  boss: BossTicket;
};
export type Ticket = {
  id: string;
  sprintId: string;
  title: string;
  userStory: string;
  acceptance: string[];
  starterFiles: Record<string, string>;
  solutionFiles: Record<string, string>;
  tests: string;
  hints: [string, string, string];
  review: ReviewNote[];
  xp: number;
  concepts: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  runtime?: "worker" | "dom" | "react" | "node";
  comingSoon?: boolean;
  testNames?: string[];
  parMinutes?: number;
  track?: "engineering";
  prerequisites?: string[];
};
export type BossTicket = Ticket & { rubric: RubricItem[] };
export type RubricItem = { id: string; label: string; check: "auto" | "self" };
export type ReviewNote = { file: string; line: number; text: string };
export type Progress = {
  ticketId: string;
  status: "locked" | "open" | "passed";
  attempts: number;
  hintsUsed: 0 | 1 | 2 | 3;
  bestCode: Record<string, string>;
  passedAt?: string;
};
export type TestResult = {
  name: string;
  passed: boolean;
  message?: string;
  expected?: string;
  received?: string;
  stack?: string;
  bonus?: boolean;
  duration: number;
};
export type RunResult = {
  results: TestResult[];
  logs: string[];
  duration: number;
  error?: string;
};
export type CompiledProject = {
  files: Record<string, string>;
  tests: string;
  entry: string;
};
export type LearningRecord = {
  hypothesis: string;
  explanation: string;
  evidence: string;
  tradeoff: string;
  recalls: number;
  lastRecallAt?: string;
  recall?: {
    active: boolean;
    files: Record<string, string>;
    assisted: boolean;
    attempts: number;
    startedAt: string;
    passed: boolean;
    spaced: boolean;
  };
};
