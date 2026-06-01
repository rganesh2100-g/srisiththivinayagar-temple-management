import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const COLLECTION_NAME = 'poojas';

const PublishToggle = ({ poojaId, initialStatus, onToggle }) => {
  const [isPublished, setIsPublished] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setIsPublished(initialStatus);
  }, [initialStatus]);

  const handleToggle = async (checked) => {
    // 1. Client-side permission check before attempting network request
    const userRole = pb.authStore.model?.role;
    if (userRole !== 'admin') {
      console.warn(`[PublishToggle] Blocked: User role is '${userRole}', requires 'admin'`);
      toast.error("You don't have permission to perform this action.");
      return;
    }

    if (!poojaId) {
      console.error(`[PublishToggle] CRITICAL ERROR: poojaId is undefined or null!`);
      toast.error('System Error: Invalid record ID provided to toggle.');
      return;
    }

    setLoading(true);
    
    console.log(`\n--- [PublishToggle] INITIATED ---`);
    console.log(`[PublishToggle] Endpoint: PATCH /api/collections/${COLLECTION_NAME}/records/${poojaId}`);
    console.log(`[PublishToggle] Target Record ID: '${poojaId}'`);
    console.log(`[PublishToggle] New Value (published): ${checked}`);
    
    // Prepare exact payload matching schema requirements
    const payload = {
      published: checked,
      status: checked ? 'published' : 'draft'
    };

    console.log(`[PublishToggle] Payload:`, payload);

    try {
      // Attempt direct update without pre-flight check to ensure atomic operation
      const updatedRecord = await pb.collection(COLLECTION_NAME).update(poojaId, payload, { $autoCancel: false });
      
      console.log(`[PublishToggle] Success! Response data:`, updatedRecord);
      
      // Update UI state immediately
      const updatedStatus = updatedRecord.published || updatedRecord.status === 'published';
      setIsPublished(updatedStatus);
      toast.success(updatedStatus ? 'Pooja is now visible to public' : 'Pooja hidden from public');
      
      // Notify parent component if callback exists
      if (onToggle) onToggle(updatedRecord);
      
    } catch (error) {
      console.error('\n--- [PublishToggle] FAILED ---');
      console.error(`[PublishToggle] Failed Record ID: ${poojaId}`);
      console.error(`[PublishToggle] HTTP Status Code: ${error.status}`);
      console.error(`[PublishToggle] Full Error Response:`, error?.response);
      console.error(`[PublishToggle] Original Error Object:`, error);
      
      // Revert optimistic state visually
      setIsPublished(initialStatus);

      // Distinguish specific error codes for better user feedback as requested
      if (error.status === 404) {
        toast.error(`Record not found - it may have been deleted (ID: ${poojaId})`);
      } else if (error.status === 403) {
        toast.error("You don't have permission to modify this record.");
      } else {
        const errorMessage = error?.response?.message || error.message || 'Unknown network error';
        toast.error(`Failed to update: ${errorMessage}`);
      }
      
    } finally {
      setLoading(false);
      console.log(`--- [PublishToggle] COMPLETED ---\n`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={isPublished}
          onCheckedChange={handleToggle}
          disabled={loading}
          className={isPublished ? "data-[state=checked]:bg-green-600" : "bg-gray-300"}
          aria-label="Toggle publish status"
        />
      )}
      <span className={`text-sm font-medium whitespace-nowrap ${isPublished ? 'text-green-600' : 'text-muted-foreground'}`}>
        {isPublished ? 'Published' : 'Hidden'}
      </span>
    </div>
  );
};

export default PublishToggle;