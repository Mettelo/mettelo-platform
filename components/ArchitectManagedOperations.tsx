"use client";
import { useEffect, useState } from "react";
type Application = {
  id: string;
  project_id: string;
  status: string;
  contribution_statement: string;
  applicant_name: string;
  projects: { title: string } | { title: string }[] | null;
  project_roles: { title: string } | { title: string }[] | null;
};
type Member = {
  user_id: string;
  name: string;
  headline: string | null;
  team_role: string;
  membership_status: string;
};
type Run = {
  id: string;
  project_id: string;
  run_number: number;
  status: string;
  team_size_threshold: number;
  projects: { title: string } | { title: string }[] | null;
  team: Member[];
};
function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}
export default function ArchitectManagedOperations() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/architect-operations");
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setApplications(body.applications || []);
      setRuns(body.runs || []);
    } else setMessage(body.error || "Unable to load delivery operations.");
  }
  useEffect(() => {
    void load();
  }, []);
  async function act(payload: Record<string, string>) {
    const key = JSON.stringify(payload);
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/architect-operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          reason: reason[payload.application_id || payload.run_id] || "",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error || "Unable to update the project.");
      setMessage("Project operation recorded.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the project.",
      );
    } finally {
      setBusy("");
    }
  }
  if (!applications.length && !runs.length) return null;
  return (
    <section className="managedOps">
      <div className="queueHead">
        <div>
          <span className="cardNumber">DELIVERY OPERATIONS</span>
          <h2>Applications, teams and completion</h2>
        </div>
      </div>
      {applications.length ? (
        <div className="opGrid">
          {applications.map((item) => (
            <article className="opCard" key={item.id}>
              <span className="chip">APPLICATION</span>
              <h3>{item.applicant_name}</h3>
              <small>
                {one(item.projects)?.title} ·{" "}
                {one(item.project_roles)?.title || "Project contributor"}
              </small>
              <p>{item.contribution_statement}</p>
              <textarea
                value={reason[item.id] || ""}
                onChange={(event) =>
                  setReason((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="Decision reason"
              />
              <div className="actions">
                <button
                  className="button dark"
                  disabled={busy !== ""}
                  onClick={() =>
                    void act({
                      project_id: item.project_id,
                      application_id: item.id,
                      action: "application_decision",
                      status: "approved",
                    })
                  }
                >
                  Approve to team
                </button>
                <button
                  className="button ghost"
                  disabled={busy !== ""}
                  onClick={() =>
                    void act({
                      project_id: item.project_id,
                      application_id: item.id,
                      action: "application_decision",
                      status: "shortlisted",
                    })
                  }
                >
                  Shortlist
                </button>
                <button
                  className="button ghost"
                  disabled={busy !== ""}
                  onClick={() =>
                    void act({
                      project_id: item.project_id,
                      application_id: item.id,
                      action: "application_decision",
                      status: "declined",
                    })
                  }
                >
                  Decline
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {runs.length ? (
        <div className="opGrid">
          {runs.map((run) => (
            <article className="opCard" key={run.id}>
              <span className="chip">
                TEAM {run.run_number} · {run.status.toUpperCase()}
              </span>
              <h3>{one(run.projects)?.title}</h3>
              <div className="teamList">
                {run.team.map((member) => (
                  <div key={member.user_id}>
                    <span>
                      <strong>{member.name}</strong>
                      <small>{member.team_role.replaceAll("_", " ")}</small>
                    </span>
                    {member.team_role !== "project_lead" && (
                      <button
                        className="button ghost"
                        disabled={busy !== ""}
                        onClick={() =>
                          void act({
                            project_id: run.project_id,
                            run_id: run.id,
                            user_id: member.user_id,
                            action: "assign_lead",
                          })
                        }
                      >
                        Make lead
                      </button>
                    )}
                    {member.team_role !== "reviewer" &&
                      member.team_role !== "project_lead" && (
                        <button
                          className="button ghost"
                          disabled={busy !== ""}
                          onClick={() =>
                            void act({
                              project_id: run.project_id,
                              run_id: run.id,
                              user_id: member.user_id,
                              action: "assign_reviewer",
                            })
                          }
                        >
                          Make reviewer
                        </button>
                      )}
                  </div>
                ))}
              </div>
              <textarea
                value={reason[run.id] || ""}
                onChange={(event) =>
                  setReason((current) => ({
                    ...current,
                    [run.id]: event.target.value,
                  }))
                }
                placeholder="Operational note for the audit trail"
              />
              <div className="actions">
                {run.status === "forming" && (
                  <button
                    className="button dark"
                    disabled={busy !== "" || !run.team.length}
                    onClick={() =>
                      void act({
                        project_id: run.project_id,
                        run_id: run.id,
                        action: "start_run",
                      })
                    }
                  >
                    Start project team
                  </button>
                )}
                {run.status === "active" && (
                  <button
                    className="button dark"
                    disabled={busy !== ""}
                    onClick={() =>
                      void act({
                        project_id: run.project_id,
                        run_id: run.id,
                        action: "submit_completion",
                      })
                    }
                  >
                    Submit completion review
                  </button>
                )}
                <a
                  className="button ghost"
                  href={`/member/projects/${run.project_id}?run=${run.id}`}
                >
                  Monitor workspace →
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="formStatus" role="status" aria-live="polite">
        {message}
      </div>
      <style jsx>{`
        .managedOps {
          display: grid;
          gap: 14px;
        }
        .queueHead {
          margin-top: 6px;
        }
        .queueHead h2 {
          margin: 4px 0;
        }
        .opGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .opCard {
          display: grid;
          align-content: start;
          gap: 11px;
          padding: 19px;
          border: 1px solid var(--line);
          border-radius: 17px;
          background: #fff;
        }
        .opCard h3,
        .opCard p {
          margin: 0;
        }
        .opCard p,
        .opCard small {
          color: var(--slate);
        }
        .opCard textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 76px;
          padding: 10px;
          border: 1px solid var(--line);
          border-radius: 10px;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .teamList {
          display: grid;
          gap: 7px;
        }
        .teamList > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          background: #f6f7f9;
        }
        .teamList span {
          display: grid;
        }
        .teamList .button {
          min-height: 40px;
        }
        @media (max-width: 760px) {
          .opGrid {
            grid-template-columns: 1fr;
          }
          .actions {
            display: grid;
          }
          .actions .button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
