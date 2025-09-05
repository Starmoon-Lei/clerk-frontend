import React from 'react';
import { AlertTriangle, Shield, Wrench } from 'lucide-react';
import { ToolApprovalRequest } from '../../hooks/useResponseChat';

interface AuthorizationModalProps {
  request: ToolApprovalRequest | null;
  onApprove: () => void;
  onDeny: () => void;
}

export function AuthorizationModal({ request, onApprove, onDeny }: AuthorizationModalProps) {
  if (!request) return null;

  const formatArguments = (args: Record<string, unknown>) => {
    return Object.entries(args).map(([key, value]) => (
      <div key={key} className="flex justify-between items-start gap-4 mb-2">
        <span className="font-medium text-sm text-gray-600 dark:text-gray-400">{key}:</span>
        <span className="text-sm text-right flex-1 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </span>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Tool Authorization Required
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                <Wrench className="w-3 h-3" />
                {request.tool}
              </span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              The AI wants to execute a tool that requires your permission.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
              Review Before Approving
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This tool may access external services or modify data. Please review the parameters below.
            </p>
          </div>
        </div>

        {/* Tool Details */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tool Details</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tool Name</label>
              <p className="mt-1 text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
                {request.tool}
              </p>
            </div>

            {request.description && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                <p className="mt-1 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
                  {request.description}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Parameters</label>
              <div className="mt-2 max-h-40 overflow-y-auto">
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
                  {Object.keys(request.args).length > 0 ? (
                    formatArguments(request.args)
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No parameters</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button 
            onClick={onDeny} 
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Deny Access
          </button>
          <button 
            onClick={onApprove} 
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
}