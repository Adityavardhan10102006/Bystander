"use client";

import { useState } from "react";
import { Shield, Bell, HardDrive, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [retentionHours, setRetentionHours] = useState(24);
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your workspace configuration and data retention policies.
          </p>
        </header>

        <div className="space-y-6">
          {/* Data Retention */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <HardDrive size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Data Retention & Privacy</h2>
                  <p className="text-sm text-slate-500">Configure how long raw message data is kept.</p>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Purge interval (Hours)</label>
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">Read-only</span>
                </div>
                <input
                  type="number"
                  value={retentionHours}
                  readOnly
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-not-allowed opacity-70"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Raw message text is purged automatically when threads are closed or archived. Derived metrics (tension score, sentiment) are retained for the dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Notifications & Nudges</h2>
                  <p className="text-sm text-slate-500">Manage who receives alerts and suggestions.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyUsers}
                    onChange={(e) => setNotifyUsers(e.target.checked)}
                    className="mt-1 w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Private User Nudges</div>
                    <div className="text-sm text-slate-500">Send private DM suggestions to users involved in high-tension threads.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyAdmins}
                    onChange={(e) => setNotifyAdmins(e.target.checked)}
                    className="mt-1 w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Team Lead Alerts</div>
                    <div className="text-sm text-slate-500">Notify team leads when a thread reaches sustained critical tension.</div>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Connected Platforms */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Connected Workspaces</h2>
                  <p className="text-sm text-slate-500">Platforms actively monitored by Bystander.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#5865F2] text-white rounded-xl flex items-center justify-center font-bold text-lg">
                    D
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Discord</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} className="text-green-500" /> Active • 14 channels
                    </div>
                  </div>
                </div>
                <button className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg">
                  Disconnect
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
