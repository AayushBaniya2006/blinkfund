"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import S3Uploader from "./s3-uploader";

export function S3UploaderDemo() {
  const [singleFileUrl, setSingleFileUrl] = useState<string>("");
  const [multipleFileUrls, setMultipleFileUrls] = useState<string[]>([]);

  const handleSingleFileUpload = async (fileUrls: string[]) => {
    console.log("Single file uploaded:", fileUrls[0]);
    setSingleFileUrl(fileUrls[0]);
  };

  const handleMultipleFilesUpload = async (fileUrls: string[]) => {
    console.log("Multiple files uploaded:", fileUrls);
    setMultipleFileUrls(fileUrls);
  };

  const customValidation = (file: File) => {
    if (file.name.includes("test")) {
      return "Files with 'test' in the name are not allowed";
    }
    return null;
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">S3 Uploader Demo</h2>
        <p className="text-muted-foreground mb-6">
          Examples of the S3Uploader component with different configurations.
        </p>
      </div>

      {/* Button Variant - Single File */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Button Variant (Single File)</h3>
        <S3Uploader
          presignedRouteProvider="/api/s3/upload"
          variant="button"
          onUpload={handleSingleFileUpload}
          maxFiles={1}
          maxSize={10 * 1024 * 1024} // 10MB
          accept="image/*,.pdf"
          buttonText="Upload Image or PDF"
          buttonVariant="default"
          value={singleFileUrl}
          onChange={(value) => setSingleFileUrl(value as string)}
        />
        {singleFileUrl && (
          <p className="text-sm text-green-600">
            ✅ File uploaded: {singleFileUrl}
          </p>
        )}
      </div>

      {/* Dropzone Variant - Multiple Files */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dropzone Variant (Multiple Files)</h3>
        <S3Uploader
          presignedRouteProvider="/api/s3/upload"
          variant="dropzone"
          onUpload={handleMultipleFilesUpload}
          maxFiles={5}
          maxSize={5 * 1024 * 1024} // 5MB
          accept="image/*,video/*"
          multiple={true}
          dropzoneText="Drop your media files here"
          dropzoneSubtext="Supports images and videos (max 5 files, 5MB each)"
          className="max-w-md"
          value={multipleFileUrls}
          onChange={(value) => setMultipleFileUrls(value as string[])}
        />
        {multipleFileUrls.length > 0 && (
          <div className="text-sm text-green-600">
            ✅ Files uploaded:
            <ul className="list-disc list-inside ml-4">
              {multipleFileUrls.map((url, index) => (
                <li key={index}>{url}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Custom Validation Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">With Custom Validation</h3>
        <p className="text-sm text-muted-foreground">
          This example rejects files with "test" in the filename.
        </p>
        <S3Uploader
          presignedRouteProvider="/api/s3/upload"
          variant="dropzone"
          onUpload={async (urls) => {
            toast.success(`Uploaded ${urls.length} files with custom validation!`);
          }}
          maxFiles={3}
          maxSize={2 * 1024 * 1024} // 2MB
          onFileValidate={customValidation}
          dropzoneText="Drop files here (no 'test' in filename)"
          className="max-w-md"
        />
      </div>

      {/* Form Integration Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Form Integration</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            console.log("Form data:", Object.fromEntries(formData));
            toast.success("Form submitted! Check console for data.");
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="document" className="block text-sm font-medium mb-2">
              Upload Document
            </label>
            <S3Uploader
              presignedRouteProvider="/api/s3/upload"
              variant="button"
              onUpload={async () => {}} // Form handles the value
              name="document"
              accept=".pdf,.doc,.docx"
              buttonText="Choose Document"
              buttonVariant="outline"
            />
          </div>
          
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Submit Form
          </button>
        </form>
      </div>
    </div>
  );
}

export default S3UploaderDemo;
