import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, Shield, Sparkles, Droplets, 
  Car, Lightbulb, Cog, Sofa, Atom, Save, X, GripVertical
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import AdminLayout from '../components/admin/AdminLayout';
import { SERVICES } from '../data/mock';
import { toast } from 'sonner';

const ICON_OPTIONS = [
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'Droplets', label: 'Droplets', icon: Droplets },
  { value: 'Car', label: 'Car', icon: Car },
  { value: 'Lightbulb', label: 'Lightbulb', icon: Lightbulb },
  { value: 'Cog', label: 'Cog/Settings', icon: Cog },
  { value: 'Sofa', label: 'Sofa/Interior', icon: Sofa },
  { value: 'Atom', label: 'Atom/Tech', icon: Atom },
];

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    description: '',
    benefits: '',
    suitableFor: '',
    image: '',
    icon: 'Shield'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = () => {
    const storedServices = localStorage.getItem('wheelspa_services');
    const allServices = storedServices ? JSON.parse(storedServices) : SERVICES;
    setServices(allServices);
    setFilteredServices(allServices);
    
    // Save default services to localStorage if not exists
    if (!storedServices) {
      localStorage.setItem('wheelspa_services', JSON.stringify(SERVICES));
    }
  };

  useEffect(() => {
    let filtered = services;
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shortName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredServices(filtered);
  }, [services, searchTerm]);

  const getIconComponent = (iconName) => {
    const iconOption = ICON_OPTIONS.find(i => i.value === iconName);
    return iconOption ? iconOption.icon : Shield;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      description: '',
      benefits: '',
      suitableFor: '',
      image: '',
      icon: 'Shield'
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    if (!formData.shortName.trim()) newErrors.shortName = 'Short name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.benefits.trim()) newErrors.benefits = 'At least one benefit is required';
    if (!formData.suitableFor.trim()) newErrors.suitableFor = 'At least one suitable category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddClick = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEditClick = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      shortName: service.shortName,
      description: service.description,
      benefits: service.benefits.join(', '),
      suitableFor: service.suitableFor.join(', '),
      image: service.image || '',
      icon: service.icon || 'Shield'
    });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (service) => {
    setSelectedService(service);
    setIsDeleteModalOpen(true);
  };

  const handleAddSave = () => {
    if (!validateForm()) return;

    const newService = {
      id: formData.shortName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: formData.name.trim(),
      shortName: formData.shortName.trim(),
      description: formData.description.trim(),
      benefits: formData.benefits.split(',').map(b => b.trim()).filter(b => b),
      suitableFor: formData.suitableFor.split(',').map(s => s.trim()).filter(s => s),
      image: formData.image.trim() || 'https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg',
      icon: formData.icon
    };

    const updatedServices = [...services, newService];
    localStorage.setItem('wheelspa_services', JSON.stringify(updatedServices));
    setServices(updatedServices);
    setIsAddModalOpen(false);
    resetForm();
    toast.success('Service added successfully!');
  };

  const handleEditSave = () => {
    if (!validateForm()) return;

    const updatedServices = services.map(s => {
      if (s.id === selectedService.id) {
        return {
          ...s,
          name: formData.name.trim(),
          shortName: formData.shortName.trim(),
          description: formData.description.trim(),
          benefits: formData.benefits.split(',').map(b => b.trim()).filter(b => b),
          suitableFor: formData.suitableFor.split(',').map(st => st.trim()).filter(st => st),
          image: formData.image.trim() || s.image,
          icon: formData.icon
        };
      }
      return s;
    });

    localStorage.setItem('wheelspa_services', JSON.stringify(updatedServices));
    setServices(updatedServices);
    setIsEditModalOpen(false);
    toast.success('Service updated successfully!');
  };

  const handleDeleteConfirm = () => {
    const updatedServices = services.filter(s => s.id !== selectedService.id);
    localStorage.setItem('wheelspa_services', JSON.stringify(updatedServices));
    setServices(updatedServices);
    setIsDeleteModalOpen(false);
    toast.success('Service deleted successfully!');
  };

  const ServiceForm = ({ onSave, onCancel, title }) => (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Service Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., Paint Protection Film (PPF)"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="shortName">Short Name *</Label>
          <Input
            id="shortName"
            value={formData.shortName}
            onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
            className={`mt-1 ${errors.shortName ? 'border-red-500' : ''}`}
            placeholder="e.g., PPF"
          />
          {errors.shortName && <p className="text-red-500 text-sm mt-1">{errors.shortName}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
          placeholder="Describe the service..."
          rows={3}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <Label htmlFor="benefits">Benefits * (comma separated)</Label>
        <Textarea
          id="benefits"
          value={formData.benefits}
          onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
          className={`mt-1 ${errors.benefits ? 'border-red-500' : ''}`}
          placeholder="e.g., Self-healing technology, 10+ years protection, UV protection"
          rows={2}
        />
        {errors.benefits && <p className="text-red-500 text-sm mt-1">{errors.benefits}</p>}
      </div>

      <div>
        <Label htmlFor="suitableFor">Suitable For * (comma separated)</Label>
        <Input
          id="suitableFor"
          value={formData.suitableFor}
          onChange={(e) => setFormData(prev => ({ ...prev, suitableFor: e.target.value }))}
          className={`mt-1 ${errors.suitableFor ? 'border-red-500' : ''}`}
          placeholder="e.g., Luxury Cars, Sports Cars, New Vehicles"
        />
        {errors.suitableFor && <p className="text-red-500 text-sm mt-1">{errors.suitableFor}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            value={formData.image}
            onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
            className="mt-1"
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for default image</p>
        </div>
        <div>
          <Label>Icon</Label>
          <Select
            value={formData.icon}
            onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((option) => {
                const IconComp = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <IconComp className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.image && (
        <div>
          <Label>Image Preview</Label>
          <img
            src={formData.image}
            alt="Preview"
            className="mt-2 h-32 w-full object-cover rounded-lg border"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout title="Manage Services">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAddClick} className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New Service
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredServices.map((service) => {
          const IconComponent = getIconComponent(service.icon);
          return (
            <Card key={service.id} className="border-0 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-green-500 text-white">{service.shortName}</Badge>
                </div>
                <div className="absolute top-3 right-3 flex space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => handleEditClick(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-red-500"
                    onClick={() => handleDeleteClick(service)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{service.name}</h3>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{service.description}</p>
                <div className="flex flex-wrap gap-1">
                  {service.benefits.slice(0, 2).map((benefit, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-gray-100">
                      {benefit}
                    </Badge>
                  ))}
                  {service.benefits.length > 2 && (
                    <Badge variant="secondary" className="text-xs bg-gray-100">
                      +{service.benefits.length - 2} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No services found</p>
            <Button onClick={handleAddClick} className="mt-4 bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add First Service
            </Button>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="h-5 w-5 text-green-500 mr-2" />
              Add New Service
            </DialogTitle>
          </DialogHeader>
          <ServiceForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSave} className="bg-green-500 hover:bg-green-600 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 text-green-500 mr-2" />
              Edit Service
            </DialogTitle>
          </DialogHeader>
          <ServiceForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-green-500 hover:bg-green-600 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Service</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedService?.name}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminServices;
