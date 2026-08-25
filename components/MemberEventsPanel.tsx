"use client";

import { useEffect, useState } from "react";
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
  joinEntitled: boolean;
};

const filters: Array<[EventFilter, string]> = [
  ["upcoming", "Upcoming"],
  ["project", "My projects"],
  ["learning", "Learning"],
  ["action", "Needs action"],
  ["past", "Past"],
];

function eventLabel(item: EventItem) {
  if (item.event_type === "learning_session") return "LEARNING SESSION";
  if (item.event_type.includes("review")) return "PROJECT REVIEW";
  return "PROJECT SESSION";
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function MemberEventsPanel({ events, nowIso }: { events: EventItem[]; nowIso: string }) {
  const [working, setWorking] = useState(""),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState<EventFilter>("upcoming"),
    [now, setNow] = useState(() => new Date(nowIso).getTime());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 15_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
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
          visibleEvents.map((item) => {
            const start = new Date(item.starts_at).getTime();
            const end = item.ends_at ? new Date(item.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
            const joinOpen = start - 15 * 60 * 1000;
            const joinClose = end + 30 * 60 * 1000;
            const roomOpen = item.joinEntitled && item.status !== "cancelled" && now >= joinOpen && now <= joinClose;
            const roomUpcoming = item.joinEntitled && item.status !== "cancelled" && now < joinOpen && !isPast(item);
            const roomClosed = item.joinEntitled && now > joinClose;
            const timingLabel = item.status === "cancelled"
              ? "CANCELLED"
              : isPast(item) || roomClosed
                ? "PAST"
                : now >= joinOpen
                  ? "STARTING SOON"
                  : "UPCOMING";
            return (
              <article className="memberEventCard" key={item.id}>
                <div className="eventCardTop">
                  <div className="projectEventMeta">
                    <span className="eventOrigin">{eventLabel(item)}</span>
                    <span className="eventTypeLabel">{item.event_type.replaceAll("_", " ")}</span>
                  </div>
                  <span className={`eventTiming ${timingLabel === "STARTING SOON" ? "isSoon" : ""}`}>{timingLabel}</span>
                </div>

                <div className="eventCardBody">
                  <h2>{item.title}</h2>
                  {item.purpose && <p className="eventPurpose">{item.purpose}</p>}
                  {item.learning_objectives && (
                    <div className="learningBlock">
                      <span>You will learn</span>
                      <p>{item.learning_objectives}</p>
                    </div>
                  )}
                </div>

                <dl className="eventSchedule">
                  <div>
                    <dt>Date</dt>
                    <dd suppressHydrationWarning>{formatDay(item.starts_at)}</dd>
                  </div>
                  <div>
                    <dt>Your local time</dt>
                    <dd suppressHydrationWarning>{formatTime(item.starts_at)}{item.ends_at ? `–${formatTime(item.ends_at)}` : ""}</dd>
                  </div>
                  <div>
                    <dt>Source timezone</dt>
                    <dd>{item.timezone}</dd>
                  </div>
                </dl>

                <div className="eventActionFooter">
                  <div className="eventActionState" aria-live="polite">
                    {item.status === "cancelled" ? <><strong>Session cancelled</strong><span>This session is no longer available.</span></> :
                      roomOpen ? <><strong>Session is open</strong><span>You can join now.</span></> :
                      roomUpcoming ? <><strong>Join available soon</strong><span>Room opens 15 minutes before the session.</span></> :
                      item.registrationStatus === "pending_approval" ? <><strong>Request pending</strong><span>We will update this event when your place is confirmed.</span></> :
                      item.registrationStatus === "waitlisted" ? <><strong>Waitlisted</strong><span>You will be notified if a place becomes available.</span></> :
                      item.registrationStatus === "offered" ? <><strong>Place offered</strong><span>Accept the place to confirm attendance.</span></> :
                      isPast(item) ? <><strong>Session ended</strong><span>This event is now in your history.</span></> :
                      <><strong>{isLearning(item) ? "Attendance required" : "Project session"}</strong><span>{isLearning(item) ? "Reserve or request a place to attend." : "Your project access controls attendance."}</span></>}
                  </div>
                  <div className="projectEventActions">
                    {roomOpen && (
                      <a className="button dark" href={`/member/events/${item.id}/join`}>
                        Join session →
                      </a>
                    )}
                    {roomUpcoming && (
                      <span className="joinPending" aria-label="Join session unavailable until 15 minutes before the event">
                        Join session · opens 15 min before
                      </span>
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
                    {["community_learning", "approval_required"].includes(item.visibility) &&
                      !item.joinEntitled &&
                      (!item.registrationStatus || ["cancelled", "declined"].includes(item.registrationStatus)) && (
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
                      ["reserved", "pending_approval", "waitlisted", "offered"].includes(item.registrationStatus) && (
                        <button
                          className="button ghost"
                          disabled={working === item.id}
                          onClick={() => void action(item, "cancel_registration")}
                        >
                          Cancel
                        </button>
                      )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="emptyState eventEmptyState">
            <h2>No events in this view.</h2>
            <p>Choose another filter to see project sessions, learning events or your event history.</p>
          </div>
        )}
      </div>
      <div className="formStatus" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
