"use client";
import React from "react";
import useCurrentPlan from "@/lib/users/useCurrentPlan";
import useUser from "@/lib/users/useUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpenIcon,
  UserIcon,
  ShieldCheckIcon,
  ExternalLinkIcon,
  DatabaseIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { S3Uploader } from "@/components/ui/s3-uploader";

function AppHomepage() {
  const {
    currentPlan,
    isLoading: planLoading,
    error: planError,
  } = useCurrentPlan();
  const { user, isLoading: userLoading, error: userError } = useUser();

  const hasError = planError || userError;

  return (
    <div className="flex flex-col gap-6 p-6">
      <S3Uploader
        presignedRouteProvider="/api/app/upload-input-images"
        variant="button"
        maxFiles={10}
        multiple
        accept="image/*"
        onUpload={async (fileUrls) => {
          console.log(fileUrls);
        }}
      />
    </div>
  );
}

export default AppHomepage;
