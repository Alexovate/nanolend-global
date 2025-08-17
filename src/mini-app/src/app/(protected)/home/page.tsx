import { auth } from "@/auth";
import { HomeContent } from "@/components/HomeContent";

export default async function Home() {
  const session = await auth();

  return <HomeContent session={session} />;
}
