"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Goal, Section } from "@/lib/model";

const id = () => crypto.randomUUID();
const done = (goal: Goal) => goal.items.length > 0 && goal.items.every((item) => item.completed);
const progress = (goal: Goal) => `${goal.items.filter((item) => item.completed).length}/${goal.items.length}`;
type AuthInfo = { authenticated: boolean; name: string; ready: boolean };

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const current = useRef<Section[]>([]);
  const saves = useRef(Promise.resolve());
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newGoalId, setNewGoalId] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);
  const skipBlur = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load workspace.");
    current.current = result.workspace.data.sections;
    setSections(current.current);
  }, []);
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" }).then((r) => r.json()).then(async (info: AuthInfo) => {
      setAuth(info);
      if (info.authenticated) await refresh().catch((cause) => setError(cause.message));
    }).catch(() => setError("Could not connect to the app."));
  }, [refresh]);

  function commit(update: (previous: Section[]) => Section[]) {
    const next = update(structuredClone(current.current));
    current.current = next;
    setSections(next);
    saves.current = saves.current.then(async () => {
      const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save changes.");
    }).catch(async (cause) => { setError(cause.message || "Could not save changes."); await refresh().catch(() => undefined); });
  }
  const updateGoal = (sectionId: string, goalId: string, update: (goal: Goal) => Goal) => commit((all) => all.map((section) => section.id !== sectionId ? section : { ...section, goals: section.goals.map((goal) => goal.id === goalId ? update(goal) : goal) }));
  const patchItem = (sectionId: string, goalId: string, itemId: string, update: (item: Goal["items"][number]) => Goal["items"][number]) => updateGoal(sectionId, goalId, (goal) => ({ ...goal, items: goal.items.map((item) => item.id === itemId ? update(item) : item) }));
  function beginGoal(goal: Goal) { setEditingGoal(goal.id); setDraft(goal.title); }
  function saveGoal(sectionId: string, goalId: string) {
    const value = draft.trim();
    if (value) updateGoal(sectionId, goalId, (goal) => ({ ...goal, title: value }));
    else if (newGoalId === goalId) commit((all) => all.map((section) => ({ ...section, goals: section.goals.filter((goal) => goal.id !== goalId) })));
    setEditingGoal(null); setNewGoalId(null);
  }
  function addGoal(sectionId: string) {
    const goal: Goal = { id: id(), title: "", collapsed: false, active: false, items: [] };
    commit((all) => all.map((section) => section.id === sectionId ? { ...section, collapsed: false, goals: [...section.goals, goal] } : section));
    setEditingGoal(goal.id); setDraft(""); setNewGoalId(goal.id);
  }
  function addItem(sectionId: string, goalId: string) {
    const item = { id: id(), text: "", completed: false };
    updateGoal(sectionId, goalId, (goal) => ({ ...goal, collapsed: false, items: [...goal.items, item] }));
    setEditingItem(item.id); setDraft(""); setNewItemId(item.id);
  }
  function saveItem(sectionId: string, goalId: string, itemId: string, value = draft) {
    const text = value.trim();
    if (text) patchItem(sectionId, goalId, itemId, (item) => ({ ...item, text }));
    else if (newItemId === itemId) updateGoal(sectionId, goalId, (goal) => ({ ...goal, items: goal.items.filter((item) => item.id !== itemId) }));
    setEditingItem(null); setNewItemId(null);
  }
  function keyGoal(event: KeyboardEvent<HTMLInputElement>, sectionId: string, goalId: string) {
    if (event.key === "Enter") { event.preventDefault(); skipBlur.current = goalId; saveGoal(sectionId, goalId); }
    if (event.key === "Escape") { event.preventDefault(); skipBlur.current = goalId; if (newGoalId === goalId) commit((all) => all.map((section) => ({ ...section, goals: section.goals.filter((goal) => goal.id !== goalId) }))); setEditingGoal(null); setNewGoalId(null); }
  }
  function keyItem(event: KeyboardEvent<HTMLInputElement>, sectionId: string, goalId: string, itemId: string) {
    if (event.key === "Enter") {
      event.preventDefault(); skipBlur.current = itemId;
      const text = draft.trim(); const next = { id: id(), text: "", completed: false };
      updateGoal(sectionId, goalId, (goal) => ({ ...goal, items: [...goal.items.flatMap((item) => item.id !== itemId ? [item] : text ? [{ ...item, text }, next] : [next])] }));
      setEditingItem(next.id); setDraft(""); setNewItemId(next.id);
    }
    if (event.key === "Escape") { event.preventDefault(); skipBlur.current = itemId; if (newItemId === itemId) updateGoal(sectionId, goalId, (goal) => ({ ...goal, items: goal.items.filter((item) => item.id !== itemId) })); setEditingItem(null); setNewItemId(null); }
  }
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Sign in failed."); return; }
    setAuth({ authenticated: true, name: result.name, ready: false }); setPassword(""); await refresh().catch((cause) => setError(cause.message));
  }
  useEffect(() => { if (editingGoal) titleInput.current?.focus(); }, [editingGoal]);
  useEffect(() => { if (editingItem) itemInput.current?.focus(); }, [editingItem]);

  if (!auth) return <main className="page-shell"><header className="page-header"><div className="wordmark">Small goals<span className="wordmark-period">.</span></div></header><p className="page-note">Connecting…</p></main>;
  if (!auth.authenticated) return <main className="page-shell login-shell"><header className="page-header"><div className="wordmark">{auth.name}<span className="wordmark-period">.</span></div><p className="page-note">A little clarity for what comes next.</p></header><form className="login-form" onSubmit={signIn}><label htmlFor="password">Your workspace password</label><input id="password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} /><button type="submit">Continue</button>{error && <p className="save-error" role="alert">{error}</p>}</form></main>;

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="wordmark">{auth.name}<span className="wordmark-period">.</span></div>
        <p className="page-note">A little clarity for what comes next.</p>
        <div className="color-legend" aria-label="Goal status colors"><span className="legend-item"><span className="legend-swatch legend-done" aria-hidden="true" />Done</span><span className="legend-item"><span className="legend-swatch legend-active" aria-hidden="true" />In progress</span><span className="legend-item"><span className="legend-swatch legend-idle" aria-hidden="true" />Not started</span></div>
      </header>
      {error && <p className="save-error" role="status">{error}</p>}
      <div className="sections" aria-label="Goals by timeframe">
        {sections.map((section, sectionIndex) => <section className="section" key={section.id}>
          <button className="section-heading" onClick={() => commit((all) => all.map((entry) => entry.id === section.id ? { ...entry, collapsed: !entry.collapsed } : entry))} aria-expanded={!section.collapsed}>
            <span className={`section-chevron ${section.collapsed ? "is-collapsed" : ""}`} aria-hidden="true" /><span className="section-title">{section.title}</span>
            {section.id === "today" && <span className="today-summary" role="group" aria-label="Today goal status counts"><span className="summary-count summary-done" title="Completed goals">{section.goals.filter(done).length}</span><span className="summary-count summary-active" title="In-progress goals">{section.goals.filter((goal) => goal.active && !done(goal)).length}</span><span className="summary-count summary-idle" title="Not-started goals">{section.goals.filter((goal) => !goal.active && !done(goal)).length}</span></span>}
            <span className="section-count">{section.goals.length} {section.goals.length === 1 ? "goal" : "goals"}</span>
          </button>
          <div className={`section-content ${section.collapsed ? "is-hidden" : ""}`}>
            {section.goals.map((goal) => { const completed = done(goal); return <article className={`goal ${completed ? "goal-done" : goal.active ? "goal-active" : "goal-idle"}`} key={goal.id}>
              <div className="goal-row">
                <button className={`goal-chevron ${goal.collapsed ? "is-collapsed" : ""}`} onClick={() => updateGoal(section.id, goal.id, (entry) => ({ ...entry, collapsed: !entry.collapsed }))} aria-label={`${goal.collapsed ? "Expand" : "Collapse"} ${goal.title || "new goal"}`} aria-expanded={!goal.collapsed} />
                <button className={`status-dot ${completed ? "status-complete" : goal.active ? "status-active" : ""}`} onClick={() => updateGoal(section.id, goal.id, (entry) => ({ ...entry, active: !completed && !entry.active }))} title={completed ? "Completed" : goal.active ? "Working on this" : "Mark as working on this"} aria-label={completed ? `${goal.title} is complete` : goal.active ? `Stop working on ${goal.title}` : `Mark ${goal.title || "goal"} as in progress`} />
                {editingGoal === goal.id ? <input ref={titleInput} className="edit-input goal-input" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (skipBlur.current === goal.id) { skipBlur.current = null; return; } saveGoal(section.id, goal.id); }} onKeyDown={(event) => keyGoal(event, section.id, goal.id)} aria-label="Goal title" placeholder="Goal name" /> : <button className="goal-title" onClick={() => beginGoal(goal)}>{goal.title || "Untitled goal"}</button>}
                <span className={`goal-progress ${completed ? "progress-done" : ""}`}>{completed ? "Done" : progress(goal)}</span>
                <button className="icon-button goal-delete" onClick={() => commit((all) => all.map((entry) => entry.id === section.id ? { ...entry, goals: entry.goals.filter((item) => item.id !== goal.id) } : entry))} aria-label={`Delete ${goal.title || "goal"}`} title="Delete goal"><span /></button>
              </div>
              <div className={`goal-body ${goal.collapsed ? "is-hidden" : ""}`}><ul className="task-list">
                {goal.items.map((item) => <li className={`task-row ${item.completed ? "task-done" : ""}`} key={item.id}>
                  <button className={`task-checkbox ${item.completed ? "is-checked" : ""}`} onClick={() => patchItem(section.id, goal.id, item.id, (entry) => ({ ...entry, completed: !entry.completed }))} aria-label={`${item.completed ? "Mark incomplete" : "Complete"}: ${item.text || "new item"}`} aria-pressed={item.completed}>{item.completed && <span />}</button>
                  {editingItem === item.id ? <input ref={itemInput} className="edit-input task-input" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (skipBlur.current === item.id) { skipBlur.current = null; return; } saveItem(section.id, goal.id, item.id); }} onKeyDown={(event) => keyItem(event, section.id, goal.id, item.id)} aria-label="Checklist item" placeholder="Next small step" /> : <button className="task-text" onClick={() => { setEditingItem(item.id); setDraft(item.text); }}>{item.text || "Untitled item"}</button>}
                  <button className="icon-button task-delete" onClick={() => updateGoal(section.id, goal.id, (entry) => ({ ...entry, items: entry.items.filter((task) => task.id !== item.id) }))} aria-label={`Delete ${item.text || "item"}`} title="Delete item"><span /></button>
                </li>)}
              </ul><button className="add-task" onClick={() => addItem(section.id, goal.id)}><span aria-hidden="true">+</span> Add an item</button></div>
            </article>; })}
            <button className="add-goal" onClick={() => addGoal(section.id)}><span aria-hidden="true">+</span> Add a goal</button>
          </div>{sectionIndex < sections.length - 1 && <div className="section-rule" />}
        </section>)}
      </div>
      <footer className="page-footer"><span>One small step at a time.</span><button className="signout" onClick={async () => { await fetch("/api/session", { method: "DELETE" }); setAuth({ authenticated: false, name: auth.name, ready: false }); current.current = []; setSections([]); }}>Sign out</button></footer>
    </main>
  );
}
