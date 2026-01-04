import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from './Button';

interface CustomCalendarProps {
  initialSelectedDates: { [date: string]: boolean };
  onSave: (selectedDates: string[]) => void;
  onCancel: () => void;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({ initialSelectedDates, onSave, onCancel }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Use a Set for easier toggle logic, normalize to YYYY-MM-DD strings
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    Object.keys(initialSelectedDates).forEach(d => s.add(d));
    return s;
  });

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDayOfWeek = (monthStart.getDay() + 6) % 7; // Adjust to make Monday index 0

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toggleDate = (day: number) => {
    // Construct local date string correctly
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Format manually to avoid timezone shifts: YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`; // Use YYYY-MM-DD for storage consistency with App.tsx logic

    const newSelected = new Set(selected);
    if (newSelected.has(dateStr)) {
        // If it was sick, remove it? Actually prompt implies toggle
        newSelected.delete(dateStr);
    } else {
        newSelected.add(dateStr);
    }
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSave(Array.from(selected));
  };

  const renderDays = () => {
    const days = [];
    // Padding for empty days at start
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`; // Comparison key (local time based)
      
      const isSelected = selected.has(dateStr);
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <button
          key={d}
          onClick={() => toggleDate(d)}
          className={`
            h-10 w-full rounded-lg text-sm font-medium flex items-center justify-center relative transition-all duration-200
            ${isSelected 
              ? 'bg-danger text-white shadow-lg shadow-danger/20 scale-105 z-10' 
              : 'text-text hover:bg-white/5 hover:text-white'}
            ${isToday && !isSelected ? 'border border-primary text-primary' : ''}
          `}
        >
          {d}
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white text-danger rounded-full flex items-center justify-center">
               <Check size={8} strokeWidth={4} />
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-text-muted hover:text-text" />
        </button>
        <h3 className="font-bold text-lg text-text">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronRight size={20} className="text-text-muted hover:text-text" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-xs font-bold text-text-muted uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderDays()}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
        <div className="text-xs text-text-muted">
          <span className="font-bold text-text">{selected.size}</span> days selected
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};
