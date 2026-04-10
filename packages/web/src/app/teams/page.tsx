import { cn, formatRelativeTime } from "@/lib";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Role = "Owner" | "Admin" | "Member" | "Viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
}

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "Owner",
    lastActive: "2026-04-10T09:15:00Z",
  },
  {
    id: "2",
    name: "Marcus Rivera",
    email: "marcus.rivera@company.com",
    role: "Admin",
    lastActive: "2026-04-10T07:42:00Z",
  },
  {
    id: "3",
    name: "Aisha Patel",
    email: "aisha.patel@company.com",
    role: "Admin",
    lastActive: "2026-04-09T16:30:00Z",
  },
  {
    id: "4",
    name: "James Okafor",
    email: "james.okafor@company.com",
    role: "Member",
    lastActive: "2026-04-09T11:05:00Z",
  },
  {
    id: "5",
    name: "Emily Nakamura",
    email: "emily.nakamura@company.com",
    role: "Member",
    lastActive: "2026-04-08T14:22:00Z",
  },
  {
    id: "6",
    name: "Lucas Schmidt",
    email: "lucas.schmidt@company.com",
    role: "Viewer",
    lastActive: "2026-04-07T09:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Role configuration                                                 */
/* ------------------------------------------------------------------ */

const ROLE_CONFIG: Record<Role, { color: string; bg: string; darkBg: string }> = {
  Owner: {
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-100",
    darkBg: "dark:bg-purple-950/50",
  },
  Admin: {
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100",
    darkBg: "dark:bg-blue-950/50",
  },
  Member: {
    color: "text-zinc-700 dark:text-zinc-300",
    bg: "bg-zinc-100",
    darkBg: "dark:bg-zinc-800/60",
  },
  Viewer: {
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100",
    darkBg: "dark:bg-green-950/50",
  },
};

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Team</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your team members and roles.
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* ---- Overview Card ---- */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white shadow-sm">
                {teamMembers.length}
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Team Overview
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {teamMembers.length} members &middot;{" "}
                  {teamMembers.filter((m) => m.role === "Owner").length} owner
                  {" \u00b7 "}
                  {teamMembers.filter((m) => m.role === "Admin").length} admin
                  {" \u00b7 "}
                  {teamMembers.filter((m) => m.role === "Member").length} member
                  {" \u00b7 "}
                  {teamMembers.filter((m) => m.role === "Viewer").length} viewer
                </p>
              </div>
            </div>

            <form
              method="POST"
              action="#invite"
              className="inline-flex"
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Invite Member
              </button>
            </form>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ---- Member List Table (spans 2 cols) ---- */}
          <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Members
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Everyone with access to this workspace.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Last Active</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {teamMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                    >
                      {/* Avatar + Name + Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                              getAvatarColor(index)
                            )}
                            aria-hidden="true"
                          >
                            {getInitials(member.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {member.name}
                            </p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            ROLE_CONFIG[member.role].bg,
                            ROLE_CONFIG[member.role].color,
                            ROLE_CONFIG[member.role].darkBg
                          )}
                        >
                          {member.role}
                        </span>
                      </td>

                      {/* Last active */}
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatRelativeTime(member.lastActive)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            aria-label={`Edit ${member.name}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "rounded-md p-1.5 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400",
                              member.role === "Owner"
                                ? "cursor-not-allowed opacity-30"
                                : "text-zinc-400"
                            )}
                            aria-label={`Remove ${member.name}`}
                            disabled={member.role === "Owner"}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022 1.007 12.27a2.25 2.25 0 002.243 2.03h5.572a2.25 2.25 0 002.243-2.03l1.007-12.27.149.022a.75.75 0 10.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.068l1.17.986 1.17-.986a.75.75 0 111.04 1.084l-1.44 1.212 1.44 1.213a.75.75 0 11-1.04 1.084l-1.17-.986-1.17.986a.75.75 0 11-1.04-1.084l1.44-1.213-1.44-1.212a.75.75 0 01.26-1.244z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---- Sidebar: Invite + Settings ---- */}
          <aside className="space-y-6">
            {/* Invite member form */}
            <section
              id="invite"
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
            >
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Invite Member
              </h2>
              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Send an invitation by email.
              </p>

              <form method="POST" action="#" className="space-y-3">
                <div>
                  <label
                    htmlFor="invite-email"
                    className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email address
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-role"
                    className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Role
                  </label>
                  <select
                    id="invite-role"
                    name="role"
                    defaultValue="Member"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                >
                  Send Invitation
                </button>
              </form>
            </section>

            {/* Team settings */}
            <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Team Settings
              </h2>
              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Configure your team details.
              </p>

              <form method="POST" action="#" className="space-y-4">
                <div>
                  <label
                    htmlFor="team-name"
                    className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Team Name
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    name="teamName"
                    defaultValue="Acme Engineering"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="default-workspace"
                    className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Default Workspace
                  </label>
                  <select
                    id="default-workspace"
                    name="workspace"
                    defaultValue="production"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-black"
                >
                  Save Changes
                </button>
              </form>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
