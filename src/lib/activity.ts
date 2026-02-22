import { prisma } from "@/lib/prisma";

interface LogActivityParams {
  domain: string;
  domainRefId?: string;
  module: string;
  activityType: string;
  title: string;
  description?: string;
  refType?: string;
  refId?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.activityEntry.create({
      data: {
        domain: params.domain,
        domainRefId: params.domainRefId || null,
        module: params.module,
        activityType: params.activityType,
        title: params.title,
        description: params.description || null,
        refType: params.refType || null,
        refId: params.refId || null,
      },
    });
  } catch (error) {
    // Activity logging should never break the main operation
    console.error("Failed to log activity:", error);
  }
}
