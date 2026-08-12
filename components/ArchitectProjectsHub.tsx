"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  title: string;
  summary: string;
  project_archetype: string;
  governance_status: string;
  risk_level: string;
  admin_review_required: boolean;
  creator_name?: string;
  created_by_user_id?: string;
};
type Assignment = {
  project_id: string;
  assignment_role: string;
  projects: Project | Project[] | null;
};
type Payload = {
  assignments: Assignment[];
  reviewable: Project[];
  events: {
    id: string;
    project_id: string;
    event_type: string;
    reason: string;
    created_at: string;
  }[];
};
const empty: Payload = { assignments: [], reviewable: [], events: [] };
function projectOf(value: Assignment["projects"]) {
  return Array.isArray(value) ? value[0] || null : value;
}
export default function ArchitectProjectsHub({
  fixture,
}: {
  fixture?: Payload;
}) {
  const [data, setData] = useState<Payload>(fixture || empty);
  const [loading, setLoading] = useState(!fixture);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (fixture) return;
    setLoading(true);
    const response = await fetch("/api/architect-projects");
    const body = await response.json().catch(() => ({}));
    if (response.ok)
      setData({
        assignments: body.assignments || [],
        reviewable: body.reviewable || [],
        events: body.events || [],
      });
    else setMessage(body.error || "Unable to load Project Architect work.");
    setLoading(false);
  }, [fixture]);
  useEffect(() => {
    void load();
  }, [load]);
  const grouped = useMemo(() => {
    const result = {
      creating: [] as Assignment[],
      reviewing: [] as Assignment[],
      managing: [] as Assignment[],
    };
    for (const item of data.assignments) {
      if (item.assignment_role === "creating_architect")
        result.creating.push(item);
      if (item.assignment_role === "reviewing_architect")
        result.reviewing.push(item);
      if (item.assignment_role === "managing_architect")
        result.managing.push(item);
    }
    return result;
  }, [data.assignments]);
  async function act(projectId: string, action: string) {
    if (fixture) {
      setMessage(
        "Preview only: actions are disabled in the responsive fixture.",
      );
      return;
    }
    setBusy(`${projectId}:${action}`);
    setMessage("");
    try {
      const response = await fetch("/api/architect-projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          action,
          reason: reason[projectId] || "",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error || "Unable to record this action.");
      setMessage("Governance action recorded.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to record this action.",
      );
    } finally {
      setBusy("");
    }
  }
  const cards = (
    items: Assignment[],
    kind: "creating" | "reviewing" | "managing",
  ) =>
    items.length ? (
      <div className="architectCards">
        {items.map((item) => {
          const project = projectOf(item.projects);
          if (!project) return null;
          return (
            <article className="architectCard" key={`${kind}:${project.id}`}>
              <div className="cardTop">
                <span className="chip">
                  {project.governance_status.replaceAll("_", " ").toUpperCase()}
                </span>
                <span className={`risk ${project.risk_level}`}>
                  {project.risk_level.toUpperCase()}
                </span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              {kind === "creating" &&
                ["draft", "changes_requested"].includes(
                  project.governance_status,
                ) && (
                  <>
                    <textarea
                      aria-label={`Submission note for ${project.title}`}
                      value={reason[project.id] || ""}
                      onChange={(event) =>
                        setReason((current) => ({
                          ...current,
                          [project.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional note for the reviewing Architect"
                    />
                    <button
                      className="button dark"
                      disabled={busy !== ""}
                      onClick={() => void act(project.id, "submit")}
                    >
                      Submit for independent review →
                    </button>
                  </>
                )}
              {kind === "reviewing" &&
                project.governance_status === "submitted" && (
                  <>
                    <textarea
                      aria-label={`Decision reason for ${project.title}`}
                      value={reason[project.id] || ""}
                      onChange={(event) =>
                        setReason((current) => ({
                          ...current,
                          [project.id]: event.target.value,
                        }))
                      }
                      placeholder="Required decision reason"
                    />
                    <div className="cardActions">
                  {project.risk_level === "standard" ? (
                    <button
                      className="button dark"
                      disabled={busy !== ""}
                      onClick={() => void act(project.id, "approve")}
                    >
                      Approve standard project
                    </button>
                  ) : (
                    <button
                      className="button dark"
                      disabled={busy !== ""}
                      onClick={() => void act(project.id, "recommend_admin")}
                    >
                      Recommend to Admin
                    </button>
                  )}
                      <button
                        className="button ghost"
                        disabled={busy !== ""}
                        onClick={() => void act(project.id, "request_changes")}
                      >
                        Request changes
                      </button>
                      <button
                        className="button ghost danger"
                        disabled={busy !== ""}
                        onClick={() => void act(project.id, "deny")}
                      >
                        Deny
                      </button>
                    </div>
                  </>
                )}
              {kind === "managing" && (
                <a
                  className="button dark"
                  href={`/member/projects/${project.id}`}
                >
                  Open project workspace →
                </a>
              )}
            </article>
          );
        })}
      </div>
    ) : (
      <div className="emptyState">
        <p>No projects in this queue.</p>
      </div>
    );
  return (
    <div className="architectHub">
      <div className="hubActions">
        <a className="button dark" href="/member/architect-projects/new">
          Create project →
        </a>
        <span>Private draft first · independent review before publishing</span>
      </div>
      {loading ? (
        <div className="emptyState">
          <p>Loading your Project Architect work…</p>
        </div>
      ) : (
        <>
          <section>
            <div className="queueHead">
              <div>
                <span className="cardNumber">YOUR PROPOSALS</span>
                <h2>Shape and submit</h2>
              </div>
              <span className="chip">{grouped.creating.length}</span>
            </div>
            {cards(grouped.creating, "creating")}
          </section>
          <section>
            <div className="queueHead">
              <div>
                <span className="cardNumber">INDEPENDENT REVIEW</span>
                <h2>Review work you did not create</h2>
              </div>
              <span className="chip">
                {data.reviewable.length + grouped.reviewing.length}
              </span>
            </div>
            {data.reviewable.length ? (
              <div className="architectCards">
                {data.reviewable.map((project) => (
                  <article
                    className="architectCard"
                    key={`claim:${project.id}`}
                  >
                    <div className="cardTop">
                      <span className="chip">WAITING FOR REVIEW</span>
                      <span className={`risk ${project.risk_level}`}>
                        {project.risk_level.toUpperCase()}
                      </span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.summary}</p>
                    <small>
                      Created by{" "}
                      {project.creator_name || "another Project Architect"}
                    </small>
                    <button
                      className="button dark"
                      disabled={busy !== ""}
                      onClick={() => void act(project.id, "claim_review")}
                    >
                      Accept independent review →
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
            {cards(grouped.reviewing, "reviewing")}
          </section>
          <section>
            <div className="queueHead">
              <div>
                <span className="cardNumber">MANAGED DELIVERY</span>
                <h2>Projects assigned to your oversight</h2>
              </div>
              <span className="chip">{grouped.managing.length}</span>
            </div>
            {cards(grouped.managing, "managing")}
          </section>
        </>
      )}
      <div className="formStatus" role="status" aria-live="polite">
        {message}
      </div>
      <style jsx>{`
        .architectHub {
          display: grid;
          gap: 26px;
        }
        .hubActions,
        .queueHead,
        .cardTop,
        .cardActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .hubActions > span {
          font-size: 0.74rem;
          color: var(--slate);
        }
        .queueHead {
          margin-bottom: 12px;
        }
        .queueHead h2 {
          margin: 4px 0 0;
        }
        .architectCards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .architectCard {
          display: grid;
          align-content: start;
          gap: 12px;
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: #fff;
        }
        .architectCard h3,
        .architectCard p {
          margin: 0;
        }
        .architectCard p,
        .architectCard small {
          color: var(--slate);
        }
        .architectCard textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 84px;
          padding: 11px;
          border: 1px solid var(--line);
          border-radius: 10px;
        }
        .risk {
          font-size: 0.62rem;
          font-weight: 850;
          letter-spacing: 0.08em;
        }
        .risk.standard {
          color: #18714c;
        }
        .risk.controlled {
          color: #8b641f;
        }
        .risk.prohibited {
          color: #a22d2d;
        }
        .cardActions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        .danger {
          color: #9a2d2d !important;
        }
        @media (max-width: 760px) {
          .architectCards {
            grid-template-columns: 1fr;
          }
          .hubActions {
            align-items: stretch;
            display: grid;
          }
          .hubActions .button {
            width: 100%;
          }
          .cardActions {
            display: grid;
          }
          .cardActions .button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
