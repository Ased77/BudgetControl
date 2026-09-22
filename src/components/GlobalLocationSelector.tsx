import React, { useEffect, useRef } from 'react';
import { LocationData } from '../types';
import { Globe, X } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { LocationCascade } from './LocationCascade';

interface GlobalLocationSelectorProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onClose: () => void;
}

/**
 * Geographic filter, presented as a modal dialog: the sidebar «تغییر» button
 * opens it over the workspace, the three cascading selects (province → county →
 * city/district) re-filter the whole system live, and the dialog stays open so
 * the operator can walk the cascade in one visit before closing it.
 */
export const GlobalLocationSelector: React.FC<GlobalLocationSelectorProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the dialog, like any other modal surface.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Outside click closes the dialog, matching the export dropdown's behavior.
  useOutsideClick(dialogRef, onClose);

  return (
    <div
      id="global-location-selector-root"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl"
    >
      <div
        ref={dialogRef}
        id="global-location-selector-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-location-selector-title"
        className="bg-white text-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div id="global-location-selector-header" className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/70 to-indigo-50/50 flex items-start justify-between gap-4 shrink-0">
          <div id="global-location-selector-header-2" className="flex items-center gap-3">
            <div id="global-location-selector-header-3" className="p-2 bg-blue-100 text-blue-600 rounded-xl border border-blue-200 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div id="global-location-selector-header-4">
              <h3 id="global-location-selector-title" className="font-extrabold text-sm text-slate-900">
                فیلتر جغرافیایی فعال
              </h3>
              <p id="global-location-selector-header-5" className="text-[10px] text-slate-500 mt-0.5">
                کنترل یکپارچه کل سامانه — استان، شهرستان و شهر هدف را انتخاب کنید
              </p>
            </div>
          </div>
          <button
            id="global-location-selector-close-button"
            onClick={onClose}
            title="بستن پنجره فیلتر جغرافیایی"
            aria-label="بستن"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: cascading selectors + live badges */}
        <div id="global-location-selector-body" className="p-5 overflow-y-auto space-y-4">
          <LocationCascade
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={onSelectLocation}
            showBadges
          />
        </div>

        {/* Footer actions */}
        <div id="global-location-selector-footer" className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            id="global-location-selector-confirm-button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-xs font-bold transition-colors cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
