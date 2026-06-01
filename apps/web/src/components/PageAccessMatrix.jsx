import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { Search, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

/**
 * @typedef {Object} Page
 * @property {string} id
 * @property {string} name
 * @property {string} route
 * @property {string} [description]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} AccountType
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} [is_enabled]
 */

/**
 * @typedef {Object} PageAccess
 * @property {string} id
 * @property {string} pageRoute
 * @property {string} userId - Represents the Account Type ID mapping
 * @property {boolean} isActive
 * @property {string} accessLevel
 */

/**
 * @typedef {Record<string, PageAccess>} AccessMatrix
 */

const PageAccessMatrix = ({ refreshTrigger = 0 }) => {
  /** @type {[Page[], React.Dispatch<React.SetStateAction<Page[]>>]} */
  const [pages, setPages] = useState([]);
  
  /** @type {[AccountType[], React.Dispatch<React.SetStateAction<AccountType[]>>]} */
  const [accountTypes, setAccountTypes] = useState([]);
  
  /** @type {[AccessMatrix, React.Dispatch<React.SetStateAction<AccessMatrix>>]} */
  const [matrix, setMatrix] = useState({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(false);
    try {
      // Fetch ALL records with NO filters to get the complete matrix
      // This retrieves all pages across public, user, and admin areas
      const [pagesRes, typesRes, accessRes] = await Promise.all([
        pb.collection('pages').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('account_types').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('page_access').getFullList({ $autoCancel: false })
      ]);
      
      setPages(pagesRes);
      setAccountTypes(typesRes);
      
      // Build lookup matrix for O(1) checks during rendering
      /** @type {AccessMatrix} */
      const accessMap = {};
      accessRes.forEach(acc => {
        // Map using pageRoute and userId (which stores the account type ID)
        accessMap[`${acc.pageRoute}_${acc.userId}`] = acc;
      });
      setMatrix(accessMap);
    } catch (err) {
      console.error('Matrix fetch error:', err);
      setError(true);
      toast.error('Failed to load access matrix data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  /**
   * @param {string} pageRoute 
   * @param {string} typeId 
   * @param {PageAccess|undefined} currentRecord 
   */
  const handleToggle = async (pageRoute, typeId, currentRecord) => {
    const key = `${pageRoute}_${typeId}`;
    const isCurrentlyActive = currentRecord ? currentRecord.isActive : false;
    const newValue = !isCurrentlyActive;
    
    setToggling(key);
    try {
      if (currentRecord) {
        // Update existing record
        const updated = await pb.collection('page_access').update(currentRecord.id, {
          isActive: newValue
        }, { $autoCancel: false });
        
        setMatrix(prev => ({ ...prev, [key]: updated }));
        toast.success(`Access ${newValue ? 'granted' : 'revoked'} for ${pageRoute}`);
      } else {
        // Create new record mapping pageRoute to accountTypeId (stored in userId)
        const created = await pb.collection('page_access').create({
          pageRoute,
          userId: typeId,
          accessLevel: 'view',
          isActive: true
        }, { $autoCancel: false });
        
        setMatrix(prev => ({ ...prev, [key]: created }));
        toast.success(`Access granted for ${pageRoute}`);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to update access. Please check your connection.');
    } finally {
      setToggling(null);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/20 shadow-sm rounded-2xl bg-destructive/5 overflow-hidden">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive/80" />
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-destructive">Failed to load matrix</h3>
            <p className="text-sm text-destructive/80 max-w-sm mx-auto">
              We couldn't retrieve the page access configuration. Please check your connection and try again.
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
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-10 w-64 rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (accountTypes.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm rounded-2xl bg-muted/20">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground font-medium">No account types configured.</p>
          <p className="text-sm text-muted-foreground mt-1">Please create an account type before managing matrix access.</p>
        </CardContent>
      </Card>
    );
  }

  // Only apply the search query string filter, NO admin/route filtering
  const filteredPages = pages.filter(page => 
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    page.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ALL pages by name or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 w-full bg-background rounded-xl border-border/50 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all duration-200"
          />
        </div>
        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-background px-3 py-1.5 rounded-lg border border-border/50">
          Showing {filteredPages.length} of {pages.length} total pages
        </div>
      </div>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">No pages found in the system.</p>
            <p className="text-sm text-muted-foreground mt-1">Please create pages first to manage their access.</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No pages match your search query "{searchQuery}".</p>
            <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2 text-primary hover:text-primary/80">
              Clear search filter
            </Button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <Table className="w-full text-sm border-collapse relative">
              <TableHeader className="bg-muted/50 sticky top-0 z-30 shadow-sm">
                <TableRow className="hover:bg-transparent border-b-border/50">
                  <TableHead className="sticky left-0 z-40 bg-muted/95 backdrop-blur-sm border-r border-b border-border/50 w-[300px] min-w-[300px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] text-foreground font-semibold">
                    Page Details (Name & Route)
                  </TableHead>
                  {accountTypes.map(type => (
                    <TableHead key={type.id} className="border-b border-border/50 text-center min-w-[160px] px-4 font-semibold text-foreground whitespace-nowrap bg-muted/95 backdrop-blur-sm">
                      {type.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.map(page => {
                  return (
                    <TableRow key={page.id} className="hover:bg-muted/30 transition-colors border-b-border/50">
                      <TableCell className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm border-r border-border/50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] align-middle py-3">
                        <div className="flex items-center gap-3 pr-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center border border-border/50 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground text-sm font-semibold leading-tight truncate" title={page.name}>
                              {page.name}
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px] truncate mt-0.5" title={page.route}>
                              {page.route}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {accountTypes.map(type => {
                        const record = matrix[`${page.route}_${type.id}`];
                        const isActive = record ? record.isActive : false;
                        const key = `${page.route}_${type.id}`;
                        
                        return (
                          <TableCell key={type.id} className="text-center align-middle py-3">
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleToggle(page.route, type.id, record)}
                              disabled={toggling === key}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-800 mx-auto shadow-sm transition-all duration-200"
                              aria-label={`Toggle access to ${page.name} for ${type.name}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PageAccessMatrix;