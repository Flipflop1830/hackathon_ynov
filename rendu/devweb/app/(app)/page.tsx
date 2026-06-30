import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import { getAssistant } from "@/lib/assistants";
import { ChatExperience } from "@/components/organisms/chat-experience";
import type { AccountType } from "@/lib/types";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const assistant = getAssistant(user.accountType as AccountType);
  return <ChatExperience assistantLabel={assistant.label} disclaimer={assistant.disclaimer} />;
}
