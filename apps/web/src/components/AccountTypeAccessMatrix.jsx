import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Search, AlertCircle, RefreshCw, FileText, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

const AccountTypeAccessMatrix = () => {
  const [pages, setPages] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [accessMatrix, setAccessMatrix] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const [pagesRes, typesRes, accessRes] = await Promise.all([
        pb.collection('pages').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('account_types').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('page_access').getFullList({ $autoCancel: false })
      ]);
      
      setPages(pagesRes);
      setAccountTypes(typesRes);
      
      if (typesRes.length > 0) {
        setActiveTab(typesRes[0].id);
      }

      // Build access matrix mapping: accountTypeId -> pageRoute -> accessLevel
      const matrix = {};
      typesRes.forEach(type => {
        matrix[type.id] = {};
      });

      accessRes.forEach(acc => {
        if (acc.userId && matrix[acc.userId]) {
          matrix[acc.userId][acc.pageRoute] = {
            isActive: acc.isActive,
            accessLevel: acc.accessLevel
          };
        }
      });
      
      setAccessMatrix(matrix);
    } catch (err) {
      console.error('Matrix fetch error:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/20 shadow-sm rounded-2xl bg-destructive/5 overflow-hidden mt-8">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive/80" />
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-destructive">Failed to load permissions</h3>
            <p className="text-sm text-destructive/80 max-w-sm mx-auto">
              We couldn't retrieve the account access matrix. Please check your connection.
            </p>
          </div>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 transition-all duration-200 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" /> Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden mt-8">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accountTypes.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm rounded-2xl bg-muted/20 mt-8">
        <CardContent className="p-12 text-center">
          <ShieldAlert className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No account types available.</p>
          <p className="text-sm text-muted-foreground mt-1">Please create an account type to view its access permissions.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredPages = pages.filter(page => 
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    page.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAccessBadge = (typeId, pageRoute) => {
    const record = accessMatrix[typeId]?.[pageRoute];
    const isActive = record ? record.isActive : false;
    const level = record ? record.accessLevel : 'none';

    if (!isActive || level === 'none') {
      return (
        <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-400 dark:border-slate-800/30">
          None
        </Badge>
      );
    }

    if (level === 'edit' || level === 'admin') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800/30 capitalize">
          {level}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800/30 capitalize">
        {level}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mt-12">
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Role Permissions Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">View access levels configured for each account type.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex-wrap h-auto shadow-sm">
          {accountTypes.map(type => (
            <TabsTrigger 
              key={type.id} 
              value={type.id}
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {type.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages by name or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 w-full bg-background rounded-xl border-border/50 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all duration-200"
          />
        </div>

        {accountTypes.map(type => (
          <TabsContent key={type.id} value={type.id} className="outline-none m-0">
            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {pages.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No pages configured.</div>
                ) : filteredPages.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No pages match your search.</div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                        <TableRow>
                          <TableHead className="font-semibold w-[35%]">Page Name</TableHead>
                          <TableHead className="font-semibold w-[40%]">Route</TableHead>
                          <TableHead className="font-semibold text-right">Access Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPages.map(page => (
                          <TableRow key={page.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                {page.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">
                              {page.route}
                            </TableCell>
                            <TableCell className="text-right">
                              {getAccessBadge(type.id, page.route)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-4 flex justify-center">
              <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-medium px-4 py-1.5 rounded-full">
                Showing {filteredPages.length} of {pages.length} pages
              </Badge>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AccountTypeAccessMatrix;