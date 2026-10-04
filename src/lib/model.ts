import { z } from "zod";

export const ItemSchema = z.object({ id: z.string().min(1).max(100), text: z.string().max(500), completed: z.boolean() }).strict();
export const GoalSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().max(200), collapsed: z.boolean(), active: z.boolean(), items: z.array(ItemSchema).max(200),
}).strict();
export const SectionSchema = z.object({ id: z.string().min(1).max(100), title: z.string().min(1).max(100), collapsed: z.boolean(), goals: z.array(GoalSchema).max(200) }).strict();
export const WorkspaceDataSchema = z.object({ sections: z.array(SectionSchema).min(1).max(30) }).strict().superRefine((data, context) => {
  const ids = new Set<string>();
  const add = (id: string, path: (string | number)[]) => {
    if (ids.has(id)) context.addIssue({ code: "custom", message: "IDs must be unique across the workspace.", path });
    ids.add(id);
  };
  data.sections.forEach((section, sectionIndex) => {
    add(section.id, ["sections", sectionIndex, "id"]);
    section.goals.forEach((goal, goalIndex) => {
      add(goal.id, ["sections", sectionIndex, "goals", goalIndex, "id"]);
      goal.items.forEach((item, itemIndex) => add(item.id, ["sections", sectionIndex, "goals", goalIndex, "items", itemIndex, "id"]));
    });
  });
});

export type Item = z.infer<typeof ItemSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type WorkspaceData = z.infer<typeof WorkspaceDataSchema>;
export type Workspace = { id: string; name: string; data: WorkspaceData; version: number; updatedAt: string };

export const isComplete = (goal: Goal) => goal.items.length > 0 && goal.items.every((item) => item.completed);
export function normalize(data: WorkspaceData): WorkspaceData {
  return { sections: data.sections.map((section) => ({ ...section, goals: section.goals.map((goal) => isComplete(goal) ? { ...goal, active: false } : goal) })) };
}
export const makeId = () => crypto.randomUUID();
