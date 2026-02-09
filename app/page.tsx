import { format, formatDistanceToNow } from "date-fns";
import {
  dashboardSnapshot,
  ensureBrandProfile,
  ensureDemoAccounts,
  upcomingQueue,
  getAccounts
} from "@/lib/agent";
import {
  cancelPostAction,
  generateWeekAction,
  queueManualAction,
  runAgentAction,
  updateStrategyAction,
  reschedulePostAction,
  updateAccountStatusAction
} from "./actions";
import {
  PLATFORM_OPTIONS,
  PlatformType,
  PostStatusType,
  AccountStatusType,
  ACCOUNT_STATUS_OPTIONS
} from "@/lib/agent";

const platformLabel: Record<PlatformType, string> = {
  TWITTER: "Twitter",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok"
};

const statusColor: Record<PostStatusType, string> = {
  DRAFT: "bg-slate-200 text-slate-600",
  QUEUED: "bg-sky-100 text-sky-700",
  POSTED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700"
};

const accountStatusColor: Record<AccountStatusType, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  DISCONNECTED: "bg-rose-100 text-rose-700"
};

export default async function Page() {
  const profile = await ensureBrandProfile();
  await ensureDemoAccounts();

  const [{ totals, queued, posted, logs }, queue, accounts] = await Promise.all([
    dashboardSnapshot(),
    upcomingQueue(20),
    getAccounts()
  ]);

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Scheduled" value={totals} accent="bg-sky-500" />
        <MetricCard title="Queued" value={queued} accent="bg-indigo-500" />
        <MetricCard title="Published" value={posted} accent="bg-emerald-500" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white p-7 shadow-lg">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Brand Strategy</h2>
              <p className="text-sm text-ink-500">Align your content engine before the agent executes.</p>
            </div>
            <form action={generateWeekAction}>
              <button
                type="submit"
                className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Generate 7-Day Plan
              </button>
            </form>
          </header>

          <form action={updateStrategyAction} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Brand Name</label>
              <input
                name="brandName"
                defaultValue={profile.brandName}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-900 shadow-inner focus:border-sky-400 focus:outline-none"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Tone</label>
                <input
                  name="tone"
                  defaultValue={profile.tone}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Audience</label>
                <input
                  name="audience"
                  defaultValue={profile.audience}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Vision</label>
              <textarea
                name="vision"
                defaultValue={profile.vision}
                rows={2}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Content Pillars (comma separated)
              </label>
              <input
                name="pillars"
                defaultValue={profile.pillars.join(", ")}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Posts per Week
                </label>
                <input
                  name="cadencePerWeek"
                  type="number"
                  min={1}
                  max={21}
                  defaultValue={profile.cadencePerWeek}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-700"
            >
              Save Strategy
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white p-7 shadow-lg">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Publishing Engine</h2>
              <p className="text-sm text-ink-500">Manual overrides and live automation runs.</p>
            </div>
            <form action={runAgentAction}>
              <button
                type="submit"
                className="rounded-full border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50"
              >
                Run Autoposter
              </button>
            </form>
          </header>

          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Connected Accounts</h3>
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between rounded-xl border border-ink-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {platformLabel[account.platform as PlatformType]} · @{account.handle}
                    </p>
                    <p className="text-xs text-ink-500">{account.accountLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        accountStatusColor[account.status as AccountStatusType]
                      }`}
                    >
                      {account.status.toLowerCase()}
                    </span>
                    <StatusSwitcher accountId={account.id} status={account.status as AccountStatusType} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Manual Queue</h3>
            <form action={queueManualAction} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Platform
                  <select
                    name="platform"
                    className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                    required
                  >
                    {Object.entries(platformLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Account
                  <select
                    name="socialAccountId"
                    className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Auto</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {platformLabel[account.platform as PlatformType]} · @{account.handle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Caption
                <textarea
                  name="content"
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                  placeholder="Share timely updates, launch news, or community prompts."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Date
                  <input
                    type="date"
                    name="date"
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Time
                  <input
                    type="time"
                    name="time"
                    defaultValue="09:00"
                    className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Queue Manual Post
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/60 bg-white p-7 shadow-lg">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-ink-900">Upcoming Queue</h2>
            <p className="text-sm text-ink-500">Review, reschedule, or cancel before the agent posts.</p>
          </header>
          <div className="divide-y divide-ink-100">
            {queue.map((post) => (
              <article key={post.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">
                        {platformLabel[post.platform as PlatformType]}
                        {post.socialAccount?.handle ? ` · @${post.socialAccount.handle}` : ""}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColor[post.status as PostStatusType]
                        }`}
                      >
                        {post.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-ink-600 whitespace-pre-line">{post.content}</p>
                  </div>
                  <div className="text-right text-xs text-ink-500">
                    <p>{format(post.scheduledFor, "EEE, MMM d · h:mm a")}</p>
                    <p>({formatDistanceToNow(post.scheduledFor, { addSuffix: true })})</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form
                    action={async (formData) => {
                      "use server";
                      const newDate = formData.get("scheduledFor")?.toString();
                      if (!newDate) return;
                      await reschedulePostAction(post.id, newDate);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="datetime-local"
                      name="scheduledFor"
                      defaultValue={format(post.scheduledFor, "yyyy-MM-dd'T'HH:mm")}
                      className="rounded-lg border border-ink-100 px-3 py-1 text-xs text-ink-700"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-sky-400 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                    >
                      Reschedule
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await cancelPostAction(post.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {!queue.length && <p className="py-6 text-sm text-ink-500">No upcoming posts scheduled yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white p-7 shadow-lg">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-ink-900">Agent Activity</h2>
            <p className="text-sm text-ink-500">Latest automation runs and system notes.</p>
          </header>
          <ul className="space-y-4 text-sm text-ink-600">
            {logs.map((log) => (
              <li key={log.id}>
                <p className="font-semibold text-ink-900">{format(log.runAt, "MMM d, h:mm a")}</p>
                <p>{log.summary}</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-ink-400">{log.details}</pre>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white p-6 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-ink-900">{value}</p>
      <div className={`mt-4 h-1 w-full rounded-full ${accent}`}></div>
    </div>
  );
}

function StatusSwitcher({ accountId, status }: { accountId: string; status: AccountStatusType }) {
  return (
    <form
      action={async (formData) => {
        "use server";
        const nextStatus = formData.get("status")?.toString() as AccountStatusType;
        if (!nextStatus || !ACCOUNT_STATUS_OPTIONS.includes(nextStatus)) return;
        await updateAccountStatusAction(accountId, nextStatus);
      }}
      className="flex items-center gap-2"
    >
      <select
        name="status"
        defaultValue={status}
        className="rounded-lg border border-ink-100 px-3 py-1 text-xs text-ink-700"
      >
        {ACCOUNT_STATUS_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {value.toLowerCase()}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-ink-900 px-3 py-1 text-xs font-semibold text-white hover:bg-ink-700"
      >
        Update
      </button>
    </form>
  );
}
