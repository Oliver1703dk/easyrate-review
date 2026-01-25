import { useState, useRef } from 'react';
import { Camera, X, Loader2, AlertCircle } from 'lucide-react';
import { PHOTO_UPLOAD_TEXT } from '@easyrate/shared';
import { api } from '../../lib/api';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoUploadProps {
  businessId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  name: string;
  previewUrl: string;
}

export function PhotoUpload({
  businessId,
  photos,
  onPhotosChange,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Check max photos limit
    const remainingSlots = MAX_PHOTOS - photos.length - uploading.length;
    if (remainingSlots <= 0) {
      setError(PHOTO_UPLOAD_TEXT.maxPhotosReached);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToUpload) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(PHOTO_UPLOAD_TEXT.invalidType);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(PHOTO_UPLOAD_TEXT.fileTooLarge.replace('{max}', String(MAX_FILE_SIZE_MB)));
        continue;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add to uploading state
      setUploading((prev) => [...prev, { id: uploadId, name: file.name, previewUrl }]);

      try {
        // Get presigned upload URL
        const { uploadUrl, fileKey } = await api.getUploadUrl(businessId, {
          filename: file.name,
          contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        });

        // Upload file to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        // Add file key to photos
        onPhotosChange([...photos, fileKey]);

        // Remove from uploading state
        setUploading((prev) => prev.filter((u) => u.id !== uploadId));

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);
      } catch {
        setError(PHOTO_UPLOAD_TEXT.uploadError);
        setUploading((prev) => prev.filter((u) => u.id !== uploadId));
        URL.revokeObjectURL(previewUrl);
      }
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const canAddMore = photos.length + uploading.length < MAX_PHOTOS;

  return (
    <div className="space-y-3">
      {/* Photo Grid */}
      {(photos.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {/* Uploaded photos */}
          {photos.map((fileKey, index) => (
            <div
              key={fileKey}
              className="relative aspect-square rounded-lg bg-muted overflow-hidden"
            >
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                {PHOTO_UPLOAD_TEXT.uploaded}
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label={PHOTO_UPLOAD_TEXT.removePhoto}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Uploading photos */}
          {uploading.map((file) => (
            <div
              key={file.id}
              className="relative aspect-square rounded-lg bg-muted overflow-hidden"
            >
              <img
                src={file.previewUrl}
                alt={file.name}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Count */}
      <div className="text-sm text-muted-foreground text-center">
        {PHOTO_UPLOAD_TEXT.photoCount
          .replace('{current}', String(photos.length + uploading.length))
          .replace('{max}', String(MAX_PHOTOS))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Photo Button */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploading.length > 0}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload" className="block">
            <span
              className={`
                inline-flex w-full items-center justify-center gap-2 rounded-md border border-input
                bg-background px-4 py-2 text-sm font-medium ring-offset-background
                transition-colors hover:bg-accent hover:text-accent-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${disabled || uploading.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {uploading.length > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {PHOTO_UPLOAD_TEXT.uploading}
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  {PHOTO_UPLOAD_TEXT.addPhotos}
                </>
              )}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
