"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ExtractedField {
  key: string;
  value: unknown;
  confidence: number;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'array' | 'object' | 'textarea';
  required: boolean;
  validated: boolean;
  errors?: string[];
  warnings?: string[];
  originalValue?: unknown;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DocumentData {
  fileName: string;
  type: string;
  pages: number;
  confidence: number;
  status: string;
  metadata: {
    processingTime: number;
    modelUsed: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
}

export interface DualPanelViewerProps {
  documentData: DocumentData;
  extractedFields: ExtractedField[];
  lineItems?: LineItem[];
  onSave: (fields: ExtractedField[], lineItems: LineItem[]) => Promise<void>;
  onExport: (format: string) => void;
  onValidate?: (fields: ExtractedField[]) => Promise<ValidationResult>;
  readOnly?: boolean;
  className?: string;
}

type TabType = 'fields' | 'lineItems' | 'validation';

export function DualPanelViewer({
  documentData,
  extractedFields: initialFields,
  lineItems: initialLineItems = [],
  onSave,
  onExport,
  onValidate,
  readOnly = false,
  className
}: DualPanelViewerProps) {
  // State management
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>(initialFields);
  const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);
  const [activeTab, setActiveTab] = useState<TabType>('fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHighlights, setShowHighlights] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editHistory, setEditHistory] = useState<{ field: string; oldValue: unknown; newValue: unknown; action: string; }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [panelSizes, setPanelSizes] = useState({ left: 50, right: 50 });
  const [isResizing, setIsResizing] = useState(false);

  // Refs
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Page navigation
  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    setCurrentPage(prev => {
      if (direction === 'prev') return Math.max(1, prev - 1);
      return Math.min(documentData.pages, prev + 1);
    });
  }, [documentData.pages]);

  // Field updates
  const updateField = useCallback((fieldKey: string, newValue: unknown) => {
    if (readOnly) return;

    setExtractedFields(prev => {
      const updated = prev.map(field => {
        if (field.key === fieldKey) {
          const history = {
            field: fieldKey,
            oldValue: field.value,
            newValue,
            action: 'edit'
          };

          setEditHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), history]);
          setHistoryIndex(prev => prev + 1);
          setHasUnsavedChanges(true);

          return {
            ...field,
            value: newValue,
            validated: false
          };
        }
        return field;
      });
      return updated;
    });
  }, [readOnly, historyIndex]);

  const addLineItem = useCallback(() => {
    if (readOnly) return;

    const newItem: LineItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };

    setLineItems(prev => [...prev, newItem]);
    setHasUnsavedChanges(true);
  }, [readOnly]);

  const updateLineItem = useCallback((itemId: string, field: string, value: unknown) => {
    if (readOnly) return;

    setLineItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }

        return updated;
      }
      return item;
    }));
    setHasUnsavedChanges(true);
  }, [readOnly]);

  const deleteLineItem = useCallback((itemId: string) => {
    if (readOnly) return;

    setLineItems(prev => prev.filter(item => item.id !== itemId));
    setHasUnsavedChanges(true);
  }, [readOnly]);

  // History management
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const historyItem = editHistory[historyIndex];
      updateField(historyItem.field, historyItem.oldValue);
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex, editHistory, updateField]);

  const redo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const historyItem = editHistory[historyIndex + 1];
      updateField(historyItem.field, historyItem.newValue);
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, editHistory, updateField]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (readOnly || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(extractedFields, lineItems);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [extractedFields, lineItems, onSave, readOnly, isSaving]);

  // Validation handler
  const handleValidate = useCallback(async () => {
    if (onValidate) {
      try {
        const result = await onValidate(extractedFields);
        setValidationResult(result);

        setExtractedFields(prev => prev.map(field => ({
          ...field,
          validated: true,
          errors: result.errors.filter(error => error.includes(field.key)),
          warnings: result.warnings.filter(warning => warning.includes(field.key))
        })));
      } catch (error) {
        console.error('Validation failed:', error);
      }
    }
  }, [onValidate, extractedFields]);

  // Field highlighting
  const highlightField = useCallback((fieldKey: string) => {
    setSelectedField(fieldKey);

    const field = extractedFields.find(f => f.key === fieldKey);
    if (field?.coordinates && documentViewerRef.current) {
      console.log('Highlighting field:', fieldKey, field.coordinates);
    }
  }, [extractedFields]);

  // Panel resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const containerWidth = window.innerWidth;
      const newLeftWidth = (e.clientX / containerWidth) * 100;
      setPanelSizes({
        left: Math.max(20, Math.min(80, newLeftWidth)),
        right: Math.max(20, Math.min(80, 100 - newLeftWidth))
      });
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Auto-validation on field changes
  useEffect(() => {
    if (hasUnsavedChanges && onValidate) {
      const debounceTimer = setTimeout(() => {
        handleValidate();
      }, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [hasUnsavedChanges, handleValidate, onValidate]);

  // Render field editor
  const renderFieldEditor = (field: ExtractedField) => {
    const isSelected = selectedField === field.key;
    const hasErrors = field.errors && field.errors.length > 0;
    const hasWarnings = field.warnings && field.warnings.length > 0;

    return (
      <div
        key={field.key}
        className={cn(
          'p-4 border rounded-lg transition-all duration-200',
          isSelected && 'ring-2 ring-blue-500 bg-blue-50',
          hasErrors && 'border-red-300',
          hasWarnings && 'border-yellow-300',
          'hover:bg-gray-50 cursor-pointer'
        )}
        onClick={() => highlightField(field.key)}
      >
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium capitalize">
            {field.key.replace(/_/g, ' ')}
          </Label>
          <div className="flex items-center gap-2">
            <Badge variant={field.required ? 'destructive' : 'secondary'} className="text-xs">
              {field.required ? 'Required' : 'Optional'}
            </Badge>
            <Badge
              variant={field.confidence > 0.8 ? 'default' : field.confidence > 0.6 ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {Math.round(field.confidence * 100)}%
            </Badge>
          </div>
        </div>

        {field.type === 'textarea' || (typeof field.value === 'string' && field.value.length > 50) ? (
          <Textarea
            value={String(field.value || '')}
            onChange={(e) => updateField(field.key, e.target.value)}
            disabled={readOnly}
            className={cn(
              hasErrors && 'border-red-300 focus:border-red-500',
              hasWarnings && 'border-yellow-300 focus:border-yellow-500'
            )}
            rows={3}
          />
        ) : (
          <Input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={String(field.value || '')}
            onChange={(e) => updateField(field.key, e.target.value)}
            disabled={readOnly}
            className={cn(
              hasErrors && 'border-red-300 focus:border-red-500',
              hasWarnings && 'border-yellow-300 focus:border-yellow-500'
            )}
          />
        )}

        {(hasErrors || hasWarnings) && (
          <div className="mt-2 space-y-1">
            {field.errors?.map((error, index) => (
              <div key={index} className="flex items-center gap-2 text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {error}
              </div>
            ))}
            {field.warnings?.map((warning, index) => (
              <div key={index} className="flex items-center gap-2 text-yellow-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render line items editor
  const renderLineItemsEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Line Items</h3>
        {!readOnly && (
          <Button onClick={addLineItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {lineItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No line items found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Item {index + 1}</span>
                {!readOnly && (
                  <Button
                    onClick={() => deleteLineItem(item.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    disabled={readOnly}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.total}
                    disabled
                    className="text-sm bg-gray-50"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex h-screen bg-gray-50', className)}>
      {/* Document Viewer Panel */}
      <div
        className="relative bg-white border-r"
        style={{ width: `${panelSizes.left}%` }}
      >
        {/* Document Viewer Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <h2 className="font-semibold text-sm">{documentData.fileName}</h2>
              <p className="text-xs text-gray-500">
                {documentData.type} • {documentData.pages} pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowHighlights(!showHighlights)}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              {showHighlights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button onClick={handleZoomOut} size="sm" variant="ghost">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono">{zoomLevel}%</span>
            <Button onClick={handleZoomIn} size="sm" variant="ghost">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button onClick={handleRotate} size="sm" variant="ghost">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer Content */}
        <div className="relative flex-1 overflow-auto" ref={documentViewerRef}>
          <div
            className="flex items-center justify-center min-h-full p-4"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            {/* Document Image/PDF Viewer */}
            <div className="relative bg-white shadow-lg border">
              <div className="w-[600px] h-[800px] bg-gray-100 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Document Preview</p>
                  <p className="text-sm">Page {currentPage} of {documentData.pages}</p>
                </div>
              </div>

              {/* Field highlights overlay */}
              {showHighlights && extractedFields.map(field => {
                if (!field.coordinates || field.coordinates.page !== currentPage) return null;

                return (
                  <div
                    key={field.key}
                    className={cn(
                      'absolute border-2 transition-all duration-200',
                      selectedField === field.key
                        ? 'border-blue-500 bg-blue-200 bg-opacity-30'
                        : 'border-yellow-400 bg-yellow-200 bg-opacity-20',
                      'hover:bg-opacity-40 cursor-pointer'
                    )}
                    style={{
                      left: `${field.coordinates.x}%`,
                      top: `${field.coordinates.y}%`,
                      width: `${field.coordinates.width}%`,
                      height: `${field.coordinates.height}%`
                    }}
                    onClick={() => highlightField(field.key)}
                    title={`${field.key}: ${field.value}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Document Navigation */}
        {documentData.pages > 1 && (
          <div className="flex items-center justify-center gap-4 p-3 border-t bg-white">
            <Button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono">
              {currentPage} / {documentData.pages}
            </span>
            <Button
              onClick={() => handlePageChange('next')}
              disabled={currentPage === documentData.pages}
              size="sm"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Data Editor Panel */}
      <div
        className="flex flex-col bg-white"
        style={{ width: `${panelSizes.right}%` }}
      >
        {/* Data Editor Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Extracted Data</h2>
            <Badge variant={documentData.confidence > 0.8 ? 'default' : 'secondary'}>
              {Math.round(documentData.confidence * 100)}% confidence
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <Button
                  onClick={undo}
                  disabled={historyIndex < 0}
                  size="sm"
                  variant="ghost"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  onClick={redo}
                  disabled={historyIndex >= editHistory.length - 1}
                  size="sm"
                  variant="ghost"
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  size="sm"
                  variant="default"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
            <Button
              onClick={() => onExport('json')}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[{id: 'fields', label: 'Fields'}, {id: 'lineItems', label: 'Line Items'}, {id: 'validation', label: 'Validation'}].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
              {tab.id === 'lineItems' && lineItems.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {lineItems.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {activeTab === 'fields' && (
              <div className="space-y-4">
                {extractedFields.map(renderFieldEditor)}
              </div>
            )}

            {activeTab === 'lineItems' && renderLineItemsEditor()}

            {activeTab === 'validation' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Validation Results</h3>
                  <Button onClick={handleValidate} size="sm" variant="outline">
                    Re-validate
                  </Button>
                </div>

                {validationResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={validationResult.isValid ? 'text-green-600' : 'text-red-600'}>
                        {validationResult.isValid ? 'All validations passed' : 'Validation issues found'}
                      </span>
                      <Badge variant="secondary">
                        Score: {Math.round(validationResult.score * 100)}%
                      </Badge>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Errors:</p>
                            {validationResult.errors.map((error, index) => (
                              <p key={index} className="text-sm">• {error}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Warnings:</p>
                            {validationResult.warnings.map((warning, index) => (
                              <p key={index} className="text-sm">• {warning}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click &quot;Re-validate&quot; to check data quality</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Status Bar */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Status: {documentData.status}</span>
              <span>Processing: {documentData.metadata.processingTime}ms</span>
              {hasUnsavedChanges && (
                <span className="text-orange-600 font-medium">• Unsaved changes</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span>Model: {documentData.metadata.modelUsed}</span>
              <span>Fields: {extractedFields.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DualPanelViewer;