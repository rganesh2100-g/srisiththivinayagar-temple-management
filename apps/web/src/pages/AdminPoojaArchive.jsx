import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const GODS = ['All', 'LORD SHIVA', 'LORD GANESHA', 'LORD MURUGAN', 'LORD BHAIRAVA', 'LORD RAJA RAJESWARI AMMAN'];

const AdminPoojaArchive = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [godFilter, setGodFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    const fetchArchives = async () => {
      setLoading(true);
      try {
        const records = await pb.collection('pooja_archive').getFullList({
          sort: '-created',
          $autoCancel: false
        });
        setArchives(records);
        
        // Extract unique months for filter
        const months = [...new Set(records.map(r => r.archive_month).filter(Boolean))].sort().reverse();
        setAvailableMonths(months);
      } catch (error) {
        toast.error('Failed to fetch archive data');
      } finally {
        setLoading(false);
      }
    };
    fetchArchives();
  }, []);

  const filteredArchives = archives.filter(record => {
    const matchesSearch = record.pooja_name.toLowerCase().includes(search.toLowerCase()) || 
                          record.user_name.toLowerCase().includes(search.toLowerCase()) ||
                          record.receipt_number.toLowerCase().includes(search.toLowerCase());
    const matchesGod = godFilter === 'All' || record.god === godFilter;
    const matchesMonth = monthFilter === 'All' || record.archive_month === monthFilter;
    
    return matchesSearch && matchesGod && matchesMonth;
  });

  const handleExport = () => {
    if (filteredArchives.length === 0) {
      toast.info('No data to export');
      return;
    }

    const exportData = filteredArchives.map(record => ({
      'Receipt Number': record.receipt_number,
      'Archive Month': record.archive_month,
      'Pooja Name': record.pooja_name,
      'God': record.god,
      'Category': record.category,
      'Devotee Name': record.user_name,
      'Devotee Email': record.user_email,
      'Date': new Date(record.selected_date).toLocaleDateString(),
      'Time': record.selected_time,
      'Donation (€)': record.donation_amount,
      'Archived On': new Date(record.created).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pooja Archive");
    XLSX.writeFile(wb, `Pooja_Archive_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <AdminLayout>
      <Helmet><title>Pooja Archive | Admin</title></Helmet>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Pooja Archive</h1>
            <p className="text-muted-foreground">Historical records of completed poojas.</p>
          </div>
          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="w-4 h-4 mr-2" /> Export to Excel
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name, pooja, receipt..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={godFilter} onValueChange={setGodFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by God" /></SelectTrigger>
                <SelectContent>
                  {GODS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Months</SelectItem>
                  {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredArchives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No archive records found matching filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Pooja Details</TableHead>
                      <TableHead>Devotee</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-right">Donation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArchives.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs font-medium">{record.receipt_number}</TableCell>
                        <TableCell>{record.archive_month}</TableCell>
                        <TableCell>
                          <p className="font-medium">{record.pooja_name}</p>
                          <p className="text-xs text-muted-foreground">{record.god}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{record.user_name}</p>
                          <p className="text-xs text-muted-foreground">{record.user_email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{new Date(record.selected_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{record.selected_time}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">€{record.donation_amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPoojaArchive;