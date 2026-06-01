import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Edit, Loader2, Info } from 'lucide-react';
import PublishToggle from '@/components/PublishToggle.jsx';

const PoojaEntriesList = ({ onEditPooja, refreshTrigger }) => {
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPoojas = async () => {
    setLoading(true);
    try {
      console.log('[PoojaEntriesList] Fetching poojas list from database...');
      const records = await pb.collection('poojas').getFullList({
        filter: 'is_deleted=false',
        sort: '-created',
        $autoCancel: false
      });
      console.log(`[PoojaEntriesList] Successfully fetched ${records.length} poojas.`);
      setPoojas(records);
    } catch (err) {
      console.error('[PoojaEntriesList] Failed to fetch poojas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoojas();

    const subscribe = async () => {
      try {
        await pb.collection('poojas').subscribe('*', function (e) {
          console.log('[PoojaEntriesList] Realtime update received:', e.action, e.record.id);
          fetchPoojas();
        });
      } catch (err) {
        console.error('[PoojaEntriesList] Realtime subscription failed:', err);
      }
    };
    
    subscribe();

    return () => {
      pb.collection('poojas').unsubscribe('*').catch(() => {});
    };
  }, [refreshTrigger]);

  const handleToggleSuccess = (updatedRecord) => {
    setPoojas(prev => 
      prev.map(p => p.id === updatedRecord.id ? updatedRecord : p)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (poojas.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-muted-foreground border rounded-xl bg-card shadow-sm">
        <Info className="w-10 h-10 mx-auto mb-3 opacity-40"/>
        <p className="font-medium text-foreground">No poojas found</p>
        <p className="text-sm">Create a new pooja above to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto w-full">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Pooja Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {poojas.map(pooja => {
              const isPoojaVisible = pooja.published || pooja.status === 'published';
              
              // Log the exact ID being passed to the toggle for debugging
              console.log(`[PoojaEntriesList] Rendering row for Pooja: '${pooja.name}', ID: '${pooja.id}'`);
              
              return (
                <TableRow 
                  key={pooja.id} 
                  className={`transition-colors ${!isPoojaVisible ? 'opacity-80 bg-muted/20' : ''}`}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{pooja.name}</div>
                    <div className="text-xs text-muted-foreground">{pooja.god}</div>
                    <div className="text-[10px] text-muted-foreground/50 font-mono mt-1">ID: {pooja.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-background">
                      {pooja.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PublishToggle 
                      poojaId={pooja.id} 
                      initialStatus={isPoojaVisible} 
                      onToggle={handleToggleSuccess}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEditPooja(pooja)} 
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {poojas.map(pooja => {
          const isPoojaVisible = pooja.published || pooja.status === 'published';
          
          return (
            <Card 
              key={pooja.id} 
              className={`p-4 shadow-sm border border-border ${!isPoojaVisible ? 'opacity-80 bg-muted/20' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{pooja.name}</h3>
                    <p className="text-sm text-muted-foreground">{pooja.god}</p>
                    <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">ID: {pooja.id}</p>
                  </div>
                  <Badge variant="outline" className="bg-background shrink-0">
                    {pooja.category}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                  <PublishToggle 
                    poojaId={pooja.id} 
                    initialStatus={isPoojaVisible} 
                    onToggle={handleToggleSuccess}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEditPooja(pooja)}
                    className="hover:bg-primary/10 hover:text-primary shrink-0"
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PoojaEntriesList;