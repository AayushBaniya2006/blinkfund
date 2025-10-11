import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { users } from "@/db/schema/user";
import { render } from "@react-email/components";
import { eq } from "drizzle-orm";
import { appConfig } from "../config";
import Welcome from "@/emails/Welcome";
import sendMail from "../email/sendMail";

const onUserCreate = async (newUser: {
  id: string;
  email: string | null;
  name?: string | null;
}) => {
  const defaultPlan = await db
    .select()
    .from(plans)
    .where(eq(plans.default, true))
    .limit(1);

  if (defaultPlan.length > 0) {
    await db
      .update(users)
      .set({ planId: defaultPlan[0].id })
      .where(eq(users.id, newUser.id));
  }
  // TIP: Send welcome email to user

  const html = await render(
    Welcome({
      userName: newUser.name || "User",
      dashboardUrl: `${appConfig.projectName}/dashboard`,
    })
  );
  await sendMail(newUser.email!, `Welcome to ${appConfig.projectName}`, html);
};

export default onUserCreate;
