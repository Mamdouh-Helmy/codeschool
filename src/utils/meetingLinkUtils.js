// utils/meetingLinkUtils.js
import MeetingLink from "../app/models/MeetingLink";
import Session from "../app/models/Session";
import Group from "../app/models/Group";

/**
 * Get all conflicts for a meeting link across all groups
 */
export async function getLinkConflicts(linkId) {
  const sessions = await Session.find({
    meetingLinkId: linkId,
    isDeleted: false,
    status: { $in: ["scheduled", "active"] },
  }).populate("groupId", "schedule name code");

  const conflicts = [];
  const groupSchedules = {};

  for (const session of sessions) {
    const group = session.groupId;
    if (!group) continue;

    const groupId = group._id.toString();
    if (!groupSchedules[groupId]) {
      groupSchedules[groupId] = {
        group,
        sessions: [],
        schedule: group.schedule,
      };
    }
    groupSchedules[groupId].sessions.push(session);
  }

  // Check overlaps between groups
  const groupIds = Object.keys(groupSchedules);
  for (let i = 0; i < groupIds.length; i++) {
    for (let j = i + 1; j < groupIds.length; j++) {
      const g1 = groupSchedules[groupIds[i]];
      const g2 = groupSchedules[groupIds[j]];

      const dayOverlap = (g1.schedule.daysOfWeek || []).some(day => 
        (g2.schedule.daysOfWeek || []).includes(day)
      );

      if (dayOverlap) {
        const timeOverlap = !(
          g1.schedule.timeTo <= g2.schedule.timeFrom ||
          g1.schedule.timeFrom >= g2.schedule.timeTo
        );

        if (timeOverlap) {
          conflicts.push({
            group1: {
              id: g1.group._id,
              name: g1.group.name,
              schedule: g1.schedule,
              sessions: g1.sessions,
            },
            group2: {
              id: g2.group._id,
              name: g2.group.name,
              schedule: g2.schedule,
              sessions: g2.sessions,
            },
            conflictDays: (g1.schedule.daysOfWeek || []).filter(day => 
              (g2.schedule.daysOfWeek || []).includes(day)
            ),
          });
        }
      }
    }
  }

  return conflicts;
}