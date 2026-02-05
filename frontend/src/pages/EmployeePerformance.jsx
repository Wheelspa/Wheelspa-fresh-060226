import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Star, TrendingUp, Award, Target, MessageSquare, 
  UserCheck, Plus, Eye, Edit, Trash2, BarChart3, Crown, ShieldAlert
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeePerformance = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Dialog states
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    review_period: '',
    sincerity: 5,
    target_achievement: 5,
    personality_improvement: 5,
    communication: 5,
    leadership: 5,
    comments: '',
    salary_recommendation: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if user is owner - redirect if not
  useEffect(() => {
    if (admin && admin.role !== 'owner') {
      toast.error('Access denied. Owner only.');
      navigate('/admin/dashboard');
    }
  }, [admin, navigate]);

  useEffect(() => {
    if (admin?.role === 'owner') {
      fetchData();
    }
  }, [admin]);

  const fetchData = async () => {
    try {
      const [empRes, reviewRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/performance/employees`, {
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        }),
        fetch(`${API_URL}/api/performance/reviews`, {
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        }),
        fetch(`${API_URL}/api/performance/summary`, {
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        })
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (reviewRes.ok) setReviews(await reviewRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (employee, existingReview = null) => {
    setSelectedEmployee(employee);
    if (existingReview) {
      setIsEditing(true);
      setSelectedReview(existingReview);
      setFormData({
        review_period: existingReview.review_period,
        sincerity: existingReview.sincerity,
        target_achievement: existingReview.target_achievement,
        personality_improvement: existingReview.personality_improvement,
        communication: existingReview.communication,
        leadership: existingReview.leadership,
        comments: existingReview.comments || '',
        salary_recommendation: existingReview.salary_recommendation || ''
      });
    } else {
      setIsEditing(false);
      setSelectedReview(null);
      const currentMonth = format(new Date(), 'MMMM yyyy');
      setFormData({
        review_period: currentMonth,
        sincerity: 5,
        target_achievement: 5,
        personality_improvement: 5,
        communication: 5,
        leadership: 5,
        comments: '',
        salary_recommendation: ''
      });
    }
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = isEditing 
        ? `${API_URL}/api/performance/reviews/${selectedReview.id}`
        : `${API_URL}/api/performance/reviews`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const body = isEditing ? formData : {
        ...formData,
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name || selectedEmployee.username
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success(isEditing ? 'Review updated successfully' : 'Review submitted successfully');
        setReviewDialogOpen(false);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`${API_URL}/api/performance/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${admin?.token}` }
      });

      if (response.ok) {
        toast.success('Review deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'Outstanding': return 'bg-purple-100 text-purple-800';
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Needs Improvement': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'text-purple-600';
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-blue-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const criteria = [
    { key: 'sincerity', label: 'Sincerity', icon: UserCheck, description: 'Dedication and honesty at work' },
    { key: 'target_achievement', label: 'Target Achievement', icon: Target, description: 'Meeting goals and deadlines' },
    { key: 'personality_improvement', label: 'Personality Improvement', icon: TrendingUp, description: 'Personal growth and adaptability' },
    { key: 'communication', label: 'Communication', icon: MessageSquare, description: 'Clear and effective communication' },
    { key: 'leadership', label: 'Leadership', icon: Crown, description: 'Initiative and team guidance' }
  ];

  const salaryOptions = [
    'No Change',
    '5% Hike',
    '10% Hike',
    '15% Hike',
    '20% Hike',
    '25%+ Hike (Exceptional)',
    'Promotion Recommended',
    'Performance Bonus'
  ];

  return (
    <AdminLayout title="Employee Performance">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.total_employees || 0}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Reviews</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.total_reviews || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Top Performers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {summary?.employee_stats?.filter(e => e.latest_score >= 8).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary?.employee_stats?.filter(e => e.total_reviews === 0).length || 0}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'summary' ? 'default' : 'outline'}
          onClick={() => setActiveTab('summary')}
          className={activeTab === 'summary' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Summary
        </Button>
        <Button
          variant={activeTab === 'employees' ? 'default' : 'outline'}
          onClick={() => setActiveTab('employees')}
          className={activeTab === 'employees' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Users className="h-4 w-4 mr-2" />
          Employees
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Star className="h-4 w-4 mr-2" />
          Review History
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {summary?.employee_stats?.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Yet</h3>
                    <p className="text-gray-500">Create admin or superadmin users to start performance tracking.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Performance Ranking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary?.employee_stats?.map((emp, index) => (
                        <div key={emp.employee_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-200 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{emp.employee_name}</p>
                              <p className="text-sm text-gray-500 capitalize">{emp.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${getScoreColor(emp.latest_score)}`}>
                                {emp.latest_score > 0 ? emp.latest_score.toFixed(1) : '-'}/10
                              </p>
                              <p className="text-xs text-gray-500">{emp.total_reviews} reviews</p>
                            </div>
                            <Badge className={getGradeColor(emp.latest_grade)}>
                              {emp.latest_grade}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => {
                                const employee = employees.find(e => e.id === emp.employee_id);
                                if (employee) openReviewDialog(employee);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.length === 0 ? (
                <Card className="border-0 shadow-sm col-span-full">
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees</h3>
                    <p className="text-gray-500">Create admin or superadmin users first.</p>
                  </CardContent>
                </Card>
              ) : (
                employees.map((employee) => {
                  const empStats = summary?.employee_stats?.find(e => e.employee_id === employee.id);
                  return (
                    <Card key={employee.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-700 font-bold text-lg">
                                {(employee.name || employee.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{employee.name || employee.username}</h3>
                              <p className="text-sm text-gray-500 capitalize">{employee.role}</p>
                            </div>
                          </div>
                          {empStats?.latest_grade && empStats.latest_grade !== 'Not Reviewed' && (
                            <Badge className={getGradeColor(empStats.latest_grade)}>
                              {empStats.latest_grade}
                            </Badge>
                          )}
                        </div>
                        
                        {empStats && empStats.total_reviews > 0 ? (
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Latest Score</span>
                              <span className={`font-bold ${getScoreColor(empStats.latest_score)}`}>
                                {empStats.latest_score}/10
                              </span>
                            </div>
                            <Progress value={empStats.latest_score * 10} className="h-2" />
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Recommendation</span>
                              <span className="font-medium text-gray-900">{empStats.latest_recommendation}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
                        )}
                        
                        <Button
                          className="w-full mt-4 bg-green-500 hover:bg-green-600"
                          onClick={() => openReviewDialog(employee)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Review
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                    <p className="text-gray-500">Start by adding performance reviews for your employees.</p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{review.employee_name}</h3>
                            <Badge className={getGradeColor(review.grade)}>{review.grade}</Badge>
                            <span className="text-sm text-gray-500">{review.review_period}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-4 mt-3">
                            {criteria.map((c) => (
                              <div key={c.key} className="text-center">
                                <c.icon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                                <p className="text-xs text-gray-500">{c.label}</p>
                                <p className={`font-bold ${getScoreColor(review[c.key])}`}>{review[c.key]}/10</p>
                              </div>
                            ))}
                          </div>
                          {review.salary_recommendation && (
                            <p className="text-sm mt-3">
                              <span className="text-gray-500">Recommendation:</span>{' '}
                              <span className="font-medium text-green-600">{review.salary_recommendation}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`text-2xl font-bold ${getScoreColor(review.average_score)}`}>
                            {review.average_score}
                          </span>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedReview(review);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const emp = employees.find(e => e.id === review.employee_id);
                                if (emp) openReviewDialog(emp, review);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Performance Review' : 'New Performance Review'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && `Reviewing: ${selectedEmployee.name || selectedEmployee.username}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="space-y-6 mt-4">
            {/* Review Period */}
            <div>
              <Label>Review Period *</Label>
              <Input
                value={formData.review_period}
                onChange={(e) => setFormData({ ...formData, review_period: e.target.value })}
                placeholder="e.g., January 2025, Q1 2025"
                required
                className="mt-1"
              />
            </div>

            {/* Criteria Sliders */}
            <div className="space-y-6">
              {criteria.map((c) => (
                <div key={c.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <c.icon className="h-5 w-5 text-green-500" />
                      <Label>{c.label}</Label>
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(formData[c.key])}`}>
                      {formData[c.key]}/10
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{c.description}</p>
                  <Slider
                    value={[formData[c.key]]}
                    onValueChange={(value) => setFormData({ ...formData, [c.key]: value[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Poor</span>
                    <span>Average</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Score Preview */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Score</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      {(Object.keys(formData)
                        .filter(k => criteria.map(c => c.key).includes(k))
                        .reduce((sum, k) => sum + formData[k], 0) / 5).toFixed(1)}
                    </span>
                    <span className="text-gray-500">/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary Recommendation */}
            <div>
              <Label>Salary Recommendation</Label>
              <Select
                value={formData.salary_recommendation}
                onValueChange={(value) => setFormData({ ...formData, salary_recommendation: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  {salaryOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div>
              <Label>Comments / Notes</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Additional observations, areas of improvement, strengths..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : isEditing ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Review Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Performance Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedReview.employee_name}</h3>
                  <p className="text-sm text-gray-500">{selectedReview.review_period}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${getScoreColor(selectedReview.average_score)}`}>
                    {selectedReview.average_score}
                  </p>
                  <Badge className={getGradeColor(selectedReview.grade)}>{selectedReview.grade}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {criteria.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <c.icon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedReview[c.key] * 10} className="w-24 h-2" />
                      <span className={`font-bold w-8 ${getScoreColor(selectedReview[c.key])}`}>
                        {selectedReview[c.key]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedReview.salary_recommendation && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500">Salary Recommendation</p>
                  <p className="font-semibold text-green-700">{selectedReview.salary_recommendation}</p>
                </div>
              )}

              {selectedReview.comments && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Comments</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedReview.comments}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 pt-2 border-t">
                Reviewed by {selectedReview.reviewed_by} on {format(new Date(selectedReview.created_at), 'PPP')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default EmployeePerformance;
