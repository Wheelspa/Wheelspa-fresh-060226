import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Phone, Search, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import AdminLayout from '../components/admin/AdminLayout';
import { INSTALLERS, INSTALLER_CATEGORIES, MOCK_INSTALLER_PAYMENTS } from '../data/installerMock';
import { toast } from 'sonner';

const InstallerManage = () => {
  const [installers, setInstallers] = useState([]);
  const [filteredInstallers, setFilteredInstallers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const storedInstallers = localStorage.getItem('wheelspa_installers');
    const allInstallers = storedInstallers ? JSON.parse(storedInstallers) : INSTALLERS;
    setInstallers(allInstallers);
    setFilteredInstallers(allInstallers);

    const storedPayments = localStorage.getItem('wheelspa_installer_payments');
    setPayments(storedPayments ? JSON.parse(storedPayments) : MOCK_INSTALLER_PAYMENTS);
  };

  useEffect(() => {
    let filtered = installers;

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.phone.includes(searchTerm)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(i => i.category === categoryFilter);
    }

    setFilteredInstallers(filtered);
  }, [installers, searchTerm, categoryFilter]);

  const getInstallerStats = (installerId) => {
    const installerPayments = payments.filter(p => p.installerId === installerId);
    const totalPaid = installerPayments.reduce((sum, p) => sum + p.advancePaid, 0);
    const totalPending = installerPayments.reduce((sum, p) => sum + p.remainingBalance, 0);
    const jobCount = installerPayments.length;
    return { totalPaid, totalPending, jobCount };
  };

  const getCategoryLabel = (value) => {
    return INSTALLER_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const handleAddClick = () => {
    setFormData({ name: '', category: '', phone: '' });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (installer) => {
    setSelectedInstaller(installer);
    setFormData({
      name: installer.name,
      category: installer.category,
      phone: installer.phone
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (installer) => {
    setSelectedInstaller(installer);
    setIsDeleteModalOpen(true);
  };

  const handleAddSave = () => {
    if (!formData.name.trim() || !formData.category || !formData.phone.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    const newInstaller = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      category: formData.category,
      phone: formData.phone.trim()
    };

    const updatedInstallers = [...installers, newInstaller];
    localStorage.setItem('wheelspa_installers', JSON.stringify(updatedInstallers));
    setInstallers(updatedInstallers);
    setIsAddModalOpen(false);
    toast.success('Installer added successfully!');
  };

  const handleEditSave = () => {
    if (!formData.name.trim() || !formData.category || !formData.phone.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    const updatedInstallers = installers.map(i => 
      i.id === selectedInstaller.id 
        ? { ...i, name: formData.name.trim(), category: formData.category, phone: formData.phone.trim() }
        : i
    );

    localStorage.setItem('wheelspa_installers', JSON.stringify(updatedInstallers));
    setInstallers(updatedInstallers);
    setIsEditModalOpen(false);
    toast.success('Installer updated successfully!');
  };

  const handleDeleteConfirm = () => {
    const hasPayments = payments.some(p => p.installerId === selectedInstaller.id);
    if (hasPayments) {
      toast.error('Cannot delete installer with existing payments');
      setIsDeleteModalOpen(false);
      return;
    }

    const updatedInstallers = installers.filter(i => i.id !== selectedInstaller.id);
    localStorage.setItem('wheelspa_installers', JSON.stringify(updatedInstallers));
    setInstallers(updatedInstallers);
    setIsDeleteModalOpen(false);
    toast.success('Installer deleted successfully');
  };

  return (
    <AdminLayout title="Manage Installers">
      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INSTALLER_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Installer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInstallers.map((installer) => {
          const stats = getInstallerStats(installer.id);
          return (
            <Card key={installer.id} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{installer.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {getCategoryLabel(installer.category)}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(installer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteClick(installer)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center text-gray-500 text-sm mb-4">
                  <Phone className="h-4 w-4 mr-2" />
                  {installer.phone}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Jobs</p>
                    <p className="font-semibold text-gray-900">{stats.jobCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-semibold text-green-600">₹{stats.totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className={`font-semibold ${stats.totalPending > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      ₹{stats.totalPending.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredInstallers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No installers found</p>
            <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Installer
            </Button>
          </div>
        )}
      </div>

      {/* Add Installer Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="h-5 w-5 text-green-500 mr-2" />
              Add New Installer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Installer Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLER_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1"
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSave} className="bg-green-500 hover:bg-green-600 text-white">Add Installer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Installer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 text-green-500 mr-2" />
              Edit Installer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Installer Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLER_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-green-500 hover:bg-green-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Installer</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedInstaller?.name}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default InstallerManage;
