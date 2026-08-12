"use client";

import { useState } from "react";
import styles from "./Phase6Events.module.css";
type EventFilter = "upcoming" | "project" | "learning" | "action" | "past";
type EventItem = {
  id: string;
  project_id: string;
  project_run_id: string;
  title: string;
  purpose: string | null;
  event_type: string;
  visibility: string;
  learning_objectives: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  registration_deadline: string | null;
  status: string;
  registrationStatus: string | null;
};

const filters: Array<[EventFilter, string]> = [
  ["upcoming", "Upcoming"],
  ["project", "My projects"],
  ["learning", "Learning"],
  ["action", "Needs action"],
  ["past", "Past"],
];

export default function MemberEventsPanel({ events, nowIso }: { events: EventItem[]; nowIso: string }) {
  const [working, setWorking] = useState(""),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState<EventFilter>("upcoming");
  const now = new Date(nowIso).getTime();
  const isPast = (item: EventItem) =>
    ["completed", "cancelled"].includes(item.status) ||
    new Date(item.ends_at || item.starts_at).getTime() < now;
  const isLearning = (item: EventItem) =>
    item.event_type === "learning_session" ||
    ["community_learning", "approval_required"].includes(item.visibility);
  const needsAction = (item: EventItem) =>
    ["pending_approval", "waitlisted", "offered"].includes(
      item.registrationStatus || "",
    );
  const visibleEvents = events.filter((item) => {
    if (filter === "past") return isPast(item);
    if (isPast(item)) return false;
    if (filter === "project") return !isLearning(item);
    if (filter === "learning") return isLearning(item);
    if (filter === "action") return needsAction(item);
    return true;
  });
  const countFor = (name: EventFilter) =>
    events.filter((item) => {
      if (name === "past") return isPast(item);
      if (isPast(item)) return false;
      if (name === "project") return !isLearning(item);
      if (name === "learning") return isLearning(item);
      if (name === "action") return needsAction(item);
      return true;
    }).length;
  async function action(item: EventItem, name: string) {
    setWorking(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/project-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: name,
          project_id: item.project_id,
          project_run_id: item.project_run_id,
          event_id: item.id,
          event_role: "learner",
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Unable to update registration.");
      setMessage(body.message || "Saved.");
      setTimeout(() => location.reload(), 350);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update registration.",
      );
    } finally {
      setWorking("");
    }
  }
  return (
    <div className={styles.memberEvents}>
      <div className="memberEventFilters" role="group" aria-label="Filter My Events">
        {filters.map(([key, label]) => (
          <button
            type="button"
            className={filter === key ? "active" : ""}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            key={key}
          >
            {label} <span>{countFor(key)}</span>
          </button>
        ))}
      </div>
      <div className="memberEventGrid">
        {visibleEvents.length ? (
          visibleEvents.map((item) => (
            <article className="memberEventCard" key={item.id}>
              <div className="projectEventMeta">
                <span className="eventOrigin">
                  {isLearning(item) ? "LEARNING EVENT" : "PROJECT EVENT"}
                </span>
                <span className="chip">
                  {item.event_type.replaceAll("_", " ").toUpperCase()}
                </span>
                {item.registrationStatus && (
                  <span
                    className={`chip ${item.registrationStatus === "reserved" ? "green" : ""}`}
                  >
                    {item.registrationStatus.replaceAll("_", " ").toUpperCase()}
                  </span>
                )}
              </div>
              <h2>{item.title}</h2>
              <p>{item.purpose}</p>
              {item.learning_objectives && (
                <p>
                  <strong>You will learn:</strong> {item.learning_objectives}
                </p>
              )}
              <dl>
                <div>
                  <dt>Your local time</dt>
                  <dd suppressHydrationWarning>
                    {new Date(item.starts_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Source timezone</dt>
                  <dd>{item.timezone}</dd>
                </div>
              </dl>
              <div className="projectEventActions">
                {item.registrationStatus === "reserved" && (
                  <a
                    className="button dark"
                    href={`/member/events/${item.id}/join`}
                  >
                    Join room →
                  </a>
                )}
                {item.registrationStatus === "offered" && (
                  <button
                    className="button dark"
                    disabled={working === item.id}
                    onClick={() => void action(item, "accept_offer")}
                  >
                    Accept offered place
                  </button>
                )}
                {["community_learning", "approval_required"].includes(
                  item.visibility,
                ) &&
                  (!item.registrationStatus ||
                    ["cancelled", "declined"].includes(
                      item.registrationStatus,
                    )) && (
                    <button
                      className="button dark"
                      disabled={working === item.id}
                      onClick={() => void action(item, "register")}
                    >
                      {working === item.id
                        ? "Saving…"
                        : item.visibility === "approval_required"
                          ? "Request a place"
                          : "Reserve a place"}
                    </button>
                  )}
                {item.registrationStatus &&
                  [
                    "reserved",
                    "pending_approval",
                    "waitlisted",
                    "offered",
                  ].includes(item.registrationStatus) && (
                    <button
                      className="button ghost"
                      disabled={working === item.id}
                      onClick={() => void action(item, "cancel_registration")}
                    >
                      Cancel
                    </button>
                  )}
              </div>
            </article>
          ))
        ) : (
          <div className="emptyState">
            <h2>No events in this view.</h2>
            <p>
              Choose another filter to see project sessions, learning events or
              your event history.
            </p>
          </div>
        )}
      </div>
      <div className="formStatus" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
