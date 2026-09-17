export type CompletionReadiness = {
  ready?: boolean
  required_milestones?: number
  completed_milestones?: number
  required_tasks?: number
  completed_tasks?: number
  required_deliverables?: number
  completed_deliverables?: number
  success_criteria_required?: number
  success_criteria_satisfied?: number
  members_requiring_contribution_submission?: number
  members_with_contribution_submission?: number
  project_members_requiring_proof?: number
  members_with_verified_proof?: number
  pending_contributions?: number
  presentation_required?: boolean
  presentation_status?: string | null
  blockers?: string[]
  [key: string]: unknown
}

/**
 * Phase 19 owns project-level completion readiness. Phase 20 owns individual
 * contribution verification and Verified Proof. Contribution *submission
 * presence* can be a project-completion condition, but verification status can
 * never make the Phase 19 completion decision.
 */
export function projectCompletionReadiness(raw: CompletionReadiness | null | undefined) {
  if (!raw) return {ready: false, blockers: ['Completion readiness is unavailable.'], raw: null}

  const blockers: string[] = []
  const requiredMilestones = Number(raw.required_milestones || 0)
  const completedMilestones = Number(raw.completed_milestones || 0)
  const requiredTasks = Number(raw.required_tasks || 0)
  const completedTasks = Number(raw.completed_tasks || 0)
  const requiredDeliverables = Number(raw.required_deliverables || 0)
  const completedDeliverables = Number(raw.completed_deliverables || 0)
  const requiredCriteria = Number(raw.success_criteria_required || 0)
  const satisfiedCriteria = Number(raw.success_criteria_satisfied || 0)
  const contributionMembers = Number(raw.members_requiring_contribution_submission || 0)
  const contributionSubmitters = Number(raw.members_with_contribution_submission || 0)

  if (requiredMilestones < 1) blockers.push('At least one required milestone must be configured.')
  if (completedMilestones < requiredMilestones) blockers.push(`${requiredMilestones - completedMilestones} required milestone(s) incomplete.`)
  if (completedTasks < requiredTasks) blockers.push(`${requiredTasks - completedTasks} required task(s) incomplete.`)
  if (requiredDeliverables < 1) blockers.push('At least one required deliverable must be configured.')
  if (completedDeliverables < requiredDeliverables) blockers.push(`${requiredDeliverables - completedDeliverables} required deliverable(s) missing.`)
  if (requiredCriteria < 1) blockers.push('At least one required success criterion must be configured.')
  if (satisfiedCriteria < requiredCriteria) blockers.push(`${requiredCriteria - satisfiedCriteria} success criterion/criteria not yet satisfied.`)
  if (contributionSubmitters < contributionMembers) blockers.push(`${contributionMembers - contributionSubmitters} required contribution submission(s) missing.`)
  if (raw.presentation_required && raw.presentation_status !== 'verified') blockers.push('Required presentation is not verified.')

  // Preserve non-Proof blockers emitted by newer database implementations.
  for (const blocker of Array.isArray(raw.blockers) ? raw.blockers : []) {
    if (!/proof|contribution verification|verified member/i.test(blocker) && !blockers.includes(blocker)) blockers.push(blocker)
  }

  return {
    ready: Boolean(raw.ready) && blockers.length === 0,
    blockers,
    raw,
    contribution_submissions: {
      members_requiring_submission: contributionMembers,
      members_with_submission: contributionSubmitters,
    },
    // These legacy counters remain informational for Phase 20/status context
    // only. They can never block Phase 19 project completion.
    proof: {
      members_requiring_proof: Number(raw.project_members_requiring_proof || 0),
      members_with_verified_proof: Number(raw.members_with_verified_proof || 0),
      pending_contributions: Number(raw.pending_contributions || 0),
    },
  }
}
