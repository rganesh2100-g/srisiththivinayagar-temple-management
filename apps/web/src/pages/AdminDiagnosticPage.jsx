import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { readRecord, createRecord, updateRecord, deleteRecord } from '@/lib/pbHelper.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Server, Database, AlertTriangle, CheckCircle2, Clock, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const AdminDiagnosticPage = () => {
  const [logs, setLogs] = useState([]);
  const [dbStatus, setDbStatus] = useState('checking');
  const [metrics, setMetrics] = useState({
    users: 0,
    bookings: 0,
    donations: 0,
    subscriptions: 0
  });

  const loadLogs = () => {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('pb_diagnostic_logs') || '[]');
      setLogs(storedLogs);
    } catch (e) {
      setLogs([]);
    }
  };

  const checkDbStatus = async () => {
    setDbStatus('checking');
    try {
      // Perform a lightweight check
      await pb.collection('users').getList(1, 1, { $autoCancel: false });
      setDbStatus('connected');
      
      // Fetch counts for main collections
      const [users, bookings, donations, subscriptions] = await Promise.all([
        pb.collection('users').getList(1, 1, { $autoCancel: false }).then(r => r.totalItems).catch(() => 0),
        pb.collection('pooja_bookings').getList(1, 1, { $autoCancel: false }).then(r => r.totalItems).catch(() => 0),
        pb.collection('donations').getList(1, 1, { $autoCancel: false }).then(r => r.totalItems).catch(() => 0),
        pb.collection('subscriptions').getList(1, 1, { $autoCancel: false }).then(r => r.totalItems).catch(() => 0)
      ]);
      
      setMetrics({ users, bookings, donations, subscriptions });
    } catch (err) {
      console.error('DB Check Failed:', err);
      setDbStatus('error');
    }
  };

  useEffect(() => {
    loadLogs();
    checkDbStatus();
    
    // Auto-refresh logs every 5 seconds
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearLogs = () => {
    localStorage.removeItem('pb_diagnostic_logs');
    setLogs([]);
    toast.success('Diagnostic logs cleared.');
  };

  const runTestOperation = async () => {
    try {
      const testData = {
        name: 'Diagnostic Test Entry',
        email: 'diagnostic@example.com',
        phone: '1234567890',
        subject: 'System Test',
        message: 'This is an automated diagnostic test.',
        status: 'pending'
      };
      
      // We'll use contact_inquiries as a safe test table
      toast.info('Starting test operation cycle...');
      
      // 1. Create
      const created = await createRecord('contact_inquiries', testData);
      toast.success('Create successful');
      
      // 2. Read
      await readRecord('contact_inquiries', created.id);
      toast.success('Read successful');
      
      // 3. Update
      await updateRecord('contact_inquiries', created.id, { status: 'resolved' });
      toast.success('Update successful');
      
      // 4. Delete
      await deleteRecord('contact_inquiries', created.id);
      toast.success('Delete successful. Cycle complete.');
      
      loadLogs();
      checkDbStatus();
    } catch (err) {
      toast.error(`Test failed: ${err.message}`);
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>System Diagnostics | Admin</title></Helmet>
      
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">System Diagnostics</h1>
            <p className="text-muted-foreground">Monitor data persistence, database health, and recent operations.</p>
          </div>
          <Button onClick={checkDbStatus} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Status Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 border-border/50 shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" /> PocketBase Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  dbStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  dbStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-destructive'
                }`} />
                <span className="font-semibold capitalize text-foreground">
                  {dbStatus === 'connected' ? 'Connected & Healthy' : dbStatus === 'checking' ? 'Checking...' : 'Connection Error'}
                </span>
              </div>
              <Button onClick={runTestOperation} className="w-full gap-2" variant="secondary">
                <Activity className="w-4 h-4" /> Run Full CRUD Test
              </Button>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 md:col-span-2 border-border/50 shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Collection Metrics
              </CardTitle>
              <CardDescription>Total record counts across primary collections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Users</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.users}</p>
                </div>
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Bookings</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.bookings}</p>
                </div>
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Donations</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.donations}</p>
                </div>
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Subscriptions</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.subscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operation Logs */}
        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Recent Operations Log
              </CardTitle>
              <CardDescription>Locally cached logs of PocketBase operations for diagnostic tracing.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearLogs} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Logs
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No operations logged yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] w-full">
                <div className="divide-y divide-border/50">
                  {logs.map((log) => (
                    <div key={log.id} className={`p-4 transition-colors hover:bg-muted/30 ${!log.success ? 'bg-destructive/5' : ''}`}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          {log.success ? 
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : 
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          }
                          <Badge variant={log.success ? 'outline' : 'destructive'} className="font-mono text-xs">
                            {log.op}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">{log.collection}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="pl-6 space-y-2">
                        <div className="text-xs font-mono bg-muted p-2 rounded border border-border/50 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                          {log.payload || 'No payload'}
                        </div>
                        {!log.success && (
                          <div className="text-xs font-medium text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                            Status {log.status}: {log.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDiagnosticPage;