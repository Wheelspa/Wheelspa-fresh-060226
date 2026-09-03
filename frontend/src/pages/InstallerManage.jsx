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
import { useAdminAuth } from '../context/AdminAuthContext';
import { INSTALLERS as DEFAULT_INSTALLERS, INSTALLER_CATEGORIES, MOCK_INSTALLER_PAYMENTS } from '../data/installerMock';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InstallerManage = () => {
  const { admin } = useAdminAuth();
  const [installers, setInstallers] = useState([]);
  const [filteredInstallers, setFilteredInstallers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState(null);
  const [deleteWithPayments, setDeleteWithPayments] = useState(false);
  const [installerPaymentCount, setInstallerPaymentCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    phone: ''
  });

  useEffect(() => {
    if (admin?.token) {
      loadData();
    }
  }, [admin?.token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [instRes, payRes] = await Promise.all([
        fetch(`${API_URL}/api/installers`, { headers: { 'Authorization': `Bearer ${admin?.token}` } }),
        fetch(`${API_URL}/api/installer-payments`, { headers: { 'Authorization': `Bearer ${admin?.token}` } })
      ]);

      if (instRes.ok) {
        const instData = await instRes.json();
        setInstallers(instData);
        setFilteredInstallers(instData);
      } else {
        setInstallers(DEFAULT_INSTALLERS);
        setFilteredInstallers(DEFAULT_INSTALLERS);
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData);
      }
    } catch (error) {
      console.error('Error fetching installer data:', error);
      toast.error('Connection error loading installers');
    } finally {
      setLoading(false);
    }
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
    const paymentCount = payments.filter(p => p.installerId === installer.id).length;
    setInstallerPaymentCount(paymentCount);
    setDeleteWithPayments(false);
    setIsDeleteModalOpen(true);
  };

  const handleAddSave = async () => {
    if (!formData.name.trim() || !formData.category || !formData.phone.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      phone: formData.phone.trim()
    };

    try {
      const response = await fetch(`${API_URL}/api/installers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast.success('Installer added successfully!');
        setIsAddModalOpen(false);
        loadData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to add installer');
      }
    } catch (error) {
      console.error('Error adding installer:', error);
      toast.error('Connection error adding installer');
    }
  };

  const handleEditSave = async () => {
    if (!formData.name.trim() || !formData.category || !formData.phone.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    const updatedData = {
      name: formData.name.trim(),
      category: formData.category,
      phone: formData.phone.trim()
    };

    try {
      if (admin?.role === 'admin') {
        const response = await fetch(`${API_URL}/api/approval-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin?.token}`
          },
          body: JSON.stringify({
            request_type: 'edit',
            data_type: 'installer',
            data_id: selectedInstaller.id,
            original_data: selectedInstaller,
            new_data: { ...selectedInstaller, ...updatedData },
            notes: `Update installer ${formData.name}`
          })
        });
        if (response.ok) {
          toast.success('Approval request submitted for installer edit');
          setIsEditModalOpen(false);
        } else {
          toast.error('Failed to submit approval request');
        }
      } else {
        const response = await fetch(`${API_URL}/api/installers/${selectedInstaller.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin?.token}`
          },
          body: JSON.stringify(updatedData)
        });
        if (response.ok) {
          toast.success('Installer updated successfully!');
          setIsEditModalOpen(false);
          loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.detail || 'Failed to update installer');
        }
      }
    } catch (error) {
      console.error('Error updating installer:', error);
      toast.error('Connection error updating installer');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      if (admin?.role === 'admin') {
        const response = await fetch(`${API_URL}/api/approval-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin?.token}`
          },
          body: JSON.stringify({
            request_type: 'delete',
            data_type: 'installer',
            data_id: selectedInstaller.id,
            original_data: selectedInstaller,
            notes: `Delete installer ${selectedInstaller.name}`
          })
        });
        if (response.ok) {
          toast.success('Approval request submitted for installer deletion');
        } else {
          toast.error('Failed to submit deletion request');
        }
      } else {
        const response = await fetch(`${API_URL}/api/installers/${selectedInstaller.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        });
        if (response.ok) {
          toast.success('Installer deleted successfully');
          loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.detail || 'Failed to delete installer');
        }
      }
    } catch (error) {
      console.error('Error deleting installer:', error);
      toast.error('Connection error deleting installer');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedInstaller(null);
      setDeleteWithPayments(false);
    }
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
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedInstaller?.name}</strong>?
              This action cannot be undone.
            </p>
            
            {installerPaymentCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 font-medium mb-2">
                  ⚠️ This installer has {installerPaymentCount} payment record(s)
                </p>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteWithPayments}
                    onChange={(e) => setDeleteWithPayments(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-orange-700">
                    Also delete all payment records for this installer
                  </span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteConfirm}>
              {deleteWithPayments ? 'Delete All' : 'Delete Installer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default InstallerManage;
