'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Key,
  Shield,
  Lock,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  RefreshCw,
  Save,
  Camera,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell';
import Image from 'next/image';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  oauthProvider: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  masterKeySalt: string;
  billingAccount?: {
    tier: string;
    monthlySpendDisplay: string;
    totalSpendDisplay: string;
  } | null;
}

interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export default function AccountPage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/scca/account');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfile(json.user);
      setSessions(json.sessions);
      setNameInput(json.user.name || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateName = async () => {
    if (!nameInput.trim() || nameInput === profile?.name) {
      setIsEditingName(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/scca/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      setProfile((prev) => prev ? { ...prev, name: json.name } : null);
      await updateSession();
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setIsEditingName(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/scca/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      setSuccess('Password updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/scca/account/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccess('Session revoked');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/scca/account', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      // Redirect to home after deletion
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageShell>
        <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--neon-cyan)', opacity: 0.5 }} />
        </div>
      </DashboardPageShell>
    );
  }

  const isOAuthUser = profile?.oauthProvider !== null;

  return (
    <DashboardPageShell>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Account Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your profile, security settings, and active sessions
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-lg border flex items-center gap-3"
              style={{ 
                borderColor: 'color-mix(in srgb, var(--neon-red) 30%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--neon-red) 5%, transparent)'
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--neon-red)' }} />
              <span className="text-sm" style={{ color: 'var(--neon-red)' }}>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-lg border flex items-center gap-3"
              style={{ 
                borderColor: 'color-mix(in srgb, var(--neon-green) 30%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--neon-green) 5%, transparent)'
              }}
            >
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--neon-green)' }} />
              <span className="text-sm" style={{ color: 'var(--neon-green)' }}>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card p-6 mb-6"
        >
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div 
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
                  border: '2px solid color-mix(in srgb, var(--neon-cyan) 30%, transparent)'
                }}
              >
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name || 'Profile'}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                ) : (
                  <User className="w-8 h-8" style={{ color: 'var(--neon-cyan)' }} />
                )}
              </div>
              <button 
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--neon-cyan)' }}
                title="Change avatar (Gravatar)"
                onClick={() => window.open('https://gravatar.com', '_blank')}
              >
                <Camera className="w-3.5 h-3.5 text-black" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="cyber-input py-1.5 text-lg font-semibold"
                      placeholder="Your name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateName();
                        if (e.key === 'Escape') {
                          setIsEditingName(false);
                          setNameInput(profile?.name || '');
                        }
                      }}
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={saving}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: 'var(--neon-green)' }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setNameInput(profile?.name || '');
                      }}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: 'var(--neon-red)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {profile?.name || 'Unnamed User'}
                    </h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
                <Mail className="w-3.5 h-3.5" />
                {profile?.email}
                {isOAuthUser && profile && (
                  <span 
                    className="ml-2 px-2 py-0.5 rounded text-[10px]"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--neon-purple) 15%, transparent)',
                      color: 'var(--neon-purple)'
                    }}
                  >
                    {profile.oauthProvider}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                </span>
                {profile?.lastLoginAt && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Last active {new Date(profile.lastLoginAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cyber-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Security
              </h3>
            </div>

            <div className="space-y-4">
              {/* Encryption Key */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
                  <span className="text-xs font-medium text-[var(--text-primary)]">Master Key Salt</span>
                </div>
                <code className="text-[10px] font-mono text-[var(--text-secondary)] break-all">
                  {profile?.masterKeySalt}
                </code>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  This salt is used to derive your encryption keys. Never share it.
                </p>
              </div>

              {/* Password Change */}
              {!isOAuthUser && (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" style={{ color: 'var(--neon-yellow)' }} />
                    <span className="text-sm text-[var(--text-primary)]">Change Password</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">********</span>
                </button>
              )}

              {isOAuthUser && (
                <div 
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--neon-purple) 5%, transparent)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--neon-purple)' }} />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Password managed by {profile?.oauthProvider}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Active Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="cyber-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Active Sessions
                </h3>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {sessions.length} active
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ 
                    backgroundColor: sess.isCurrent 
                      ? 'color-mix(in srgb, var(--neon-green) 5%, var(--bg-secondary))' 
                      : 'var(--bg-secondary)',
                    border: sess.isCurrent 
                      ? '1px solid color-mix(in srgb, var(--neon-green) 30%, transparent)' 
                      : '1px solid transparent'
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-primary)]">
                        {sess.userAgent ? parseUserAgent(sess.userAgent) : 'Unknown Device'}
                      </span>
                      {sess.isCurrent && (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px]"
                          style={{ 
                            backgroundColor: 'color-mix(in srgb, var(--neon-green) 15%, transparent)',
                            color: 'var(--neon-green)'
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {sess.ipAddress || 'Unknown IP'} • {new Date(sess.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--neon-red)]/10"
                      style={{ color: 'var(--neon-red)' }}
                      title="Revoke session"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-4 text-[var(--text-secondary)] text-xs">
                  No active sessions found
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="cyber-card p-6 mt-6"
          style={{ borderColor: 'color-mix(in srgb, var(--neon-red) 30%, transparent)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--neon-red)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--neon-red)' }}>
              Danger Zone
            </h3>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Delete Account</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--neon-red) 15%, transparent)',
                color: 'var(--neon-red)',
                border: '1px solid color-mix(in srgb, var(--neon-red) 40%, transparent)'
              }}
            >
              Delete Account
            </button>
          </div>
        </motion.div>

        {/* Password Change Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowPasswordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="cyber-card p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Change Password
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="cyber-input"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleUpdatePassword}
                    disabled={saving}
                    className="flex-1 cyber-btn-solid text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Account Confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="cyber-card p-6 w-full max-w-md"
                style={{ borderColor: 'color-mix(in srgb, var(--neon-red) 30%, transparent)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="w-5 h-5" style={{ color: 'var(--neon-red)' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--neon-red)' }}>
                    Delete Account
                  </h3>
                </div>
                
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  This will permanently delete your account, all conversations, API keys, and billing data. 
                  This action <strong className="text-[var(--text-primary)]">cannot be undone</strong>.
                </p>

                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Type <code className="text-[var(--neon-red)]">DELETE</code> to confirm:
                  </p>
                  <input
                    type="text"
                    className="cyber-input mt-2"
                    placeholder="DELETE"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                    style={{ 
                      backgroundColor: 'var(--neon-red)',
                      color: 'white'
                    }}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Permanently Delete Account'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardPageShell>
  );
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome Browser';
  if (ua.includes('Firefox')) return 'Firefox Browser';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
  if (ua.includes('Edge')) return 'Edge Browser';
  return 'Web Browser';
}
