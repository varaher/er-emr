import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, Activity, User, LogOut, Clock, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    completed: 0,
    discharged: 0
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      const casesData = response.data;
      setCases(casesData);
      
      // Calculate stats
      const total = casesData.length;
      const draft = casesData.filter(c => c.status === 'draft').length;
      const completed = casesData.filter(c => c.status === 'completed').length;
      const discharged = casesData.filter(c => c.status === 'discharged').length;
      
      setStats({ total, draft, completed, discharged });
    } catch (error) {
      toast.error('Failed to fetch cases');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'discharged': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">ER-EMR</h1>
              <p className="text-sm text-slate-600">Emergency Department Case Management</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                </div>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid - Control Room */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="stat-card-total">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider text-xs font-bold text-slate-500">Total Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-tight text-slate-900 font-data">{stats.total}</span>
                <Activity className="h-8 w-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-card-draft">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider text-xs font-bold text-slate-500">Draft</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-tight text-amber-600 font-data">{stats.draft}</span>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-card-completed">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider text-xs font-bold text-slate-500">Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-tight text-green-600 font-data">{stats.completed}</span>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-card-discharged">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider text-xs font-bold text-slate-500">Discharged</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-tight text-blue-600 font-data">{stats.discharged}</span>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <Button 
            onClick={() => navigate('/triage')} 
            size="lg"
            className="bg-sky-600 hover:bg-sky-700"
            data-testid="start-triage-button"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Start Triage
          </Button>
          <Button 
            onClick={() => navigate('/case/new')} 
            size="lg"
            variant="outline"
            data-testid="create-new-case-button"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Case (Skip Triage)
          </Button>
        </div>

        {/* Cases List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
            <CardDescription>All emergency department cases</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading cases...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No cases yet</p>
                <Button onClick={() => navigate('/case/new')} data-testid="create-first-case-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Case
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    data-testid={`case-item-${caseItem.id}`}
                    className="border border-slate-200 rounded-lg p-4 hover:border-sky-500 hover:shadow-sm transition-all duration-200 cursor-pointer animate-fade-in"
                    onClick={() => navigate(`/case/${caseItem.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">
                            {caseItem.patient.name}
                          </h3>
                          <Badge className={getStatusColor(caseItem.status)}>
                            {caseItem.status}
                          </Badge>
                          {caseItem.patient.mlc && (
                            <Badge variant="destructive">MLC</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Age/Sex:</span>
                            <span className="ml-2 font-medium text-slate-900">
                              {caseItem.patient.age} / {caseItem.patient.sex}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">UHID:</span>
                            <span className="ml-2 font-medium text-slate-900 font-data">
                              {caseItem.patient.uhid || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Complaint:</span>
                            <span className="ml-2 font-medium text-slate-900">
                              {caseItem.presenting_complaint.text.substring(0, 30)}...
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Arrival:</span>
                            <span className="ml-2 font-medium text-slate-900 font-data text-xs">
                              {formatDateTime(caseItem.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/discharge/${caseItem.id}`);
                        }}
                        data-testid={`view-discharge-${caseItem.id}`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Discharge Summary
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}