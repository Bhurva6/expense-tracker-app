'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import { Dialog } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  employees: string[];
  createdAt: any;
  createdBy: string;
}

export default function ProjectManagement() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    employees: [] as string[],
  });

  // Fetch projects and users
  useEffect(() => {
    if (!user) return;
    fetchProjects();
    fetchAllUsers();
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'projects'),
        where('createdBy', '==', user?.uid)
      );
      const snapshot = await getDocs(q);
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || 'Error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
      }));
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        employees: formData.employees,
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);

      // Notify newly added employees
      if (formData.employees.length > 0) {
        await notifyEmployees(formData.employees, formData.name, 'added');
      }

      setProjects([...projects, { id: docRef.id, ...projectData } as Project]);
      resetForm();
      setShowCreateModal(false);
      alert('Project created successfully!');
    } catch (err: any) {
      alert('Error creating project: ' + err.message);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !formData.name || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await updateDoc(projectRef, {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        employees: formData.employees,
      });

      // Notify newly added employees
      const newEmployees = formData.employees.filter(
        emp => !selectedProject.employees.includes(emp)
      );
      if (newEmployees.length > 0) {
        await notifyEmployees(newEmployees, formData.name, 'added');
      }

      setProjects(projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, ...formData }
          : p
      ));
      resetForm();
      setShowEditModal(false);
      alert('Project updated successfully!');
    } catch (err: any) {
      alert('Error updating project: ' + err.message);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'projects', projectId));
      setProjects(projects.filter(p => p.id !== projectId));
      alert('Project deleted successfully!');
    } catch (err: any) {
      alert('Error deleting project: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const notifyEmployees = async (employeeIds: string[], projectName: string, action: string) => {
    try {
      // Create notifications in a notifications collection
      for (const empId of employeeIds) {
        await addDoc(collection(db, 'notifications'), {
          userId: empId,
          type: 'project_assignment',
          projectName: projectName,
          message: `You have been ${action} to project: ${projectName}`,
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (err) {
      console.error('Error notifying employees:', err);
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      employees: project.employees,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      employees: [],
    });
    setSelectedProject(null);
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.includes(employeeId)
        ? prev.employees.filter(id => id !== employeeId)
        : [...prev.employees, employeeId],
    }));
  };

  if (loading) return <div className="p-4">Loading projects...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
          Project Management
        </h1>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          style={{ background: 'var(--primary)', color: 'var(--surface)' }}
        >
          + Create Project
        </Button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No projects created yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => openEditModal(project)}
              className="p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--primary)' }}>
                {project.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{project.description}</p>
              <div className="space-y-1 text-sm mb-3">
                <p><strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
                <p><strong>End:</strong> {new Date(project.endDate).toLocaleDateString()}</p>
                <p><strong>Employees:</strong> {project.employees.length}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                  disabled={deleting}
                  style={{ background: '#ef4444', color: 'white', flex: 1 }}
                  className="text-sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-2xl w-full mx-4 z-10 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-2xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
              Create New Project
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description"
                  className="w-full p-2 border rounded"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Add Employees</label>
                <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto"
                  style={{ background: 'var(--accent-light)', borderColor: 'var(--muted)' }}>
                  {allUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No users available</p>
                  ) : (
                    allUsers.map(user => (
                      <label key={user.uid} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.employees.includes(user.uid)}
                          onChange={() => toggleEmployee(user.uid)}
                        />
                        <span className="text-sm">{user.displayName || user.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid var(--muted)', flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                style={{ background: 'var(--primary)', color: 'var(--surface)', flex: 1 }}
              >
                Create Project
              </Button>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-2xl w-full mx-4 z-10 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-2xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
              Edit Project
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description"
                  className="w-full p-2 border rounded"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Employees ({formData.employees.length})</label>
                <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto"
                  style={{ background: 'var(--accent-light)', borderColor: 'var(--muted)' }}>
                  {allUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No users available</p>
                  ) : (
                    allUsers.map(user => (
                      <label key={user.uid} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.employees.includes(user.uid)}
                          onChange={() => toggleEmployee(user.uid)}
                        />
                        <span className="text-sm">{user.displayName || user.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid var(--muted)', flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProject}
                style={{ background: 'var(--primary)', color: 'var(--surface)', flex: 1 }}
              >
                Update Project
              </Button>
            </div>
          </Card>
        </Dialog>
      )}
    </div>
  );
}
