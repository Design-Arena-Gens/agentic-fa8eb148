"use server";

import { revalidatePath } from "next/cache";
import { isAfter } from "date-fns";
import {
  cancelPost,
  createManualPost,
  ensureBrandProfile,
  generateWeeklySchedule,
  reschedulePost,
  runAutoposter,
  updateAccountStatus
} from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_STATUS_OPTIONS,
  AccountStatusType,
  PlatformType,
  PLATFORM_OPTIONS
} from "@/lib/agent";

function parseArray(text: string) {
  return text
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length);
}

export async function updateStrategyAction(formData: FormData) {
  const brandName = formData.get("brandName")?.toString() ?? "";
  const vision = formData.get("vision")?.toString() ?? "";
  const tone = formData.get("tone")?.toString() ?? "";
  const audience = formData.get("audience")?.toString() ?? "";
  const pillarsRaw = formData.get("pillars")?.toString() ?? "";
  const cadencePerWeek = Number(formData.get("cadencePerWeek") ?? 5);

  const profile = await ensureBrandProfile();

  await prisma.brandProfile.update({
    where: { id: profile.id },
    data: {
      brandName,
      vision,
      tone,
      audience,
      pillarsRaw: parseArray(pillarsRaw).join(","),
      cadencePerWeek: Number.isNaN(cadencePerWeek) ? profile.cadencePerWeek : cadencePerWeek
    }
  });

  revalidatePath("/");
}

export async function generateWeekAction() {
  await generateWeeklySchedule(0);
  revalidatePath("/");
}

export async function runAgentAction() {
  await runAutoposter();
  revalidatePath("/");
}

export async function queueManualAction(formData: FormData) {
  const platform = formData.get("platform")?.toString() as PlatformType;
  const content = formData.get("content")?.toString() ?? "";
  const date = formData.get("date")?.toString() ?? "";
  const time = formData.get("time")?.toString() ?? "09:00";
  const socialAccountId = formData.get("socialAccountId")?.toString() || undefined;

  const scheduledFor = new Date(`${date}T${time}:00`);

  if (!content || !date || !PLATFORM_OPTIONS.includes(platform)) {
    throw new Error("Invalid manual post payload.");
  }

  if (!isAfter(scheduledFor, new Date())) {
    throw new Error("Schedule must be in the future.");
  }

  await createManualPost({
    platform,
    content,
    scheduledFor,
    socialAccountId
  });

  revalidatePath("/");
}

export async function reschedulePostAction(id: string, scheduledFor: string) {
  await reschedulePost(id, new Date(scheduledFor));
  revalidatePath("/");
}

export async function cancelPostAction(id: string) {
  await cancelPost(id);
  revalidatePath("/");
}

export async function updateAccountStatusAction(id: string, status: AccountStatusType) {
  if (!ACCOUNT_STATUS_OPTIONS.includes(status)) {
    throw new Error("Invalid status provided.");
  }
  await updateAccountStatus(id, status);
  revalidatePath("/");
}
