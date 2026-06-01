import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout.jsx';
import { listRecords, deleteRecord } from '@/lib/pbHelper.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Search, ShieldAlert, History, FilterX, Download, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import ExcelExportButton from '@/components/ExcelExportButton.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 20;

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let filterQuery = '';
      const filterParts = [];
      
      if (searchQuery) {
        filterParts.push(`(admin_name ~ "${searchQuery}" || notes ~ "${searchQuery}")`);
      }
      
      if (actionFilter !== 'all') {
        filterParts.push(`action="${actionFilter}"`);
      }

      if (filterParts.length > 0) {
        filterQuery = filterParts.join(' && ');
      }

      const result = await listRecords('approval_logs', page, perPage, {
        filter: filterQuery,
        sort: '-timestamp',
        expand: 'admin_id'
      });

      setLogs(result.items);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Could not load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, actionFilter, page]);

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setPage(1);
  };

  const handleDeleteClick = (log) => {
    setLogToDelete(log);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRecord('approval_logs', logToDelete.id);
      toast.success('Audit log deleted successfully');
      fetchLogs();
    } catch (error) {
      console.error('Failed to delete audit log:', error);
      toast.error('Failed to delete audit log');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    }
  };

  const getActionBadge = (action) => {
    switch(action?.toLowerCase()) {
      case 'approved':
      case 'published':
      case 'created':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shadow-none border-emerald-200">Success</Badge>;
      case 'rejected':
      case 'deleted':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 shadow-none border-rose-200">Destructive</Badge>;
      case 'restored':
      case 'updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 shadow-none border-blue-200">Modified</Badge>;
      default:
        return <Badge variant="secondary" className="shadow-none">{action}</Badge>;
    }
  };

  const exportColumns = [
    { header: 'Date', accessor: (row) => format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss') },
    { header: 'Admin Name', key: 'admin_name' },
    { header: 'Action', key: 'action' },
    { header: 'Details', key: 'notes' },
  ];

  return (
    <AdminLayout>
      <Helmet><title>Audit Logs | Admin Portal</title></Helmet>

      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-primary" /> System Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">Immutable record of administrative actions and approvals.</p>
          </div>
          <ExcelExportButton 
            data={logs} 
            filename="system-audit-logs" 
            columns={exportColumns} 
            className="bg-card shadow-sm border border-border"
          />
        </div>

        <Card className="shadow-sm border-border/50 bg-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-1 w-full gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search logs..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-9 bg-background h-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-[180px] bg-background h-10">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(searchQuery || actionFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  <FilterX className="w-4 h-4 mr-2" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-12 text-center text-destructive bg-destructive/5">
                <p className="font-medium">{error}</p>
              </div>
            ) : loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-12 rounded-lg" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <History className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
                <p className="text-lg font-medium text-foreground">No logs found</p>
                <p className="text-sm text-muted-foreground">Adjust your filters to see more results.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[180px] whitespace-nowrap">Timestamp</TableHead>
                      <TableHead>Admin User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="w-[35%]">Details</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {log.admin_name || 'System'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {getActionBadge(log.action)} {log.action}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.notes || 'No additional details provided.'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(log)}
                            title="Delete Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/10">
                <span className="text-xs text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{logs.length}</span> of <span className="font-medium text-foreground">{totalItems}</span> logs
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 text-xs bg-background"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-8 text-xs bg-background"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <Trash2 className="w-5 h-5" />
              Delete Audit Log?
            </DialogTitle>
            <DialogDescription className="pt-3 text-base">
              Are you sure you want to delete this audit log? This action cannot be undone.
              {logToDelete && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">{logToDelete.action}</span>
                  <span className="text-sm text-muted-foreground">{logToDelete.notes}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAuditLogs;