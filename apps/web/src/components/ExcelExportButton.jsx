import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const ExcelExportButton = ({ data, filename = 'export', columns, className, variant = "outline", size = "sm" }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    setIsExporting(true);
    try {
      // Format data according to columns
      const formattedData = data.map(item => {
        const row = {};
        columns.forEach(col => {
          // Handle nested properties or custom accessor functions
          if (typeof col.accessor === 'function') {
            row[col.header] = col.accessor(item);
          } else if (col.key) {
            // Handle dot notation for nested objects (e.g., 'expand.user_id.name')
            const keys = col.key.split('.');
            let value = item;
            for (const k of keys) {
              value = value ? value[k] : undefined;
            }
            row[col.header] = value !== undefined && value !== null ? value : '';
          }
        });
        return row;
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // Generate Excel file
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${filename}-${today}.xlsx`);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleExport} 
      disabled={isExporting || !data || data.length === 0}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Export to Excel
    </Button>
  );
};

export default ExcelExportButton;