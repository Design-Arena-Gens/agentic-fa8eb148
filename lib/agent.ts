import { addDays, set } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const PLATFORM_OPTIONS = ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK"] as const;
export type PlatformType = (typeof PLATFORM_OPTIONS)[number];

export const POST_STATUS_OPTIONS = ["DRAFT", "QUEUED", "POSTED", "FAILED"] as const;
export type PostStatusType = (typeof POST_STATUS_OPTIONS)[number];

export const ACCOUNT_STATUS_OPTIONS = ["ACTIVE", "PAUSED", "DISCONNECTED"] as const;
export type AccountStatusType = (typeof ACCOUNT_STATUS_OPTIONS)[number];

type Strategy = {
  brandName: string;
  vision: string;
  tone: string;
  audience: string;
  pillars: string[];
  cadencePerWeek: number;
};

const PLATFORM_TONES: Record<PlatformType, string> = {
  TWITTER: "concise, punchy, and insightful",
  LINKEDIN: "professional, story-driven, and value-focused",
  INSTAGRAM: "visual, uplifting, and community-oriented",
  FACEBOOK: "approachable, conversational, and friendly",
  TIKTOK: "trendy, energetic, and hook-driven"
};

const PLATFORM_CTAS: Record<PlatformType, string> = {
  TWITTER: "Retweet if this resonates!",
  LINKEDIN: "Share your experience in the comments.",
  INSTAGRAM: "Save this for later and tag a friend who needs it.",
  FACEBOOK: "Let us know your thoughts below!",
  TIKTOK: "Hit follow for the next episode."
};

const PLATFORM_HASHTAGS: Record<PlatformType, string[]> = {
  TWITTER: ["#Thread", "#DailyInsight", "#BuildInPublic"],
  LINKEDIN: ["#Leadership", "#Growth", "#Strategy"],
  INSTAGRAM: ["#CreatorLife", "#BrandStory", "#Inspo"],
  FACEBOOK: ["#Community", "#LearnTogether", "#Updates"],
  TIKTOK: ["#CreatorTips", "#DayInLife", "#ForYou"]
};

const DEFAULT_SLOTS = [9, 13, 18];

function pickContentPillar(strategy: Strategy, index: number) {
  if (!strategy.pillars.length) {
    return "brand update";
  }
  return strategy.pillars[index % strategy.pillars.length];
}

function buildPostBody(platform: PlatformType, topic: string, strategy: Strategy, dayIndex: number) {
  const angle = [
    `A ${topic} insight for ${strategy.audience}`,
    `Behind the scenes at ${strategy.brandName}`,
    `Lesson ${dayIndex + 1}: ${topic} in action`,
    `Quick win on ${topic}`,
    `Storytime: when ${strategy.brandName} tackled ${topic}`
  ][dayIndex % 5];

  const hook = [
    `Stop scrolling if you care about ${topic}.`,
    `We just learned something big about ${topic}.`,
    `New playbook drop: ${topic}.`,
    `${strategy.brandName} secret about ${topic}.`,
    `This will change how you think about ${topic}.`
  ][(dayIndex + 1) % 5];

  const tone = PLATFORM_TONES[platform];
  const hashtags = PLATFORM_HASHTAGS[platform];
  const cta = PLATFORM_CTAS[platform];

  const body = [
    `${hook}`,
    `${angle} with a ${tone} vibe.`,
    `Key steps:`,
    `1. Define what ${topic} means for you.`,
    `2. Share the transformation story.`,
    `3. End with a community question.`,
    cta,
    hashtags.slice(0, 3).join(" ")
  ].join("\n\n");

  return body;
}

function buildScheduleSlots(startDate: Date, days: number, cadence: number) {
  const slots: Date[] = [];
  let current = startDate;
  for (let day = 0; day < days; day++) {
    const base = addDays(current, day);
    for (let slotIndex = 0; slotIndex < Math.min(cadence, DEFAULT_SLOTS.length); slotIndex++) {
      const scheduled = set(base, { hours: DEFAULT_SLOTS[slotIndex], minutes: 0, seconds: 0, milliseconds: 0 });
      slots.push(scheduled);
    }
  }
  return slots;
}

export async function ensureBrandProfile(): Promise<Strategy & { id: string }> {
  let profile = await prisma.brandProfile.findFirst();
  if (!profile) {
    profile = await prisma.brandProfile.create({
      data: {
        brandName: "Creator Collective",
        vision: "Build magnetic audiences through consistent storytelling.",
        tone: "Bold, energizing, and actionable.",
        audience: "independent creators and startup founders",
        pillarsRaw: ["behind the scenes", "audience building", "product teaser"].join(","),
        cadencePerWeek: 5
      }
    });
  }
  return {
    id: profile.id,
    brandName: profile.brandName,
    vision: profile.vision,
    tone: profile.tone,
    audience: profile.audience,
    cadencePerWeek: profile.cadencePerWeek,
    pillars: profile.pillarsRaw ? profile.pillarsRaw.split(",").map((item) => item.trim()).filter(Boolean) : []
  };
}

export async function generateWeeklySchedule(weekOffset = 0) {
  const strategy = await ensureBrandProfile();
  const accounts = await prisma.socialAccount.findMany({
    where: { status: { not: "DISCONNECTED" } }
  });
  const startDate = addDays(new Date(), weekOffset * 7);
  const slots = buildScheduleSlots(startDate, 7, strategy.cadencePerWeek >= 3 ? 3 : strategy.cadencePerWeek);

  const createInputs: Prisma.ScheduledPostCreateManyInput[] = [];
  let postIndex = 0;

  for (const account of accounts) {
    const platform = account.platform as PlatformType;
    if (!PLATFORM_OPTIONS.includes(platform)) {
      continue;
    }
    for (const slot of slots) {
      const topic = pickContentPillar(strategy, postIndex);
      const content = buildPostBody(platform, topic, strategy, postIndex);
      createInputs.push({
        platform,
        socialAccountId: account.id,
        content,
        scheduledFor: slot,
        status: "QUEUED",
        tags: [topic, strategy.brandName].join(",")
      });
      postIndex += 1;
    }
  }

  if (!createInputs.length) {
    return { created: 0 };
  }

  await prisma.scheduledPost.createMany({
    data: createInputs
  });

  await prisma.agentLog.create({
    data: {
      summary: `Generated ${createInputs.length} posts for week ${weekOffset + 1}`,
      details: `Accounts: ${accounts.length}, Strategy cadence: ${strategy.cadencePerWeek}`
    }
  });

  return { created: createInputs.length };
}

type PublishResult = {
  published: number;
  failed: number;
};

async function simulatePublish(platform: PlatformType, content: string, handle?: string) {
  const prefix = `[${platform}]${handle ? ` @${handle}` : ""}`;
  const logEntry = `${new Date().toISOString()} ${prefix} ${content.slice(0, 80).replace(/\s+/g, " ")}...`;
  return logEntry;
}

export async function runAutoposter(): Promise<PublishResult> {
  const now = new Date();
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now }
    },
    include: { socialAccount: true }
  });

  if (!duePosts.length) {
    await prisma.agentLog.create({
      data: {
        summary: "No posts to publish",
        details: `Checked at ${now.toISOString()}`
      }
    });
    return { published: 0, failed: 0 };
  }

  const results: PublishResult = { published: 0, failed: 0 };
  const logLines: string[] = [];

  for (const post of duePosts) {
    try {
      const platform = post.platform as PlatformType;
      if (!PLATFORM_OPTIONS.includes(platform)) {
        throw new Error(`Unsupported platform ${post.platform}`);
      }
      const result = await simulatePublish(platform, post.content, post.socialAccount?.handle);
      logLines.push(result);
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "POSTED",
          publishedAt: now,
          resultMessage: result
        }
      });
      results.published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          resultMessage: message
        }
      });
      results.failed += 1;
      logLines.push(`Failed to publish ${post.id}: ${message}`);
    }
  }

  await prisma.agentLog.create({
    data: {
      summary: `Published ${results.published} posts`,
      details: logLines.join("\n")
    }
  });

  return results;
}

export async function cleanOldPosts(days = 30) {
  const deadline = addDays(new Date(), -days);
  const deleted = await prisma.scheduledPost.deleteMany({
    where: {
      status: { in: ["POSTED", "FAILED", "DRAFT"] },
      scheduledFor: { lt: deadline }
    }
  });

  await prisma.agentLog.create({
    data: {
      summary: `Cleanup removed ${deleted.count} posts`,
      details: `Threshold date: ${deadline.toISOString()}`
    }
  });

  return deleted.count;
}

export async function ensureDemoAccounts() {
  const existing = await prisma.socialAccount.count();
  if (existing > 0) {
    return existing;
  }

  await prisma.socialAccount.createMany({
    data: [
      {
        platform: "TWITTER",
        handle: "creator_collective",
        accountLabel: "Thought leadership",
        accessToken: "demo-token-twitter"
      },
      {
        platform: "LINKEDIN",
        handle: "creator-collective",
        accountLabel: "B2B Story",
        accessToken: "demo-token-linkedin"
      },
      {
        platform: "INSTAGRAM",
        handle: "creator.collective",
        accountLabel: "Visual Highlights",
        accessToken: "demo-token-instagram"
      }
    ]
  });

  await prisma.agentLog.create({
    data: {
      summary: "Seeded demo accounts",
      details: "Twitter, LinkedIn, Instagram demo connections created."
    }
  });

  return 3;
}

export async function initializeAgent() {
  await ensureBrandProfile();
  await ensureDemoAccounts();
  const { created } = await generateWeeklySchedule();
  return created;
}

export async function upcomingQueue(limit = 20) {
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledFor: "asc" },
    take: limit,
    include: { socialAccount: true }
  });

  return posts;
}

export async function dashboardSnapshot() {
  const [strategy, totals, queued, posted, logs] = await Promise.all([
    prisma.brandProfile.findFirst(),
    prisma.scheduledPost.count(),
    prisma.scheduledPost.count({ where: { status: "QUEUED" } }),
    prisma.scheduledPost.count({ where: { status: "POSTED" } }),
    prisma.agentLog.findMany({ orderBy: { runAt: "desc" }, take: 5 })
  ]);

  return { strategy, totals, queued, posted, logs };
}

export async function getAccounts() {
  return prisma.socialAccount.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function createManualPost(input: {
  platform: PlatformType;
  content: string;
  scheduledFor: Date;
  socialAccountId?: string;
}) {
  if (!PLATFORM_OPTIONS.includes(input.platform)) {
    throw new Error(`Unsupported platform ${input.platform}`);
  }

  const post = await prisma.scheduledPost.create({
    data: {
      platform: input.platform,
      content: input.content,
      scheduledFor: input.scheduledFor,
      socialAccountId: input.socialAccountId,
      status: "QUEUED"
    }
  });

  await prisma.agentLog.create({
    data: {
      summary: `Manual post queued for ${input.platform}`,
      details: `ID ${post.id} scheduled at ${input.scheduledFor.toISOString()}`
    }
  });

  return post;
}

export async function reschedulePost(id: string, scheduledFor: Date) {
  const updated = await prisma.scheduledPost.update({
    where: { id },
    data: { scheduledFor }
  });

  await prisma.agentLog.create({
    data: {
      summary: `Rescheduled post ${id}`,
      details: `New time ${scheduledFor.toISOString()}`
    }
  });

  return updated;
}

export async function cancelPost(id: string) {
  const deleted = await prisma.scheduledPost.delete({
    where: { id }
  });

  await prisma.agentLog.create({
    data: {
      summary: `Cancelled post ${id}`,
      details: `Deleted at ${new Date().toISOString()}`
    }
  });

  return deleted;
}

export async function updateAccountStatus(id: string, status: AccountStatusType) {
  if (!ACCOUNT_STATUS_OPTIONS.includes(status)) {
    throw new Error(`Unsupported status ${status}`);
  }
  const account = await prisma.socialAccount.update({
    where: { id },
    data: { status }
  });

  await prisma.agentLog.create({
    data: {
      summary: `Account ${account.handle} status -> ${status}`,
      details: `Platform ${account.platform}`
    }
  });

  return account;
}
