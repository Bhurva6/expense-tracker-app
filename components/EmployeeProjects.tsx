'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

interface ProjectNotification {
  id: string;
  projectName: string;
  message: string;
  read: boolean;
  createdAt: any;
}

interface AssignedProject {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface EmployeeProjectsProps {
  onProjectClick?: (projectId: string) => void;
}

export default function EmployeeProjects({ onProjectClick }: EmployeeProjectsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    fetchAssignedProjects();
    fetchNotifications();
  }, [user?.uid]);

  const fetchAssignedProjects = async () => {
    try {
      const q = query(
        collection(db, 'projects'),
        where('employees', 'array-contains', user?.uid)
      );
      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssignedProject[];
      setAssignedProjects(projects);
    } catch (err) {
      console.error('Error fetching assigned projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user?.uid),
        where('type', '==', 'project_assignment')
      );
      const snapshot = await getDocs(q);
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectNotification[];
      setNotifications(notifs);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Error updating notification:', err);
    }
  };

  const handleProjectClick = (projectId: string) => {
    sessionStorage.setItem('selectedProjectId', projectId);
    if (onProjectClick) {
      onProjectClick(projectId);
    } else {
      router.push('/?tab=project&projectId=' + projectId);
    }
  };

  if (loading) return null;

  return (
    <div>
      {/* Notifications */}
      {notifications.filter(n => !n.read).length > 0 && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6' }}>
          <h3 className="font-semibold mb-3" style={{ color: '#3b82f6' }}>🔔 Project Notifications</h3>
          <div className="space-y-2">
            {notifications.filter(n => !n.read).map(notif => (
              <div key={notif.id} className="flex justify-between items-start">
                <p className="text-sm">{notif.message}</p>
                <button
                  onClick={() => markNotificationAsRead(notif.id)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: '#3b82f6', color: 'white' }}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Buttons */}
      {assignedProjects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--primary)' }}>📋 My Projects</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assignedProjects.map(project => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="p-4 rounded-lg font-semibold transition-all hover:shadow-lg hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, rgba(59, 130, 246, 0.7) 100%)',
                  color: 'white',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
                title={`Click to view ${project.name} expenses`}
              >
                <span className="text-2xl mb-1">📁</span>
                <span className="text-sm" style={{ wordBreak: 'break-word' }}>{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
