"use client";

import { FormEvent, useState } from "react";

export type ProjectEvent = {
  id: string;
  title: string;
  purpose: string | null;
  event_type: string;
  visibility: string;
  agenda: string | null;
  learning_objectives: string | null;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  capacity: number | null;
  registration_deadline: string | null;
  join_url: string;
  organiser_user_id: string;
  linked_milestone_id: string | null;
  linked_deliverable_id: string | null;
};
type Person = { id: string; name: string; role: string };
type Review = {
  event_id: string;
  outcome: string;
  reason: string;
  action_items: string | null;
  created_at: string;
};
type Props = {
  projectId: string;
  projectRunId: string | null;
  currentUserId: string;
  events: ProjectEvent[];
  team: Person[];
  milestones: { id: string; title: string }[];
  deliverables: { id: string; title: string }[];
  reviews: Review[];
  canLead: boolean;
  canReview: boolean;
  canOversee: boolean;
};

export default function ProjectEventsPanel(props: Props) {
  const [working, setWorking] = useState(""),
    [message, setMessage] = useState("");
  async function send(
    action: string,
    payload: Record<string, unknown>,
    form?: HTMLFormElement,
  ) {
    setWorking(action);
    setMessage("");
    try {
      const response = await fetch("/api/project-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          project_id: props.projectId,
          project_run_id: props.projectRunId,
          ...payload,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Unable to update this event.");
      setMessage(result.message || "Saved.");
      form?.reset();
      setTimeout(() => location.reload(), 400);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update this event.",
      );
    } finally {
      setWorking("");
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      fd = new FormData(form);
    void send(
      "create",
      {
        ...Object.fromEntries(fd.entries()),
        presenter_ids: fd.getAll("presenter_ids"),
        required_attendee_ids: fd.getAll("required_attendee_ids"),
      },
      form,
    );
  }
  return (
    <section className="panel projectEventsPanel" id="meetings">
      <div className="panelHead">
        <div>
          <span className="cardNumber">MEETINGS &amp; PRESENTATIONS</span>
          <h3 style={{ marginTop: 8 }}>Governed project events</h3>
        </div>
        <span className="chip">{props.events.length} SCHEDULED</span>
      </div>
      <p className="panelNote">
        Working sessions, reviews and presentations stay attached to this
        project run. Times display in each attendee’s local timezone.
      </p>
      {props.events.length ? (
        <div className="projectEventList">
          {props.events.map((item) => {
            const review = props.reviews.find(
              (row) => row.event_id === item.id,
            );
            return (
              <article className="projectEventCard" key={item.id}>
                <div className="projectEventMeta">
                  <span className="chip">
                    {item.event_type.replaceAll("_", " ").toUpperCase()}
                  </span>
                  <span className="chip">
                    {item.visibility.replaceAll("_", " ").toUpperCase()}
                  </span>
                  {review && (
                    <span
                      className={`chip ${review.outcome === "pass" ? "green" : ""}`}
                    >
                      {review.outcome.replaceAll("_", " ").toUpperCase()}
                    </span>
                  )}
                </div>
                <h4>{item.title}</h4>
                <p>{item.purpose}</p>
                <dl>
                  <div>
                    <dt>Starts</dt>
                    <dd suppressHydrationWarning>
                      {new Date(item.starts_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  {item.ends_at && (
                    <div>
                      <dt>Ends</dt>
                      <dd suppressHydrationWarning>
                        {new Date(item.ends_at).toLocaleString(undefined, {
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Source timezone</dt>
                    <dd>{item.timezone}</dd>
                  </div>
                </dl>
                {item.learning_objectives && (
                  <p>
                    <strong>Learning objectives:</strong>{" "}
                    {item.learning_objectives}
                  </p>
                )}
                {review && (
                  <div className="eventOutcome">
                    <strong>Reviewer outcome</strong>
                    <p>{review.reason}</p>
                    {review.action_items && (
                      <small>Actions: {review.action_items}</small>
                    )}
                  </div>
                )}
                <div className="projectEventActions">
                  {item.status !== "cancelled" && (
                    <a
                      className="button dark"
                      href={`/member/events/${item.id}/join`}
                    >
                      Join event →
                    </a>
                  )}
                  {props.canOversee && item.status !== "cancelled" && (
                    <>
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() =>
                          void send("restrict", { event_id: item.id })
                        }
                        disabled={
                          working === "restrict" ||
                          item.visibility === "project_team"
                        }
                      >
                        Restrict to team
                      </button>
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          const reason = prompt(
                            "Why is this event being cancelled?",
                          );
                          if (reason)
                            void send("cancel", { event_id: item.id, reason });
                        }}
                        disabled={working === "cancel"}
                      >
                        Cancel event
                      </button>
                    </>
                  )}
                </div>
                {props.canOversee && item.status !== "cancelled" && (
                  <details className="workspaceComposer">
                    <summary>Edit event details</summary>
                    <form
                      className="formCard compactForm"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        void send(
                          "update",
                          {
                            event_id: item.id,
                            ...Object.fromEntries(new FormData(form).entries()),
                          },
                          form,
                        );
                      }}
                    >
                      <label>
                        Title
                        <input name="title" defaultValue={item.title} required />
                      </label>
                      <label>
                        Purpose
                        <textarea
                          name="purpose"
                          defaultValue={item.purpose || ""}
                          required
                        />
                      </label>
                      <label>
                        Visibility
                        <select name="visibility" defaultValue={item.visibility}>
                          <option value="project_team">Project team only</option>
                          <option value="named_members">Named members</option>
                          <option value="community_learning">
                            Community learning event
                          </option>
                          <option value="approval_required">
                            Approval required
                          </option>
                        </select>
                      </label>
                      <div className="fieldRow">
                        <label>
                          Starts
                          <input
                            name="starts_at"
                            type="datetime-local"
                            defaultValue={item.starts_at.slice(0, 16)}
                            required
                          />
                        </label>
                        <label>
                          Ends
                          <input
                            name="ends_at"
                            type="datetime-local"
                            defaultValue={item.ends_at?.slice(0, 16) || ""}
                            required
                          />
                        </label>
                      </div>
                      <label>
                        Source timezone
                        <input
                          name="timezone"
                          defaultValue={item.timezone}
                          required
                        />
                      </label>
                      <button
                        className="button dark"
                        disabled={working === "update"}
                      >
                        {working === "update" ? "Saving…" : "Save changes"}
                      </button>
                    </form>
                  </details>
                )}
                {props.canReview &&
                  !review &&
                  ["project_review", "final_presentation"].includes(
                    item.event_type,
                  ) && (
                    <EventReview
                      eventId={item.id}
                      working={working === "review"}
                      onReview={(outcome, reason, action_items) =>
                        void send("review", {
                          event_id: item.id,
                          outcome,
                          reason,
                          action_items,
                        })
                      }
                    />
                  )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="emptyState">
          <h3>No project events scheduled.</h3>
          <p>
            The Project Lead can plan the next working session, review,
            presentation or learning session.
          </p>
        </div>
      )}
      {props.canLead && props.projectRunId && (
        <details className="workspaceComposer">
          <summary>Schedule a project event</summary>
          <form className="formCard eventForm" onSubmit={create}>
            <div className="fieldRow">
              <label>
                Event type
                <select name="event_type" defaultValue="team_working_session">
                  <option value="team_working_session">
                    Team working session
                  </option>
                  <option value="project_review">Project review</option>
                  <option value="final_presentation">Final presentation</option>
                  <option value="learning_session">Learning session</option>
                </select>
              </label>
              <label>
                Who can attend?
                <select name="visibility" defaultValue="project_team">
                  <option value="project_team">Project team only</option>
                  <option value="named_members">Named members</option>
                  <option value="community_learning">
                    Community learning event
                  </option>
                  <option value="approval_required">Approval required</option>
                </select>
              </label>
            </div>
            <label>
              Title
              <input name="title" required maxLength={180} />
            </label>
            <label>
              Purpose
              <textarea name="purpose" required maxLength={1200} />
            </label>
            <label>
              Agenda
              <textarea name="agenda" maxLength={5000} />
            </label>
            <label>
              Learning objectives
              <textarea
                name="learning_objectives"
                maxLength={3000}
                placeholder="Required for a learning session."
              />
            </label>
            <div className="fieldRow">
              <label>
                Starts
                <input name="starts_at" type="datetime-local" required />
              </label>
              <label>
                Ends
                <input name="ends_at" type="datetime-local" required />
              </label>
            </div>
            <div className="fieldRow">
              <label>
                Source timezone
                <input name="timezone" defaultValue="Europe/London" required />
              </label>
              <label>
                Capacity
                <input name="capacity" type="number" min="1" max="500" />
              </label>
            </div>
            <div className="fieldRow">
              <label>
                Registration deadline
                <input name="registration_deadline" type="datetime-local" />
              </label>
              <label>
                Milestone
                <select name="linked_milestone_id" defaultValue="">
                  <option value="">No milestone</option>
                  {props.milestones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Deliverable
              <select name="linked_deliverable_id" defaultValue="">
                <option value="">No deliverable</option>
                {props.deliverables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Revision of an earlier review or presentation
              <select name="previous_event_id" defaultValue="">
                <option value="">Not a revision</option>
                {props.events
                  .filter((item) =>
                    ["project_review", "final_presentation"].includes(
                      item.event_type,
                    ),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <div className="fieldRow">
              <label>
                Presenters
                <select
                  name="presenter_ids"
                  multiple
                  size={Math.min(6, Math.max(3, props.team.length))}
                >
                  {props.team.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Required attendees
                <select
                  name="required_attendee_ids"
                  multiple
                  size={Math.min(6, Math.max(3, props.team.length))}
                >
                  {props.team.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="fieldHelp">
              Use Ctrl/Cmd to select several people. A presenter cannot formally
              review the same event.
            </p>
            <button className="button dark" disabled={working === "create"}>
              {working === "create" ? "Scheduling…" : "Schedule event"}
            </button>
          </form>
        </details>
      )}
      <div className="formStatus" role="status" aria-live="polite">
        {message}
      </div>
      <style jsx global>{`
        .projectEventsPanel {
          margin-top: 18px;
        }
        .projectEventList {
          display: grid;
          gap: 16px;
        }
        .projectEventCard {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px;
          min-width: 0;
        }
        .projectEventCard h4 {
          font-size: 1.35rem;
          margin: 14px 0 8px;
        }
        .projectEventMeta,
        .projectEventActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .projectEventCard dl,
        .memberEventCard dl {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin: 16px 0;
        }
        .projectEventCard dt,
        .memberEventCard dt {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--slate);
        }
        .projectEventCard dd,
        .memberEventCard dd {
          margin: 0;
          font-weight: 700;
        }
        .projectEventActions {
          margin-top: 18px;
        }
        .eventOutcome {
          padding: 14px;
          border-radius: 14px;
          background: #f4f7f5;
        }
        .eventReview {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }
        .eventReview label {
          display: block;
          margin: 10px 0;
        }
        .eventReview select,
        .eventReview textarea {
          display: block;
          width: 100%;
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 10px;
        }
        .eventForm .fieldHelp {
          font-size: 0.78rem;
          color: var(--slate);
        }
        .memberEventGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .memberEventCard {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 24px;
          min-width: 0;
        }
        .memberEventCard h2 {
          font-size: 1.6rem;
        }
        @media (max-width: 760px) {
          .projectEventsPanel {
            padding: 18px;
          }
          .projectEventCard {
            padding: 16px;
          }
          .eventForm .fieldRow,
          .memberEventGrid {
            grid-template-columns: 1fr;
          }
          .projectEventActions .button {
            width: 100%;
            min-height: 44px;
          }
          .projectEventCard dl {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .eventForm input,
          .eventForm select,
          .eventForm textarea {
            min-height: 44px;
          }
        }
      `}</style>
    </section>
  );
}

function EventReview({
  eventId,
  working,
  onReview,
}: {
  eventId: string;
  working: boolean;
  onReview: (outcome: string, reason: string, actions: string) => void;
}) {
  const [outcome, setOutcome] = useState("pass"),
    [reason, setReason] = useState(""),
    [actions, setActions] = useState("");
  return (
    <div className="eventReview">
      <h5>Formal independent review</h5>
      <label htmlFor={`outcome-${eventId}`}>
        Outcome
        <select
          id={`outcome-${eventId}`}
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        >
          <option value="pass">Pass</option>
          <option value="revisions_required">Revisions required</option>
          <option value="not_passed">Not passed</option>
        </select>
      </label>
      <label htmlFor={`reason-${eventId}`}>
        Decision and evidence
        <textarea
          id={`reason-${eventId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </label>
      <label htmlFor={`actions-${eventId}`}>
        Actions for the team
        <textarea
          id={`actions-${eventId}`}
          value={actions}
          onChange={(event) => setActions(event.target.value)}
        />
      </label>
      <button
        className="button dark"
        type="button"
        disabled={working || !reason.trim()}
        onClick={() => onReview(outcome, reason, actions)}
      >
        Record outcome
      </button>
    </div>
  );
}
