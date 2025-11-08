import React from 'react';
import { Lightbulb } from 'lucide-react';

const Recommendations = () => {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lightbulb className="w-10 h-10 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Azure Advisor Recommendations</h2>
        <p className="text-gray-600">This page will display Azure Advisor recommendations for optimization.</p>
      </div>
    </div>
  );
};

export default Recommendations;
