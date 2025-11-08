import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <SettingsIcon className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">This page will contain application configuration options.</p>
      </div>
    </div>
  );
};

export default Settings;
