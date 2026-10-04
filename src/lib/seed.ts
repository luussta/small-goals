import type { WorkspaceData } from "./model";

export const seedData: WorkspaceData = {
  sections: [
    { id: "today", title: "Today", collapsed: false, goals: [] },
    { id: "week", title: "This Week", collapsed: true, goals: [] },
    { id: "month", title: "This Month", collapsed: true, goals: [] },
    { id: "milestones", title: "Milestones", collapsed: true, goals: [] },
  ],
};
