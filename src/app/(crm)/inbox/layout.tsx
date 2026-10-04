import { requireUser } from "@/lib/auth/dal";
import { isLuciaPaused } from "@/lib/conversations";
import { formatDateTime, patientName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ConversationList } from "./conversation-list";

export default async function InboxLayout({ children }: LayoutProps<"/inbox">) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);

  const conversations = await prisma.conversation.findMany({
    where: { patient: { clinicId: user.clinicId } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: { select: { firstName: true, lastName: true, phoneNumber: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, sender: true } },
    },
  });

  const items = conversations.map((c) => ({
    id: c.id,
    name: patientName(c.patient),
    preview: c.messages[0]?.text ?? "",
    lastMessageAt: formatDateTime(c.lastMessageAt),
    paused: isLuciaPaused(c),
  }));

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[28rem] flex-col gap-4 md:h-[calc(100dvh-3rem)]">
      <h1 className="text-xl font-semibold">Inbox WhatsApp</h1>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[18rem_1fr]">
        <ConversationList items={items} />
        <div className="min-h-0 rounded-lg border">{children}</div>
      </div>
    </div>
  );
}
