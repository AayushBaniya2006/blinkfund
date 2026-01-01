"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { SOLANA_CONFIG } from "@/lib/solana";
import { WalletSignatureVerify } from "@/components/wallet/WalletSignatureVerify";
import {
  Zap,
  ArrowLeft,
  Target,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  ImageIcon,
  Link as LinkIcon,
  X,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type Step = "verify" | "details" | "preview" | "success";

interface CampaignData {
  title: string;
  description: string;
  imageUrl: string;
  goalSol: string;
  deadline: string;
}

interface CreatedCampaign {
  id: string;
  slug: string;
  title: string;
  url: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const [step, setStep] = useState<Step>("verify");
  const [verifiedWallet, setVerifiedWallet] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null);

  const [formData, setFormData] = useState<CampaignData>({
    title: "",
    description: "",
    imageUrl: "",
    goalSol: "",
    deadline: "",
  });
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/campaign-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      handleInputChange("imageUrl", data.url);
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Calculate minimum deadline (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDeadline = tomorrow.toISOString().split("T")[0];

  const handleWalletVerified = (wallet: string) => {
    setVerifiedWallet(wallet);
    setStep("details");
    toast.success("Wallet verified successfully!");
  };

  const handleInputChange = (field: keyof CampaignData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title cannot exceed 100 characters";
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = "Description cannot exceed 2000 characters";
    }

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = "Invalid image URL";
    }

    const goalNum = parseFloat(formData.goalSol);
    if (!formData.goalSol) {
      newErrors.goalSol = "Goal is required";
    } else if (isNaN(goalNum) || goalNum < 0.1) {
      newErrors.goalSol = "Goal must be at least 0.1 SOL";
    } else if (goalNum > 100000) {
      newErrors.goalSol = "Goal cannot exceed 100,000 SOL";
    }

    if (!formData.deadline) {
      newErrors.deadline = "Deadline is required";
    } else {
      const deadlineDate = new Date(formData.deadline);
      if (deadlineDate <= new Date()) {
        newErrors.deadline = "Deadline must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handlePreview = () => {
    if (validateForm()) {
      setStep("preview");
    }
  };

  const handleSubmit = async () => {
    if (!verifiedWallet) {
      toast.error("Please verify your wallet first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: verifiedWallet,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          goalSol: parseFloat(formData.goalSol),
          deadline: new Date(formData.deadline).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      // Campaign created as draft - now publish it
      const publishResponse = await fetch(`/api/campaigns/${data.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: verifiedWallet }),
      });

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        // Campaign created but not published - still show success
        console.warn("Campaign created but not published:", publishData.error);
      }

      setCreatedCampaign({
        id: data.id,
        slug: data.slug,
        title: data.title,
        url: data.url,
      });
      setStep("success");
      toast.success("Campaign created successfully!");
    } catch (error) {
      console.error("Create campaign error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">{appConfig.projectName}</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {SOLANA_CONFIG.CLUSTER === "devnet" ? "Devnet" : "Mainnet"}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create Your Campaign</h1>
          <p className="text-muted-foreground mb-8">
            Set a goal, verify your wallet, and start raising funds.
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            {["verify", "details", "preview", "success"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : ["verify", "details", "preview", "success"].indexOf(step) > i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      ["verify", "details", "preview", "success"].indexOf(step) > i
                        ? "bg-primary/50"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Wallet Verification */}
          {step === "verify" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Verify Your Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Connect and verify your Solana wallet to prove ownership.
                    Donations will go directly to this wallet.
                  </p>
                  <WalletSignatureVerify
                    onVerified={handleWalletVerified}
                    onError={(error) => toast.error(error)}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Campaign Details */}
          {step === "details" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Verified Wallet Display */}
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">
                      Verified: {verifiedWallet?.slice(0, 6)}...
                      {verifiedWallet?.slice(-4)}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Campaign Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Save the Whales"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className={errors.title ? "border-destructive" : ""}
                      maxLength={100}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formData.title.length}/100 characters
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell supporters what you're raising funds for..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className={errors.description ? "border-destructive" : ""}
                      maxLength={2000}
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/2000 characters
                    </p>
                  </div>

                  {/* Goal Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="goal">
                      Funding Goal (SOL) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="goal"
                        type="number"
                        min="0.1"
                        max="100000"
                        step="0.1"
                        placeholder="10"
                        value={formData.goalSol}
                        onChange={(e) => handleInputChange("goalSol", e.target.value)}
                        className={`pl-10 ${errors.goalSol ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.goalSol && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.goalSol}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Minimum 0.1 SOL, maximum 100,000 SOL
                    </p>
                  </div>

                  {/* Deadline */}
                  <div className="space-y-2">
                    <Label htmlFor="deadline">
                      Campaign Deadline <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="deadline"
                        type="date"
                        min={minDeadline}
                        value={formData.deadline}
                        onChange={(e) => handleInputChange("deadline", e.target.value)}
                        className={`pl-10 ${errors.deadline ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.deadline && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.deadline}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Campaign will stop accepting donations after this date
                    </p>
                  </div>

                  {/* Campaign Image */}
                  <div className="space-y-3">
                    <Label>Campaign Image (Optional)</Label>

                    {/* Toggle between upload and URL */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={imageInputMode === "upload" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImageInputMode("upload")}
                        className="flex-1"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                      <Button
                        type="button"
                        variant={imageInputMode === "url" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImageInputMode("url")}
                        className="flex-1"
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Use URL
                      </Button>
                    </div>

                    {imageInputMode === "upload" ? (
                      <div className="space-y-2">
                        {formData.imageUrl ? (
                          <div className="relative rounded-lg overflow-hidden border">
                            <img
                              src={formData.imageUrl}
                              alt="Campaign preview"
                              className="w-full h-48 object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => handleInputChange("imageUrl", "")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                              isDragging
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                            }`}
                          >
                            <input
                              type="file"
                              id="image-upload"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                              className="hidden"
                              disabled={isUploading}
                            />
                            <label
                              htmlFor="image-upload"
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              {isUploading ? (
                                <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                              ) : (
                                <Upload className="w-10 h-10 text-muted-foreground" />
                              )}
                              <span className="font-medium">
                                {isUploading ? "Uploading..." : "Drag & drop your campaign image"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                or click to browse (PNG, JPG, GIF, WebP - max 5MB)
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          id="image"
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={formData.imageUrl}
                          onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                          className={errors.imageUrl ? "border-destructive" : ""}
                        />
                        {formData.imageUrl && isValidUrl(formData.imageUrl) && (
                          <div className="relative rounded-lg overflow-hidden border">
                            <img
                              src={formData.imageUrl}
                              alt="Campaign preview"
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {errors.imageUrl && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.imageUrl}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep("verify")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button onClick={handlePreview} className="flex-1">
                      Preview Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Review Your Campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Preview Card */}
                  <div className="border rounded-lg overflow-hidden">
                    {formData.imageUrl && (
                      <div className="aspect-video bg-muted relative">
                        <img
                          src={formData.imageUrl}
                          alt={formData.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <h3 className="text-xl font-bold">{formData.title}</h3>
                      {formData.description && (
                        <p className="text-muted-foreground text-sm">
                          {formData.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-semibold">{formData.goalSol} SOL</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deadline</span>
                        <span className="font-semibold">
                          {new Date(formData.deadline).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Wallet</span>
                        <span className="font-mono text-xs">
                          {verifiedWallet?.slice(0, 6)}...{verifiedWallet?.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <strong>Platform fee:</strong> {(SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0)}% of each donation
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("details")}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Edit Details
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Launch Campaign"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && createdCampaign && (
            <div className="space-y-6">
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Campaign Created!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your campaign &quot;{createdCampaign.title}&quot; is now live.
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push(createdCampaign.url)}
                      className="w-full"
                    >
                      View Campaign
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = `${window.location.origin}${createdCampaign.url}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Campaign URL copied!");
                      }}
                      className="w-full"
                    >
                      Copy Campaign Link
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => router.push("/dashboard")}
                      className="w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
