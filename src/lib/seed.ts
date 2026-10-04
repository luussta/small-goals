import type { WorkspaceData } from "./model";

const item = (id: string, text: string, completed = false) => ({ id, text, completed });
const goal = (id: string, title: string, items: ReturnType<typeof item>[], options: { collapsed?: boolean; active?: boolean } = {}) => ({
  id, title, collapsed: options.collapsed ?? true, active: options.active ?? false, items,
});

export const seedData: WorkspaceData = {
  sections: [
    { id: "today", title: "Today", collapsed: false, goals: [
      goal("launch-preparation", "Launch preparation", [item("launch-metadata", "Finish metadata", true), item("launch-production", "Test production", true), item("launch-analytics", "Check analytics", true), item("launch-post", "Write launch post", true)]),
      goal("seo", "SEO", [item("seo-sitemap", "Generate sitemap", true), item("seo-robots", "Configure robots.txt", true), item("seo-canonical", "Check canonical URLs"), item("seo-search-console", "Submit Search Console")], { collapsed: false, active: true }),
      goal("production-qa", "Production QA", [item("qa-mobile", "Check mobile layout"), item("qa-flow", "Test the sign-up flow"), item("qa-errors", "Verify error pages")]),
    ] },
    { id: "week", title: "This Week", collapsed: true, goals: [goal("post-launch", "Post-launch", [item("feedback", "Review feedback"), item("bugs", "Fix critical bugs"), item("analytics", "Review analytics")])] },
    { id: "month", title: "This Month", collapsed: true, goals: [goal("onboarding", "Improve onboarding", [item("first-run", "Review first-run experience"), item("welcome-email", "Simplify welcome email")])] },
    { id: "milestones", title: "Milestones", collapsed: true, goals: [goal("public-launch", "Public launch", [item("release-notes", "Prepare release notes"), item("announcement", "Share launch announcement")])] },
  ],
};
